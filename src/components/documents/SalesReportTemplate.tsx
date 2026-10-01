"use client";

import React from "react";
import { useSettings } from "@/context/SettingsContext";
import { nairobiDateTimeStamp, nairobiDayLabel } from "@/lib/nairobi-time";
import {
    customerLabel,
    formatKes,
    refundAmountOf,
    salesPeriodLabel,
    summarizeSalesReport,
    type SalesReportOrder,
} from "@/lib/sales-report";

interface SalesReportTemplateProps {
    orders: SalesReportOrder[];
    startDate?: string;
    endDate?: string;
    truncated?: boolean;
    generatedAt?: string;
}

export const SalesReportTemplate: React.FC<SalesReportTemplateProps> = ({
    orders,
    startDate,
    endDate,
    truncated = false,
    generatedAt,
}) => {
    const { general } = useSettings();
    const summary = summarizeSalesReport(orders);
    const generated = nairobiDateTimeStamp(generatedAt || new Date().toISOString());

    return (
        <div className="sales-report bg-white font-sans text-gray-950" id="sales-report-template">
            <div className="flex items-start justify-between gap-6 border-b-2 border-gray-950 pb-4">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-green-800">Mel-Agri Kenya</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Sales report</h2>
                    <p className="mt-1 max-w-xl text-sm text-gray-600">Paid revenue, refunds, and every order in the selected dates.</p>
                </div>
                <div className="shrink-0 text-right text-xs text-gray-700">
                    <p className="font-black text-gray-950">{general.companyName || "Mel-Agri Kenya"}</p>
                    <p>{general.supportEmail || "admin@melagri.com"}</p>
                    <p className="mt-1">Generated {generated} Nairobi</p>
                </div>
            </div>

            <p className="mt-4 border border-gray-300 px-3 py-2 text-sm">
                <span className="font-black">Filters. </span>
                Start date: {startDate ? nairobiDayLabel(startDate) : "Beginning"}
                {" · "}
                End date: {endDate ? nairobiDayLabel(endDate) : "Present"}
                {" · "}
                Period: {salesPeriodLabel(startDate, endDate)}
                {truncated ? " · Stopped at 5,000 orders. Shorten the dates for a complete copy." : ""}
            </p>

            <table className="mt-4 w-full border-collapse text-sm">
                <caption className="mb-2 text-left text-sm font-black">Totals</caption>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-2 text-left">Paid revenue</th>
                        <th className="border border-gray-300 px-2 py-2 text-left">Refunds</th>
                        <th className="border border-gray-300 px-2 py-2 text-left">Net paid revenue</th>
                        <th className="border border-gray-300 px-2 py-2 text-left">Orders</th>
                        <th className="border border-gray-300 px-2 py-2 text-left">Paid orders</th>
                        <th className="border border-gray-300 px-2 py-2 text-left">Average paid order</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-gray-300 px-2 py-2 font-black">KES {formatKes(summary.paidRevenue)}</td>
                        <td className="border border-gray-300 px-2 py-2 font-black">KES {formatKes(summary.refundTotal)}</td>
                        <td className="border border-gray-300 px-2 py-2 font-black">KES {formatKes(summary.netPaidRevenue)}</td>
                        <td className="border border-gray-300 px-2 py-2">{summary.orderCount.toLocaleString("en-KE")}</td>
                        <td className="border border-gray-300 px-2 py-2">{summary.paidCount.toLocaleString("en-KE")}</td>
                        <td className="border border-gray-300 px-2 py-2">KES {formatKes(summary.averagePaidOrder)}</td>
                    </tr>
                </tbody>
            </table>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
                Paid revenue is the gross order total where payment status is Paid. Refunds are the refund amount on reversed or refunded orders. Net paid revenue subtracts only refunds that are still inside paid revenue.
            </p>

            <table className="mt-6 w-full border-collapse text-sm">
                <caption className="mb-2 text-left text-sm font-black">Fulfilment status</caption>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-2 text-left">Status</th>
                        <th className="border border-gray-300 px-2 py-2 text-right">Orders</th>
                        <th className="border border-gray-300 px-2 py-2 text-right">Share</th>
                        <th className="border border-gray-300 px-2 py-2 text-right">Gross</th>
                    </tr>
                </thead>
                <tbody>
                    {summary.byStatus.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="border border-gray-300 px-2 py-3 text-gray-500">No orders in this range.</td>
                        </tr>
                    ) : summary.byStatus.map((row) => (
                        <tr key={row.status}>
                            <td className="border border-gray-300 px-2 py-2">{row.status}</td>
                            <td className="border border-gray-300 px-2 py-2 text-right">{row.count.toLocaleString("en-KE")}</td>
                            <td className="border border-gray-300 px-2 py-2 text-right">{row.percentage.toFixed(1)}%</td>
                            <td className="border border-gray-300 px-2 py-2 text-right">KES {formatKes(row.gross)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-black">
                        <td className="border border-gray-300 px-2 py-2">Total</td>
                        <td className="border border-gray-300 px-2 py-2 text-right">{summary.orderCount.toLocaleString("en-KE")}</td>
                        <td className="border border-gray-300 px-2 py-2 text-right">{summary.orderCount > 0 ? "100%" : "—"}</td>
                        <td className="border border-gray-300 px-2 py-2 text-right">KES {formatKes(summary.grossTotal)}</td>
                    </tr>
                </tfoot>
            </table>

            <table className="mt-6 w-full border-collapse text-[11px] leading-snug">
                <caption className="mb-2 text-left text-sm font-black">Orders</caption>
                <colgroup>
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1.5 py-2 text-left">Date</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-left">Order</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-left">Customer</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-left">County</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-left">Method</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-left">Payment</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-left">Fulfilment</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-right">Gross</th>
                        <th className="border border-gray-300 px-1.5 py-2 text-right">Refund</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="border border-gray-300 px-2 py-3 text-gray-500">No orders in this range.</td>
                        </tr>
                    ) : orders.map((order) => (
                        <tr key={order.id}>
                            <td className="border border-gray-300 px-1.5 py-1.5">{nairobiDateTimeStamp(order.date) || "—"}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5 font-bold">#{order.id.slice(0, 10)}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5">{customerLabel(order)}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5">{order.shippingAddress?.county || "—"}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5">{order.paymentMethod || "—"}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5">{order.paymentStatus || "Unpaid"}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5">{order.status || "—"}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5 text-right">{formatKes(Number(order.total) || 0)}</td>
                            <td className="border border-gray-300 px-1.5 py-1.5 text-right">{formatKes(refundAmountOf(order))}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-black">
                        <td className="border border-gray-300 px-1.5 py-2" colSpan={7}>Total · {summary.orderCount.toLocaleString("en-KE")} orders · paid revenue KES {formatKes(summary.paidRevenue)} · net KES {formatKes(summary.netPaidRevenue)}</td>
                        <td className="border border-gray-300 px-1.5 py-2 text-right">{formatKes(summary.grossTotal)}</td>
                        <td className="border border-gray-300 px-1.5 py-2 text-right">{formatKes(summary.refundTotal)}</td>
                    </tr>
                </tfoot>
            </table>
            <p className="mt-3 text-[10px] text-gray-500">Dates are Africa/Nairobi. Authorized Mel-Agri personnel only.</p>
        </div>
    );
};
