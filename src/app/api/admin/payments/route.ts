import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { filterByRange, type DateRange } from "@/lib/analytics-aggregations";
import { applyRefundFilter, failureBreakdown, paymentKpis, refundAudit, stuckStkSessions, unmatchedC2BSummary, type C2bRecord, type RefundFilter, type RefundRecord } from "@/lib/payments-intelligence";
import { nairobiDayBook, nairobiDayKey } from "@/lib/day-book";
import { nairobiRangeUtc } from "@/lib/nairobi-range";
import type { Order } from "@/types";

async function ordersPaidOnNairobiDay(loaded: Order[], day: string): Promise<Order[]> {
  const byId = new Map(loaded.map((order) => [order.id, order]));
  try {
    const { start, endExclusive } = nairobiRangeUtc(day, day);
    const snapshot = await adminDb.collection("orders")
      .where("paidAt", ">=", start.toISOString())
      .where("paidAt", "<", endExclusive.toISOString())
      .limit(2000)
      .get();
    for (const document of snapshot.docs) {
      byId.set(document.id, { id: document.id, ...document.data() } as Order);
    }
  } catch (error) {
    console.warn("Day book paid-at query failed:", error);
  }
  return [...byId.values()];
}

const ranges = new Set<DateRange>(["7d", "30d", "90d", "all"]);
const refundFilters = new Set<RefundFilter>(["all", "pending", "stuck", "reversed", "failed"]);

export async function GET(request: Request) {
  const actor = await requirePermission(request, "payments.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  if (params.get("mode") === "candidates") {
    const search = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
    const snapshot = await adminDb.collection("orders").orderBy("date", "desc").limit(search ? 500 : 75).get();
    const candidates = snapshot.docs.flatMap((document) => {
      const data = document.data();
      if (data.paymentStatus === "Paid") return [];
      const haystack = [document.id, data.userName, data.userEmail, data.phone].map((value) => String(value || "").toLowerCase()).join(" ");
      return !search || haystack.includes(search) ? [{ id: document.id, ...data }] : [];
    }).slice(0, 30);
    return NextResponse.json({ success: true, candidates, searchLimited: Boolean(search && snapshot.size >= 500) });
  }
  const requestedRange = params.get("range") as DateRange;
  const range = ranges.has(requestedRange) ? requestedRange : "30d";
  const requestedFilter = params.get("refundFilter") as RefundFilter;
  const refundFilter = refundFilters.has(requestedFilter) ? requestedFilter : "all";
  const [ordersSnapshot, c2bSnapshot, refundsSnapshot] = await Promise.all([
    adminDb.collection("orders").orderBy("date", "desc").limit(1500).get(),
    adminDb.collection("c2bPayments").orderBy("recordedAt", "desc").limit(300).get(),
    adminDb.collection("refunds").orderBy("initiatedAt", "desc").limit(200).get(),
  ]);
  const orders = ordersSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as Order[];
  const c2b = c2bSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as C2bRecord[];
  const refunds = refundsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as RefundRecord[];
  const rangedOrders = filterByRange(orders, range);
  const refundSummary = refundAudit(refunds);
  const unmatched = unmatchedC2BSummary(c2b);
  const dayParam = params.get("day") || "";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : (nairobiDayKey(new Date()) || dayParam);
  const dayOrders = await ordersPaidOnNairobiDay(orders, day);
  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    sourceWindow: { orders: orders.length, c2b: c2b.length, refunds: refunds.length },
    kpis: paymentKpis({ rangedOrders, allOrders: orders, c2b, refunds }),
    dayBook: nairobiDayBook({ orders: dayOrders, unmatchedTill: unmatched.rows, day }),
    unmatched,
    refunds: { ...refundSummary, rows: applyRefundFilter(refundSummary.rows, refundFilter).slice(0, 100) },
    stuck: stuckStkSessions(orders, 24).slice(0, 50),
    failures: failureBreakdown(rangedOrders, range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365),
  });
}
