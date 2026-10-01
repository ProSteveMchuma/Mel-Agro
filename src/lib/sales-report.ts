import { nairobiDateTimeStamp, nairobiDayLabel } from "./nairobi-time.ts";

export type SalesReportOrder = {
    id: string;
    date?: string;
    total?: number;
    paymentStatus?: string;
    paymentMethod?: string;
    status?: string;
    refundStatus?: string;
    refundAmount?: number;
    userName?: string;
    userEmail?: string;
    userId?: string;
    phone?: string;
    shippingAddress?: { county?: string } | null;
};

export type SalesReportSummary = {
    orderCount: number;
    paidCount: number;
    paidRevenue: number;
    refundCount: number;
    refundTotal: number;
    refundsOnPaidOrders: number;
    netPaidRevenue: number;
    grossTotal: number;
    averagePaidOrder: number;
    byStatus: Array<{ status: string; count: number; gross: number; percentage: number }>;
};

function amount(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export function isPaidOrder(order: SalesReportOrder): boolean {
    return order.paymentStatus === "Paid";
}

export function isRefundedOrder(order: SalesReportOrder): boolean {
    return order.refundStatus === "Reversed" || order.paymentStatus === "Refunded";
}

/** Refund recorded on a reversed or refunded order. Zero when the order was not refunded. */
export function refundAmountOf(order: SalesReportOrder): number {
    if (!isRefundedOrder(order)) return 0;
    const explicit = amount(order.refundAmount);
    if (explicit > 0) return explicit;
    return amount(order.total);
}

export function customerLabel(order: SalesReportOrder): string {
    return order.userName || order.userEmail || order.phone || order.userId || "Guest";
}

export function summarizeSalesReport(orders: SalesReportOrder[]): SalesReportSummary {
    const byStatus = new Map<string, { count: number; gross: number }>();
    let paidRevenue = 0;
    let paidCount = 0;
    let refundTotal = 0;
    let refundCount = 0;
    let refundsOnPaidOrders = 0;
    let grossTotal = 0;

    for (const order of orders) {
        const gross = amount(order.total);
        const refund = refundAmountOf(order);
        grossTotal += gross;
        if (isPaidOrder(order)) {
            paidRevenue += gross;
            paidCount += 1;
            refundsOnPaidOrders += refund;
        }
        if (refund > 0) {
            refundTotal += refund;
            refundCount += 1;
        }
        const status = order.status || "Unknown";
        const bucket = byStatus.get(status) || { count: 0, gross: 0 };
        bucket.count += 1;
        bucket.gross += gross;
        byStatus.set(status, bucket);
    }

    const orderCount = orders.length;
    return {
        orderCount,
        paidCount,
        paidRevenue,
        refundCount,
        refundTotal,
        refundsOnPaidOrders,
        netPaidRevenue: paidRevenue - refundsOnPaidOrders,
        grossTotal,
        averagePaidOrder: paidCount > 0 ? paidRevenue / paidCount : 0,
        byStatus: [...byStatus.entries()]
            .map(([status, bucket]) => ({
                status,
                count: bucket.count,
                gross: bucket.gross,
                percentage: orderCount > 0 ? (bucket.count / orderCount) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status)),
    };
}

export function formatKes(value: number): string {
    return amount(value).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function salesPeriodLabel(start?: string, end?: string): string {
    if (!start && !end) return "All time · Africa/Nairobi";
    return `${start ? nairobiDayLabel(start) : "Beginning"} – ${end ? nairobiDayLabel(end) : "Present"} · Africa/Nairobi`;
}

function csvCell(value: unknown): string {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

export function salesReportCsv(orders: SalesReportOrder[], range: { start: string; end: string }): string {
    const summary = summarizeSalesReport(orders);
    const header = [
        "Order ID",
        "Date (Africa/Nairobi)",
        "Customer",
        "County",
        "Payment method",
        "Payment status",
        "Fulfillment status",
        "Gross total",
        "Refund status",
        "Refund amount",
    ];
    const rows = orders.map((order) => [
        order.id,
        nairobiDateTimeStamp(order.date),
        customerLabel(order),
        order.shippingAddress?.county || "",
        order.paymentMethod || "",
        order.paymentStatus || "Unpaid",
        order.status || "",
        amount(order.total),
        order.refundStatus || "",
        refundAmountOf(order),
    ]);
    const footer = [
        ["TOTAL", `${range.start} to ${range.end} Africa/Nairobi`, `${summary.orderCount} orders`, "", "", `${summary.paidCount} paid`, "", summary.grossTotal, `${summary.refundCount} refunded`, summary.refundTotal],
        ["PAID REVENUE", "Gross order total where payment status is Paid", "", "", "", "", "", summary.paidRevenue, "", ""],
        ["REFUNDS", "Refund amount for reversed or refunded orders", "", "", "", "", "", "", "", summary.refundTotal],
        ["NET PAID REVENUE", "Paid revenue minus refunds on orders still marked Paid", "", "", "", "", "", summary.netPaidRevenue, "", ""],
    ];
    return [...[header], ...rows, ...footer].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
