import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

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

  const ordersSnap = await adminDb.collection("orders").where("userId", "==", userId).limit(100).get();
  const orders: Array<Record<string, unknown> & { id: string }> = ordersSnap.docs.map((doc) => ({
    ...(serializable(doc.data()) as Record<string, unknown>),
    id: doc.id,
  }));
  orders.sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
  const lastOrderAt = orders[0]?.date ? String(orders[0].date) : null;
  const user = { ...(serializable(userSnap.data()) as Record<string, unknown>), id: userSnap.id, uid: userSnap.data()?.uid || userSnap.id };

  return NextResponse.json({ success: true, user, orders, lastOrderAt });
}
