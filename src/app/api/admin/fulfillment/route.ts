import { FieldPath, FieldValue, type DocumentReference, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
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
  isPickupOrder,
  nextFulfillmentStatus,
} from "@/lib/pickup";
import { pointsEarnedForOrderTotal } from "@/lib/loyalty";
import { lineBalances, outstandingQuantity, partialBlocksCompletion, partialSmsSummary } from "@/lib/order-admin";
import { orderPhoneKey } from "@/lib/phone-match";
import { canPackOrder, cashSettlementOnFinish } from "@/lib/commerce-ops";
import { notifyCustomerPaymentReceived } from "@/lib/payment-notifications";

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
      if (!canPackOrder(data as any)) continue;
      if (status && data.status !== status) continue;
      const orderMethod = fulfillmentMethodOf(data as any);
      if (method !== "all" && orderMethod !== method) continue;
      if (search) {
        const haystack = [
          document.id,
          data.userName,
          data.userEmail,
          data.phone,
          data.phoneKey,
          data.shippingAddress?.county,
          data.shippingMethod,
          orderMethod,
        ].map((value) => String(value || "").toLowerCase()).join(" ");
        const key = orderPhoneKey(search);
        const storedKey = String(data.phoneKey || orderPhoneKey(String(data.phone || "")));
        if (!haystack.includes(search) && !(key && storedKey === key)) continue;
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
  z.object({
    action: z.literal("partial"),
    orderId: z.string().min(1).max(200),
    lines: z.array(z.object({
      productId: z.string().trim().min(1).max(200),
      variantId: z.string().trim().max(120).optional(),
      quantity: z.number().int().positive().max(10000),
    })).min(1).max(40),
    tracking: z.object({
      carrier: z.string().trim().min(1).max(80),
      trackingNumber: z.string().trim().min(1).max(120),
    }).optional(),
  }),
  z.object({
    action: z.literal("shortfall"),
    orderId: z.string().min(1).max(200),
  }),
]);

