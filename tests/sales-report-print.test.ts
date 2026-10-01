import test from "node:test";
import assert from "node:assert/strict";
import { dateRangeCutoff, ordersByDayOfWeek, ordersByHourOfDay, revenueSeries } from "../src/lib/analytics-aggregations.ts";
import { nairobiDateKey, nairobiDayLabel, shiftNairobiDay } from "../src/lib/nairobi-time.ts";
import { salesReportCsv, summarizeSalesReport, type SalesReportOrder } from "../src/lib/sales-report.ts";
import type { Order } from "../src/types/index.ts";

const lateEvening = "2026-10-01T20:30:00.000Z";
const afterMidnightNairobi = "2026-10-01T22:00:00.000Z";

test("sales dates stay on the Africa/Nairobi calendar", () => {
    assert.equal(nairobiDateKey(lateEvening), "2026-10-01");
    assert.equal(nairobiDateKey(afterMidnightNairobi), "2026-10-02");
    assert.equal(nairobiDayLabel("2026-10-01"), "1 Oct 2026");
    assert.equal(shiftNairobiDay("2026-10-01", -30), "2026-09-01");
});

test("sales totals keep paid revenue, refunds, and every order", () => {
    const orders: SalesReportOrder[] = [
        { id: "paid-1", date: lateEvening, total: 1000, paymentStatus: "Paid", status: "Delivered" },
        { id: "unpaid", date: lateEvening, total: 400, paymentStatus: "Unpaid", status: "Pending Payment" },
        { id: "reversed", date: afterMidnightNairobi, total: 500, paymentStatus: "Paid", status: "Delivered", refundStatus: "Reversed", refundAmount: 200, userName: "=cmd" },
        { id: "refunded", date: afterMidnightNairobi, total: 300, paymentStatus: "Refunded", status: "Cancelled", refundStatus: "Reversed", refundAmount: 300 },
        { id: "pending-refund", date: lateEvening, total: 80, paymentStatus: "Paid", status: "Processing", refundStatus: "Pending", refundAmount: 80 },
    ];
    const summary = summarizeSalesReport(orders);
    assert.equal(summary.orderCount, 5);
    assert.equal(summary.paidCount, 3);
    assert.equal(summary.paidRevenue, 1580);
    assert.equal(summary.refundTotal, 500);
    assert.equal(summary.refundsOnPaidOrders, 200);
    assert.equal(summary.netPaidRevenue, 1380);
    assert.equal(summary.grossTotal, 2280);
    assert.equal(summary.byStatus.reduce((sum, row) => sum + row.count, 0), 5);

    const csv = salesReportCsv(orders, { start: "2026-09-01", end: "2026-10-02" });
    assert.match(csv, /2026-10-02 01:00/);
    assert.match(csv, /2026-10-01 23:30/);
    assert.doesNotMatch(csv, /2026-10-01T22:00/);
    assert.match(csv, /"'=cmd"/);
    assert.match(csv, /paid-1/);
    assert.match(csv, /pending-refund/);
    assert.match(csv, /"TOTAL"/);
    assert.match(csv, /"PAID REVENUE"/);
    assert.match(csv, /"NET PAID REVENUE"/);
    assert.match(csv, /1580/);
    assert.match(csv, /1380/);
});

test("analytics buckets use Nairobi day and hour", () => {
    const order = { id: "a", date: afterMidnightNairobi, total: 50, paymentStatus: "Paid", items: [] } as unknown as Order;
    const series = revenueSeries([order], "day");
    assert.equal(series[0]?.bucket, "2026-10-02");
    assert.equal(series[0]?.label, "2 Oct");
    const days = ordersByDayOfWeek([order]);
    assert.equal(days.find((day) => day.label === "Fri")?.orders, 1);
    assert.equal(days.find((day) => day.label === "Thu")?.orders, 0);
    const hours = ordersByHourOfDay([order]);
    assert.equal(hours[1]?.orders, 1);
    assert.equal(hours[22]?.orders, 0);
    const cutoff = dateRangeCutoff("7d", Date.parse("2026-10-08T12:00:00.000Z"));
    assert.equal(cutoff?.toISOString(), "2026-10-01T12:00:00.000Z");
});
