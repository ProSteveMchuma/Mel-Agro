import { FieldPath, FieldValue, type DocumentReference, type DocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { CommunicationTemplates } from "@/lib/communication-templates";
import { withActionUrls } from "@/lib/order-access";
import { notifyCustomer } from "@/lib/customer-notifications";
import {
  awardsLoyaltyOnStatus,
  fulfillmentMethodOf,
  isActiveFulfillmentStatus,
  isPickupOrder,
  nextFulfillmentStatus,
} from "@/lib/pickup";
import { pointsEarnedForOrderTotal } from "@/lib/loyalty";

const PAGE_SIZE = 20;
type Cursor = { date: string; id: string };
const encode = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString("base64url");
const decode = (value: string | null): Cursor | null => {
  try {
    const parsed = JSON.parse(Buffer.from(value || "", "base64url").toString());
    return parsed && typeof parsed.id === "string" && typeof parsed.date === "string" ? parsed : null;
  } catch {
    return null;
  }
};

const ACTIVE_STATUSES = ["Processing", "Shipped", "Ready for Collection"];

export async function GET(request: Request) {
  const actor = await requirePermission(request, "orders.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const search = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
  const statusParam = params.get("status") || "";
  const status = ACTIVE_STATUSES.includes(statusParam) ? statusParam : null;
  const methodParam = params.get("method") || "all";
  const method = ["pickup", "delivery", "all"].includes(methodParam) ? methodParam : "all";
  let cursor = decode(params.get("cursor"));
  const orders: Array<{ id: string; [key: string]: unknown }> = [];
  let scanned = 0;
  let exhausted = false;

  while (orders.length <= PAGE_SIZE && scanned < 600 && !exhausted) {
    let query = adminDb.collection("orders").orderBy("date", "asc").orderBy(FieldPath.documentId(), "asc").limit(75);
    if (cursor) query = query.startAfter(cursor.date, cursor.id);
    const snapshot = await query.get();
    if (snapshot.empty) { exhausted = true; break; }
    scanned += snapshot.size;
    for (const document of snapshot.docs) {
      const data = document.data();
      const date = String(data.date || "");
      cursor = { date, id: document.id };
      if (data.paymentStatus !== "Paid" || !isActiveFulfillmentStatus(String(data.status || ""))) continue;
      if (status && data.status !== status) continue;
      const orderMethod = fulfillmentMethodOf(data as any);
      if (method !== "all" && orderMethod !== method) continue;
      if (search) {
        const haystack = [
          document.id,
          data.userName,
          data.userEmail,
          data.phone,
          data.shippingAddress?.county,
          data.shippingMethod,
          orderMethod,
        ].map((value) => String(value || "").toLowerCase()).join(" ");
        if (!haystack.includes(search)) continue;
      }
      orders.push({ id: document.id, ...data, fulfillmentMethod: orderMethod });
      if (orders.length > PAGE_SIZE) break;
    }
    exhausted = snapshot.size < 75;
  }

  const page = orders.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  const [processing, shipped, readyPickup, stockAlerts] = await Promise.all([
    adminDb.collection("orders").where("status", "==", "Processing").count().get(),
    adminDb.collection("orders").where("status", "==", "Shipped").count().get(),
    adminDb.collection("orders").where("status", "==", "Ready for Collection").count().get(),
    adminDb.collection("products").where("stockQuantity", "==", 0).count().get(),
  ]);

  return NextResponse.json({
    success: true,
    orders: page,
    nextCursor: last && (orders.length > PAGE_SIZE || !exhausted)
      ? encode({ date: String(last.date || ""), id: last.id })
      : null,
    stats: {
      processing: processing.data().count,
      shipped: shipped.data().count,
      readyPickup: readyPickup.data().count,
      stockAlerts: stockAlerts.data().count,
    },
    searchLimited: Boolean(search && scanned >= 600),
  });
}

const fulfillmentStatuses = z.enum([
  "Shipped",
  "Delivered",
  "Ready for Collection",
  "Collected",
]);

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    orderId: z.string().min(1).max(200),
    status: fulfillmentStatuses,
    tracking: z.object({
      carrier: z.string().trim().min(1).max(80),
      trackingNumber: z.string().trim().min(1).max(120),
    }).optional(),
  }),
  z.object({
    action: z.literal("note"),
    orderId: z.string().min(1).max(200),
    note: z.string().trim().min(1).max(1000),
  }),
]);

