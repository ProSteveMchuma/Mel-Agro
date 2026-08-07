import { AggregateField } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "analytics.view");
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });

  const paid = adminDb.collection("orders").where("paymentStatus", "==", "Paid");
  const [orders, products, archivedProducts, users, paidStats] = await Promise.all([
    adminDb.collection("orders").count().get(),
    adminDb.collection("products").count().get(),
    adminDb.collection("products").where("archived", "==", true).count().get(),
    adminDb.collection("users").count().get(),
    paid.aggregate({ paidOrders: AggregateField.count(), revenue: AggregateField.sum("total") }).get(),
  ]);

  return NextResponse.json({ success: true, summary: {
    orders: orders.data().count,
    products: products.data().count - archivedProducts.data().count,
    users: users.data().count,
    paidOrders: paidStats.data().paidOrders || 0,
    revenue: paidStats.data().revenue || 0,
    generatedAt: new Date().toISOString(),
  } });
}
