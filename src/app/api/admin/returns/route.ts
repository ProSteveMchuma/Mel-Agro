import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { CommunicationTemplates } from "@/lib/communication-templates";
import { withActionUrls } from "@/lib/order-access";
import { notifyCustomer } from "@/lib/customer-notifications";

const PAGE_SIZE = 20;
const RETURN_STATUSES = ["Requested", "Approved", "Rejected"] as const;
type ReturnStatus = (typeof RETURN_STATUSES)[number];
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

export async function GET(request: Request) {
  const actor = await requirePermission(request, "orders.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const search = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
  const statusParam = params.get("status") || "Requested";
  const statusFilter =
    statusParam === "all"
      ? null
      : RETURN_STATUSES.includes(statusParam as ReturnStatus)
        ? (statusParam as ReturnStatus)
        : "Requested";

  let cursor = decode(params.get("cursor"));
  const matches: Array<{ id: string; [key: string]: unknown }> = [];
  let scanned = 0;
  let exhausted = false;

  while (matches.length <= PAGE_SIZE && scanned < 600 && !exhausted) {
    let query = adminDb.collection("orders").orderBy("date", "desc").orderBy(FieldPath.documentId(), "desc").limit(75);
    if (cursor) query = query.startAfter(cursor.date, cursor.id);
    const snapshot = await query.get();
    if (snapshot.empty) {
      exhausted = true;
      break;
    }
    scanned += snapshot.size;
    for (const document of snapshot.docs) {
      const data = document.data();
      const date = String(data.date || data.returnRequestedAt || "");
      cursor = { date, id: document.id };
      if (!data.returnStatus) continue;
      if (statusFilter && data.returnStatus !== statusFilter) continue;
      if (search) {
        const haystack = [document.id, data.userName, data.userEmail, data.phone, data.returnReason]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(search)) continue;
      }
      matches.push({ id: document.id, ...data });
      if (matches.length > PAGE_SIZE) break;
    }
    exhausted = snapshot.size < 75;
  }

  const page = matches.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  const [requested, approved, rejected] = await Promise.all([
    adminDb.collection("orders").where("returnStatus", "==", "Requested").count().get(),
    adminDb.collection("orders").where("returnStatus", "==", "Approved").count().get(),
    adminDb.collection("orders").where("returnStatus", "==", "Rejected").count().get(),
  ]);

  return NextResponse.json({
    success: true,
    orders: page,
    nextCursor:
      last && (matches.length > PAGE_SIZE || !exhausted)
        ? encode({ date: String(last.date || last.returnRequestedAt || ""), id: last.id })
        : null,
    stats: {
      requested: requested.data().count,
      approved: approved.data().count,
      rejected: rejected.data().count,
    },
    searchLimited: Boolean(search && scanned >= 600),
  });
}

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("decide"),
    orderId: z.string().min(1).max(200),
    status: z.enum(["Approved", "Rejected"]),
    note: z.string().trim().max(1000).optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid return update." }, { status: 400 });
  }
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
          action: "return_note_added",
          actorId: actor.uid,
          actorEmail: actor.email || null,
          targetId: input.orderId,
          after: { note: input.note },
          createdAt: now,
        });
        return { kind: "note" as const };
      }

      if (order.returnStatus !== "Requested") throw new Error("INVALID_TRANSITION");

      const update: Record<string, unknown> = {
        returnStatus: input.status,
        returnReviewedAt: now,
        returnReviewedBy: actor.email || actor.uid,
        updatedAt: now,
      };
      if (input.note?.trim()) {
        update.returnReviewNote = input.note.trim();
        const entry = {
          date: now,
          note: `Return ${input.status}: ${input.note.trim()}`,
          author: actor.email || actor.uid,
        };
        update.internalHistory = FieldValue.arrayUnion(entry);
        update.internalNotes = input.note.trim();
      }

      transaction.update(orderRef, update);
      transaction.set(adminDb.collection("adminAuditLog").doc(), {
        action: "return_decision",
        actorId: actor.uid,
        actorEmail: actor.email || null,
        targetId: input.orderId,
        before: { returnStatus: order.returnStatus },
        after: { returnStatus: input.status, note: input.note || null },
        createdAt: now,
      });

      return {
        kind: "decide" as const,
        order: {
          id: input.orderId,
          ...order,
          returnStatus: input.status,
          returnReviewNote: input.note || order.returnReviewNote || null,
        } as Record<string, unknown>,
        status: input.status,
      };
    });

    if (outcome.kind === "decide") {
      try {
        const tpl = CommunicationTemplates.getReturnUpdate(
          withActionUrls(outcome.order as any),
          outcome.status,
        );
        await notifyCustomer({
          userId: String(outcome.order.userId || ""),
          phone: String(outcome.order.mpesaPhoneNumber || outcome.order.phone || ""),
          message: tpl.smsBody,
          type: "order",
          orderId: input.orderId,
        });
      } catch (error) {
        console.warn("Return decision customer notification failed (non-fatal):", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }
    if (code === "INVALID_TRANSITION") {
      return NextResponse.json(
        { success: false, message: "This return was already decided. Refresh the queue." },
        { status: 409 },
      );
    }
    throw error;
  }
}
