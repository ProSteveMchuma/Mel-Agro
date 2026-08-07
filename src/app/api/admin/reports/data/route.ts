import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import type { Order } from "@/types";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(["json", "csv"]).default("json"),
});
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, "analytics.view");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({ start: params.get("start"), end: params.get("end"), format: params.get("format") || "json" });
  if (!parsed.success) return NextResponse.json({ success: false, message: "Choose a valid report date range." }, { status: 400 });
  const start = new Date(`${parsed.data.start}T00:00:00.000Z`);
  const endExclusive = new Date(`${parsed.data.end}T00:00:00.000Z`); endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  if (start >= endExclusive) return NextResponse.json({ success: false, message: "The start date must be on or before the end date." }, { status: 400 });
  if (endExclusive.getTime() - start.getTime() > 366 * 86400000) return NextResponse.json({ success: false, message: "Reports are limited to a maximum of 366 days." }, { status: 400 });
  const snapshot = await adminDb.collection("orders").where("date", ">=", start.toISOString()).where("date", "<", endExclusive.toISOString()).orderBy("date", "desc").limit(5001).get();
  const truncated = snapshot.size > 5000;
  const orders = snapshot.docs.slice(0, 5000).map((document) => ({ id: document.id, ...document.data() })) as Array<Order & { userId?: string; refundStatus?: string; refundAmount?: number }>;
  if (parsed.data.format === "csv") {
    const header = ["Order ID", "Date", "Customer", "County", "Payment method", "Payment status", "Fulfillment status", "Gross total", "Refund status", "Refund amount"];
    const rows = orders.map((order) => [order.id, order.date, order.userName || order.userEmail || order.userId || "Guest", order.shippingAddress?.county || "", order.paymentMethod || "", order.paymentStatus || "Unpaid", order.status || "", order.total || 0, order.refundStatus || "", order.refundAmount || 0]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="melagri-sales-${parsed.data.start}-to-${parsed.data.end}.csv"`, "X-Content-Type-Options": "nosniff" } });
  }
  return NextResponse.json({ success: true, orders, truncated, generatedAt: new Date().toISOString(), definitions: { revenue: "Gross order total where paymentStatus is Paid", refunds: "refundAmount for reversed/refunded orders", timezone: "UTC date boundaries" } });
}