function numberOrZero(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

async function loyaltyReader(transaction: Transaction, order: Record<string, any>) {
  if (order.loyaltyAwarded || !order.userId) return { userRef: null as DocumentReference | null, userSnapshot: null as DocumentSnapshot | null };
  const userRef = adminDb.collection("users").doc(String(order.userId));
  return { userRef, userSnapshot: await transaction.get(userRef) };
}

function writeRestoredStock(
  transaction: Transaction,
  snaps: DocumentSnapshot[],
  lines: Array<{ productId: string; variantId?: string; quantity: number; name?: string }>,
  orderId: string,
  actorName: string,
  now: string,
) {
  for (const snapshot of snaps) {
    if (!snapshot.exists) continue;
    const product: any = snapshot.data();
    const productLines = lines.filter((line) => line.productId === snapshot.id);
    const quantity = productLines.reduce((sum, line) => sum + line.quantity, 0);
    if (quantity <= 0) continue;
    const previousStock = numberOrZero(product.stockQuantity);
    const nextStock = previousStock + quantity;
    const variants = Array.isArray(product.variants) ? product.variants.map((variant: any) => {
      const restored = productLines
        .filter((line) => String(line.variantId || "") === String(variant.id))
        .reduce((sum, line) => sum + line.quantity, 0);
      return restored > 0
        ? { ...variant, stockQuantity: numberOrZero(variant.stockQuantity ?? variant.stock) + restored }
        : variant;
    }) : undefined;
    transaction.update(snapshot.ref, {
      stockQuantity: nextStock,
      inStock: nextStock > 0,
      ...(variants ? { variants } : {}),
    });
    transaction.set(adminDb.collection("inventory_history").doc(), {
      productId: snapshot.id,
      productName: String(product.name || productLines[0]?.name || "Product"),
      previousStock,
      newStock: nextStock,
      change: quantity,
      updatedBy: `Staff shortfall (${actorName})`,
      updatedAt: now,
      orderId,
    });
  }
}

function recordCashIfDue(
  transaction: Transaction,
  orderRef: DocumentReference,
  order: Record<string, any>,
  actor: { uid: string; email?: string | null },
  now: string,
  nextStatus: string,
  update: Record<string, unknown>,
) {
  if (!cashSettlementOnFinish(order, nextStatus)) return false;
  const reference = actor.email || "cash-on-delivery";
  const amount = Number(order.total) || 0;
  update.paymentStatus = "Paid";
  update.paidAt = now;
  update.amountPaid = amount;
  update.transactionId = reference;
  update.stockReservationStatus = "committed";
  transaction.set(adminDb.collection("transactions").doc(), {
    orderId: orderRef.id,
    amount,
    reference,
    method: "Cash on Delivery",
    date: now,
    status: "Success",
    recordedBy: actor.uid,
    recordedAt: now,
  });
  return true;
}

function writeFinishedOrder(
  transaction: Transaction,
  args: {
    orderRef: DocumentReference;
    order: Record<string, any>;
    actor: { uid: string; email?: string | null };
    now: string;
    pickup: boolean;
    deliveries: unknown[];
    userRef: DocumentReference | null;
    userSnapshot: DocumentSnapshot | null;
  },
) {
  const status = args.pickup ? "Collected" : "Delivered";
  const update: Record<string, unknown> = {
    status,
    deliveries: args.deliveries,
    updatedAt: args.now,
    statusHistory: FieldValue.arrayUnion({ status, at: args.now, by: args.actor.email || args.actor.uid }),
    ...(args.pickup ? { collectedAt: args.now } : { deliveredAt: args.now }),
  };
  const cashRecorded = recordCashIfDue(transaction, args.orderRef, args.order, args.actor, args.now, status, update);
  if (!args.order.loyaltyAwarded && args.userRef && args.userSnapshot?.exists) {
    const points = pointsEarnedForOrderTotal(Number(args.order.total || 0));
    transaction.update(args.userRef, { loyaltyPoints: FieldValue.increment(points) });
    update.loyaltyAwarded = true;
    update.loyaltyAwardedAmount = points;
    update.loyaltyAwardedAt = args.now;
  }
  transaction.update(args.orderRef, update);
  transaction.set(adminDb.collection("adminAuditLog").doc(), {
    action: "fulfillment_status_changed",
    actorId: args.actor.uid,
    actorEmail: args.actor.email || null,
    targetId: args.orderRef.id,
    before: { status: args.order.status },
    after: { status, closedRemainder: true },
    createdAt: args.now,
  });
  return {
    status,
    cashRecorded,
    order: { id: args.orderRef.id, ...args.order, status, deliveries: args.deliveries, ...(cashRecorded ? { paymentStatus: "Paid", amountPaid: Number(args.order.total) || 0 } : {}) } as Record<string, unknown>,
  };
}

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

      if (!canPackOrder(order as any)) throw new Error("PAYMENT_REQUIRED");

      if (input.action === "partial" || input.action === "shortfall") {
        if (!["Processing", "Shipped"].includes(String(order.status || ""))) throw new Error("INVALID_TRANSITION");
        const pickup = isPickupOrder(order as any);
        const balances = lineBalances(order as any);
        const actorName = actor.email || actor.uid || "staff";
        const staffActor = { uid: actor.uid || "staff", email: actor.email || null };

        if (input.action === "shortfall") {
          const lines = balances.filter((row) => row.remaining > 0).map((row) => ({
            productId: row.productId,
            ...(row.variantId ? { variantId: row.variantId } : {}),
            name: row.name,
            quantity: row.remaining,
          }));
          if (lines.length === 0) throw new Error("NOTHING_OUTSTANDING");
          const sentAlready = (Array.isArray(order.deliveries) ? order.deliveries : []).some((delivery: { shortfall?: boolean; method?: string; lines?: Array<{ quantity?: number }> }) =>
            !delivery.shortfall && delivery.method !== "shortfall" && (delivery.lines || []).some((line) => Number(line.quantity) > 0),
          );
          if (!sentAlready) throw new Error("NOTHING_SENT");
          const productIds = [...new Set(lines.map((line) => line.productId))];
          const productSnaps = await transaction.getAll(...productIds.map((id) => adminDb.collection("products").doc(id)));
          const loyalty = await loyaltyReader(transaction, order);
          writeRestoredStock(transaction, productSnaps, lines, input.orderId, actorName, now);
          const entry = { at: now, by: actorName, method: "shortfall" as const, shortfall: true, lines };
          const deliveries = [...(Array.isArray(order.deliveries) ? order.deliveries : []), entry];
          const finished = writeFinishedOrder(transaction, {
            orderRef, order, actor: staffActor, now, pickup, deliveries, ...loyalty,
          });
          return { kind: "status" as const, order: finished.order, status: finished.status, cashRecorded: finished.cashRecorded };
        }

        if (!pickup && (!input.tracking?.carrier || !input.tracking?.trackingNumber)) throw new Error("TRACKING_REQUIRED");
        const requested = new Map<string, number>();
        for (const line of input.lines) {
          const key = `${line.productId}::${line.variantId || ""}`;
          requested.set(key, (requested.get(key) || 0) + line.quantity);
        }
        const lines = [...requested.entries()].map(([key, quantity]) => {
          const row = balances.find((balance) => `${balance.productId}::${balance.variantId}` === key);
          if (!row) throw new Error("UNKNOWN_LINE");
          if (quantity > row.remaining) throw new Error("QUANTITY");
          return {
            productId: row.productId,
            ...(row.variantId ? { variantId: row.variantId } : {}),
            name: row.name,
            quantity,
          };
        });
        const entry = {
          at: now,
          by: actorName,
          method: pickup ? "pickup" as const : "courier" as const,
          lines,
          ...(input.tracking ? { tracking: input.tracking } : {}),
        };
        const deliveries = [...(Array.isArray(order.deliveries) ? order.deliveries : []), entry];
        const remaining = outstandingQuantity({ ...order, deliveries } as any);
        if (remaining === 0) {
          const loyalty = await loyaltyReader(transaction, order);
          const finished = writeFinishedOrder(transaction, {
            orderRef, order, actor: staffActor, now, pickup, deliveries, ...loyalty,
          });
          return { kind: "status" as const, order: finished.order, status: finished.status, cashRecorded: finished.cashRecorded };
        }
        transaction.update(orderRef, { deliveries, updatedAt: now });
        transaction.set(adminDb.collection("adminAuditLog").doc(), {
          action: "partial_delivery_recorded",
          actorId: actor.uid,
          actorEmail: actor.email || null,
          targetId: input.orderId,
          after: { lines, remaining },
          createdAt: now,
        });
        return {
          kind: "partial" as const,
          summary: partialSmsSummary(lines),
          order: { id: input.orderId, ...order, deliveries } as Record<string, unknown>,
        };
      }

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
      if ((input.status === "Delivered" || input.status === "Collected") && partialBlocksCompletion(order as any)) {
        throw new Error("OUTSTANDING");
      }

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
      const cashRecorded = recordCashIfDue(
        transaction,
        orderRef,
        order,
        { uid: actor.uid || "staff", email: actor.email || null },
        now,
        input.status,
        update,
      );

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
        order: {
          id: input.orderId,
          ...order,
          status: input.status,
          tracking: input.tracking || order.tracking,
          ...(cashRecorded ? { paymentStatus: "Paid", amountPaid: Number(order.total) || 0, transactionId: actor.email || "cash-on-delivery" } : {}),
        } as Record<string, unknown>,
        status: input.status,
        cashRecorded,
      };
    });

    if (outcome.kind === "status" || outcome.kind === "partial") {
      try {
        const linked = await withActionUrls(outcome.order as any);
        const tpl = outcome.kind === "partial"
          ? CommunicationTemplates.getPartialDispatch(linked, outcome.summary)
          : CommunicationTemplates.getStatusUpdate(linked, outcome.status);
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
    if (outcome.kind === "status" && outcome.cashRecorded) {
      void notifyCustomerPaymentReceived({
        orderId: input.orderId,
        order: outcome.order,
        receipt: String(outcome.order.transactionId || actor.email || "cash-on-delivery"),
        method: "Cash on Delivery",
      });
    }
    return NextResponse.json({
      success: true,
      message: outcome.kind === "partial" ? "Recorded what went out" : "Fulfillment updated",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    if (code === "INVALID_TRANSITION") return NextResponse.json({ success: false, message: "The order changed elsewhere. Refresh before continuing." }, { status: 409 });
    if (code === "PAYMENT_REQUIRED") return NextResponse.json({ success: false, message: "Only paid orders can enter fulfillment." }, { status: 409 });
    if (code === "TRACKING_REQUIRED") return NextResponse.json({ success: false, message: "Enter carrier and tracking number before dispatch." }, { status: 400 });
    if (code === "QUANTITY") return NextResponse.json({ success: false, message: "That quantity is more than what is still outstanding." }, { status: 400 });
    if (code === "UNKNOWN_LINE") return NextResponse.json({ success: false, message: "That line is not on this order." }, { status: 400 });
    if (code === "NOTHING_OUTSTANDING") return NextResponse.json({ success: false, message: "Nothing is left to close." }, { status: 409 });
    if (code === "NOTHING_SENT") return NextResponse.json({ success: false, message: "Record what went out before closing the rest. Unpaid orders can still be cancelled." }, { status: 409 });
    if (code === "OUTSTANDING") return NextResponse.json({ success: false, message: "Some units are still outstanding. Record what went out, or close the shortfall, before marking this finished." }, { status: 409 });
    throw error;
  }
}
