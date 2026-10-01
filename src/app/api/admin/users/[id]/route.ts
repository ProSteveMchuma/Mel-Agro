import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { sumPaidSpend } from "@/lib/customer-spend";

function serializable(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(serializable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  }
  return value;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await requirePermission(request, "customers.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

  const { id } = await context.params;
  const userId = String(id || "").trim();
  if (!userId) return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });

  const userSnap = await adminDb.collection("users").doc(userId).get();
  if (!userSnap.exists) return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });

  const PAGE = 100;
  const all: Array<Record<string, unknown> & { id: string }> = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (let page = 0; page < 100; page += 1) {
    let query = adminDb.collection("orders").where("userId", "==", userId).limit(PAGE);
    if (cursor) query = query.startAfter(cursor);
    const ordersSnap = await query.get();
    all.push(...ordersSnap.docs.map((doc) => ({
      ...(serializable(doc.data()) as Record<string, unknown>),
      id: doc.id,
    })));
    if (ordersSnap.size < PAGE) break;
    cursor = ordersSnap.docs[ordersSnap.docs.length - 1];
  }
  all.sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
  const paidSpend = sumPaidSpend(all.map((order) => ({
    paymentStatus: typeof order.paymentStatus === "string" ? order.paymentStatus : null,
    total: Number(order.total) || 0,
  })));
  const paidOrderCount = all.filter((order) => order.paymentStatus === "Paid").length;
  const orders = all.slice(0, PAGE);
  const lastOrderAt = all[0]?.date ? String(all[0].date) : null;
  const user = { ...(serializable(userSnap.data()) as Record<string, unknown>), id: userSnap.id, uid: userSnap.data()?.uid || userSnap.id };

  return NextResponse.json({
    success: true,
    user,
    orders,
    lastOrderAt,
    paidSpend,
    paidOrderCount,
    orderCount: all.length,
  });
}
