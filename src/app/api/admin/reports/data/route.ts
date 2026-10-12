import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import type { Order } from "@/types";
import { nairobiRangeUtc } from "@/lib/nairobi-range";
import { buildSalesBook, salesBookCsv, type SalesBookOrder } from "@/lib/sales-book";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(["json", "csv"]).default("json"),
});

export async function GET(request: Request) {
  const actor = await requirePermission(request, "analytics.view");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({ start: params.get("start"), end: params.get("end"), format: params.get("format") || "json" });
  if (!parsed.success) return NextResponse.json({ success: false, message: "Choose a valid report date range." }, { status: 400 });
  const { start, endExclusive } = nairobiRangeUtc(parsed.data.start, parsed.data.end);
  if (start >= endExclusive) return NextResponse.json({ success: false, message: "The start date must be on or before the end date." }, { status: 400 });
  if (endExclusive.getTime() - start.getTime() > 366 * 86400000) return NextResponse.json({ success: false, message: "Reports are limited to a maximum of 366 days." }, { status: 400 });
  const snapshot = await adminDb.collection("orders").where("date", ">=", start.toISOString()).where("date", "<", endExclusive.toISOString()).orderBy("date", "desc").limit(5001).get();
  const truncated = snapshot.size > 5000;
  const orders = snapshot.docs.slice(0, 5000).map((document) => ({ id: document.id, ...document.data() })) as Array<Order & { userId?: string; refundStatus?: string; refundAmount?: number }>;
  if (parsed.data.format === "csv") {
    const taxSnap = await adminDb.collection("settings").doc("tax").get();
    const taxData = taxSnap.data() || {};
    const tax = {
      enabled: taxData.enabled === undefined ? true : Boolean(taxData.enabled),
      taxRate: taxData.taxRate === undefined ? 16 : Number(taxData.taxRate) || 0,
    };
    const bookOrders = orders as SalesBookOrder[];
    const csv = salesBookCsv(bookOrders, buildSalesBook(bookOrders, tax));
    return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="melagri-sales-${parsed.data.start}-to-${parsed.data.end}.csv"`, "X-Content-Type-Options": "nosniff" } });
  }
  return NextResponse.json({ success: true, orders, truncated, generatedAt: new Date().toISOString(), definitions: { revenue: "Gross order total where paymentStatus is Paid", refunds: "refundAmount for reversed/refunded orders", timezone: "Africa/Nairobi date boundaries" } });
}
