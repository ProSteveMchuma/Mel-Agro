"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import { SalesReportTemplate } from "@/components/documents/SalesReportTemplate";
import { ReportPrintButton } from "@/components/admin/ReportPrint";
import { defaultNairobiRange } from "@/lib/nairobi-time";
import type { SalesReportOrder } from "@/lib/sales-report";

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState(defaultNairobiRange);
    const [orders, setOrders] = useState<SalesReportOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [truncated, setTruncated] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError("");
            try {
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) throw new Error("Admin session is unavailable.");
                const response = await fetch(`/api/admin/reports/data?start=${dateRange.start}&end=${dateRange.end}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Could not generate report.");
                setOrders(result.orders || []);
                setTruncated(Boolean(result.truncated));
            } catch (caught) {
                if ((caught as Error).name !== "AbortError") {
                    setError(caught instanceof Error ? caught.message : "Could not generate report.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [dateRange.start, dateRange.end]);

    async function exportCsv() {
        try {
            const token = await getAuth().currentUser?.getIdToken();
            if (!token) throw new Error("Admin session is unavailable.");
            const response = await fetch(`/api/admin/reports/data?start=${dateRange.start}&end=${dateRange.end}&format=csv`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Export failed.");
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `melagri-sales-${dateRange.start}-to-${dateRange.end}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Export failed.");
        }
    }

    return (
        <div className="report-print space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <header>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Business intelligence</p>
                    <h1 className="text-2xl font-black text-gray-950">Sales reports</h1>
                    <p className="mt-1 text-sm text-gray-500">Paid revenue, refunds and order activity. The dates you pick are Africa/Nairobi days.</p>
                </header>
                <div className="flex gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={loading || Boolean(error)}
                        className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black disabled:opacity-40"
                    >
                        Export safe CSV
                    </button>
                    <ReportPrintButton disabled={loading || Boolean(error)} label="Print report" />
                </div>
            </div>

            <section className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:hidden">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Start date
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))}
                        className="mt-2 block min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold normal-case"
                    />
                </label>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    End date
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))}
                        className="mt-2 block min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold normal-case"
                    />
                </label>
                <p className="ml-auto pb-3 text-xs font-bold text-gray-400">
                    {loading ? "Generating…" : `${orders.length} orders in range`}
                </p>
            </section>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {truncated && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
                    This report reached the 5,000-row safety limit. Shorten the date range for a complete export.
                </div>
            )}
            {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm font-semibold text-gray-500">Generating report…</div>
            ) : !error && (
                <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
                    <SalesReportTemplate orders={orders} startDate={dateRange.start} endDate={dateRange.end} truncated={truncated} />
                </div>
            )}
        </div>
    );
}
