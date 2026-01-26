"use client";
import { useOrders } from "@/context/OrderContext";
import { useState } from "react";
import { SalesReportTemplate } from "@/components/documents/SalesReportTemplate";

export default function ReportsPage() {
    const { orders } = useOrders();
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.date).toISOString().split('T')[0];
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
                    <p className="text-gray-500 text-sm">Monitor business performance and growth metrics.</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-melagri-primary text-white px-6 py-2.5 rounded-xl shadow-lg shadow-melagri-primary/20 hover:bg-melagri-secondary transition-all font-bold text-sm flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Report
                </button>
            </div>

            {/* Date Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end print:hidden">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
                    <input
                        type="date"
                        className="p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-melagri-primary"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                    <input
                        type="date"
                        className="p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-melagri-primary"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
                <div className="flex-grow"></div>
                <div className="text-xs text-gray-400 font-bold mb-2">
                    Showing {filteredOrders.length} orders in range
                </div>
            </div>

            {/* Report Preview */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
                <div className="p-1 min-h-[800px] bg-gray-50/50 print:bg-white print:p-0">
                    <SalesReportTemplate
                        orders={filteredOrders}
                        startDate={new Date(dateRange.start)}
                        endDate={new Date(dateRange.end)}
                    />
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    aside, header, .print\\:hidden {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .container-custom {
                        max-width: 100% !important;
                    }
                    body {
                        background: white !important;
                    }
                    #sales-report-template {
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
