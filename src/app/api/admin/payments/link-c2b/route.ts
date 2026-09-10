import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { notifyCustomerPaymentReceived } from "@/lib/payment-notifications";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ignore"), c2bPaymentId: z.string().min(1).max(200), orderId: z.string().optional() }),
  z.object({ action: z.literal("link"), c2bPaymentId: z.string().min(1).max(200), orderId: z.string().min(1).max(200) }),
]);

export async function POST(request: Request) {
  const actor = await requirePermission(request, "payments.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid reconciliation request." }, { status: 400 });
  const input = parsed.data;
  try {
    const outcome = await adminDb.runTransaction(async (transaction) => {
      const paymentRef = adminDb.collection("c2bPayments").doc(input.c2bPaymentId);
      const paymentSnapshot = await transaction.get(paymentRef);
      if (!paymentSnapshot.exists) throw new Error("PAYMENT_NOT_FOUND");
      const payment = paymentSnapshot.data() || {};
      const now = new Date().toISOString();
      if (input.action === "ignore") {
        if (payment.status === "Matched") throw new Error("ALREADY_MATCHED");
        if (payment.status === "Ignored") return "noop";
        transaction.update(paymentRef, { status: "Ignored", ignoredBy: actor.uid, ignoredByEmail: actor.email || null, ignoredAt: now });
        transaction.set(adminDb.collection("adminAuditLog").doc(), { action: "c2b_payment_ignored", actorId: actor.uid, actorEmail: actor.email || null, targetId: input.c2bPaymentId, before: { status: payment.status || null }, after: { status: "Ignored" }, createdAt: now });
        return "ignored";
      }
      const orderRef = adminDb.collection("orders").doc(input.orderId);
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) throw new Error("ORDER_NOT_FOUND");
      const order = orderSnapshot.data() || {};
      if (payment.status === "Matched" && payment.matchedOrderId === input.orderId) return "noop";
      if (payment.status === "Matched") throw new Error("ALREADY_MATCHED");
      if (payment.status === "Ignored") throw new Error("PAYMENT_IGNORED");
      const incomingReceipt = String(payment.transID || "");
      const existingReceipt = String(order.mpesaReceiptNumber || order.transactionId || "");
      if (order.paymentStatus === "Paid" && existingReceipt !== incomingReceipt) throw new Error("ORDER_ALREADY_PAID");
      const incomingAmount = Number(payment.amount || 0);
      const orderTotal = Number(order.total || 0);
      if (!Number.isFinite(incomingAmount) || incomingAmount <= 0 || Math.abs(incomingAmount - orderTotal) > 0.01) throw new Error("AMOUNT_MISMATCH");
      transaction.update(orderRef, {
        paymentStatus: "Paid", paymentMethod: order.paymentMethod || "M-Pesa", transactionId: incomingReceipt || order.transactionId || null,
        mpesaReceiptNumber: incomingReceipt || order.mpesaReceiptNumber || null, mpesaPhoneNumber: payment.phone || order.mpesaPhoneNumber || null,
        amountPaid: incomingAmount, paymentResolvedVia: "Manual_Admin_Link", paidAt: order.paidAt || now, updatedAt: now,
        stockReservationStatus: "committed",
        internalHistory: FieldValue.arrayUnion({ date: now, author: actor.email || actor.uid, note: `Manually linked M-Pesa Till payment ${incomingReceipt || input.c2bPaymentId} (${incomingAmount} KES).` }),
      });
      transaction.update(paymentRef, { status: "Matched", matchedOrderId: input.orderId, matchReason: "Manual_Admin_Link", matchedBy: actor.uid, matchedByEmail: actor.email || null, matchedAt: now });
      transaction.set(adminDb.collection("adminAuditLog").doc(), { action: "c2b_payment_linked", actorId: actor.uid, actorEmail: actor.email || null, targetId: input.c2bPaymentId, before: { paymentStatus: order.paymentStatus || null, paymentRecordStatus: payment.status || null }, after: { orderId: input.orderId, paymentStatus: "Paid", receipt: incomingReceipt, amount: incomingAmount }, createdAt: now });
      if (order.userId) transaction.set(adminDb.collection("notifications").doc(), { userId: order.userId, message: `Payment received for order #${input.orderId.slice(0, 8)}.`, date: now, read: false, type: "order" });
      return "linked";
    });
    if (outcome === "linked" && input.action === "link") {
      const orderSnap = await adminDb.collection("orders").doc(input.orderId).get();
      void notifyCustomerPaymentReceived({
        orderId: input.orderId,
        order: { id: input.orderId, ...orderSnap.data() },
        receipt: String(orderSnap.data()?.mpesaReceiptNumber || orderSnap.data()?.transactionId || ""),
        method: String(orderSnap.data()?.paymentMethod || "M-Pesa"),
      });
    }
    return NextResponse.json({ success: true, action: outcome });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const responses: Record<string, { message: string; status: number }> = {
      PAYMENT_NOT_FOUND: { message: "C2B payment not found.", status: 404 }, ORDER_NOT_FOUND: { message: "Order not found.", status: 404 },
      ALREADY_MATCHED: { message: "This payment has already been matched.", status: 409 }, PAYMENT_IGNORED: { message: "This payment was marked as unrelated. Review its audit history before changing it.", status: 409 },
      ORDER_ALREADY_PAID: { message: "This order is already paid with a different receipt.", status: 409 }, AMOUNT_MISMATCH: { message: "Payment amount does not exactly match the order total. Review both records before linking.", status: 409 },
    };
    const response = responses[code];
    if (response) return NextResponse.json({ success: false, message: response.message }, { status: response.status });
    console.error("C2B reconciliation failed", error);
    return NextResponse.json({ success: false, message: "Reconciliation failed. Please retry." }, { status: 500 });
  }
}
