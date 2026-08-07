import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { hasAdminPermission, type AdminPermission } from "@/lib/admin-permissions";

const text = (value: unknown) => String(value || "").toLowerCase();

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";
  if (query.length < 2) return NextResponse.json({ success: true, results: [] });
  const can = (permission: AdminPermission) => hasAdminPermission(auth.role, auth.permissions, permission);
  const [orders, products, users, payments] = await Promise.all([
    can("orders.manage") ? adminDb.collection("orders").orderBy("date", "desc").limit(300).get() : Promise.resolve(null),
    can("catalogue.manage") ? adminDb.collection("products").limit(600).get() : Promise.resolve(null),
    can("customers.manage") ? adminDb.collection("users").limit(500).get() : Promise.resolve(null),
    can("payments.manage") ? adminDb.collection("c2bPayments").orderBy("recordedAt", "desc").limit(200).get() : Promise.resolve(null),
  ]);
  const includes = (...values: unknown[]) => values.some((value) => text(value).includes(query));
  const results = [
    ...(orders?.docs || []).filter((doc) => { const data = doc.data(); return includes(doc.id, data.userName, data.userEmail, data.phone, data.transactionId, data.paymentStatus, data.status); }).slice(0, 6).map((doc) => { const data = doc.data(); return { id: `order:${doc.id}`, type: "Order", title: `Order #${doc.id.slice(0, 10)}`, subtitle: `${data.userName || data.phone || "Guest"} - ${data.paymentStatus || data.status || "Order"}`, href: `/dashboard/admin/orders/${doc.id}` }; }),
    ...(products?.docs || []).filter((doc) => { const data = doc.data(); return data.archived !== true && includes(doc.id, data.name, data.productCode, data.brand, data.category, data.variants?.map((variant: Record<string, unknown>) => variant.sku).join(" ")); }).slice(0, 6).map((doc) => { const data = doc.data(); return { id: `product:${doc.id}`, type: "Product", title: data.name || doc.id, subtitle: `${data.brand || "Unbranded"} - ${data.category || "Uncategorised"}`, href: `/dashboard/admin/products/edit/${doc.id}` }; }),
    ...(users?.docs || []).filter((doc) => { const data = doc.data(); return includes(doc.id, data.name, data.email, data.phone, data.county); }).slice(0, 6).map((doc) => { const data = doc.data(); return { id: `user:${doc.id}`, type: "Customer", title: data.name || data.email || data.phone || "Customer", subtitle: data.email || data.phone || data.county || doc.id, href: `/dashboard/admin/users/${doc.id}` }; }),
    ...(payments?.docs || []).filter((doc) => { const data = doc.data(); return includes(doc.id, data.TransID, data.BillRefNumber, data.MSISDN, data.FirstName, data.orderId); }).slice(0, 6).map((doc) => { const data = doc.data(); return { id: `payment:${doc.id}`, type: "Payment", title: data.TransID || `Payment ${doc.id.slice(0, 8)}`, subtitle: `${data.FirstName || data.MSISDN || "M-Pesa"} - KES ${Number(data.TransAmount || 0).toLocaleString()}`, href: "/dashboard/admin/payments" }; }),
  ].slice(0, 20);
  return NextResponse.json({ success: true, results });
}