export async function POST(request: Request) {
  const actor = await requirePermission(request, "orders.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid fulfillment update." }, { status: 400 });
  const input = parsed.data;

  try {
    const outcome = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection("orders").doc(input.orderId);
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) throw new Error("ORDER_NOT_FOUND");
      const order = orderSnapshot.data() || {};
      const now = new Date().toISOString();

      if (input.action === "note") {
        const entry = { date: now, note: input.note, author: actor.email || actor.uid };
        transaction.update(orderRef, {
          internalNotes: input.note,
          internalHistory: FieldValue.arrayUnion(entry),
          updatedAt: now,
        });
        transaction.set(adminDb.collection("adminAuditLog").doc(), {
          action: "fulfillment_note_added",
          actorId: actor.uid,
          actorEmail: actor.email || null,
          targetId: input.orderId,
          after: { note: input.note },
          createdAt: now,
        });
        return { kind: "note" as const };
      }

      if (order.paymentStatus !== "Paid") throw new Error("PAYMENT_REQUIRED");

      const expectedNext = nextFulfillmentStatus(order as any);
      // Allow explicit next OR legacy pickup that used Shipped → Collected
      const allowed =
        expectedNext === input.status
        || (isPickupOrder(order as any) && order.status === "Shipped" && input.status === "Collected")
        || (!isPickupOrder(order as any) && order.status === "Processing" && input.status === "Shipped")
        || (!isPickupOrder(order as any) && order.status === "Shipped" && input.status === "Delivered")
        || (isPickupOrder(order as any) && order.status === "Processing" && input.status === "Ready for Collection")
        || (isPickupOrder(order as any) && order.status === "Ready for Collection" && input.status === "Collected");

      if (!allowed) throw new Error("INVALID_TRANSITION");

      if (input.status === "Shipped" && !isPickupOrder(order as any)) {
        if (!input.tracking?.carrier || !input.tracking?.trackingNumber) {
          throw new Error("TRACKING_REQUIRED");
        }
      }

      let userRef: DocumentReference | null = null;
      let userSnapshot: DocumentSnapshot | null = null;
      if (awardsLoyaltyOnStatus(input.status) && !order.loyaltyAwarded && order.userId) {
        userRef = adminDb.collection("users").doc(String(order.userId));
        userSnapshot = await transaction.get(userRef);
      }

      const update: Record<string, unknown> = {
        status: input.status,
        updatedAt: now,
        statusHistory: FieldValue.arrayUnion({
          status: input.status,
          at: now,
          by: actor.email || actor.uid,
        }),
      };

      if (input.status === "Shipped") {
        update.shippedAt = now;
        if (input.tracking) update.tracking = input.tracking;
      }
      if (input.status === "Ready for Collection") update.readyForCollectionAt = now;
      if (input.status === "Delivered") update.deliveredAt = now;
      if (input.status === "Collected") update.collectedAt = now;

      if (awardsLoyaltyOnStatus(input.status) && !order.loyaltyAwarded && userRef && userSnapshot?.exists) {
        const points = pointsEarnedForOrderTotal(Number(order.total || 0));
        transaction.update(userRef, { loyaltyPoints: FieldValue.increment(points) });
        update.loyaltyAwarded = true;
        update.loyaltyAwardedAmount = points;
        update.loyaltyAwardedAt = now;
      }

      transaction.update(orderRef, update);
      transaction.set(adminDb.collection("adminAuditLog").doc(), {
        action: "fulfillment_status_changed",
        actorId: actor.uid,
        actorEmail: actor.email || null,
        targetId: input.orderId,
        before: { status: order.status },
        after: { status: input.status, tracking: input.tracking || null },
        createdAt: now,
      });

      return {
        kind: "status" as const,
        order: { id: input.orderId, ...order, status: input.status, tracking: input.tracking || order.tracking } as Record<string, unknown>,
        status: input.status,
      };
    });

    if (outcome.kind === "status") {
      try {
        const tpl = CommunicationTemplates.getStatusUpdate(await withActionUrls(outcome.order as any), outcome.status);
        await notifyCustomer({
          userId: String(outcome.order.userId || ""),
          phone: String(outcome.order.mpesaPhoneNumber || outcome.order.phone || ""),
          message: tpl.smsBody,
          orderId: input.orderId,
        });
      } catch (error) {
        console.warn("Fulfillment customer notification failed (non-fatal):", error);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    if (code === "INVALID_TRANSITION") return NextResponse.json({ success: false, message: "The order changed elsewhere. Refresh before continuing." }, { status: 409 });
    if (code === "PAYMENT_REQUIRED") return NextResponse.json({ success: false, message: "Only paid orders can enter fulfillment." }, { status: 409 });
    if (code === "TRACKING_REQUIRED") return NextResponse.json({ success: false, message: "Enter carrier and tracking number before dispatch." }, { status: 400 });
    throw error;
  }
}
