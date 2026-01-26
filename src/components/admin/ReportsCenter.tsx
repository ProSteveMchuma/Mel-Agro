"use client";
import { useState, useMemo } from 'react';
import { Order } from '@/context/OrderContext';
import { aggregateOrderData, ReportingStats } from '@/lib/reports-service';
import { SalesReportTemplate } from '@/components/documents/SalesReportTemplate';

interface ReportsCenterProps {
    orders: Order[];
    onClose: () => void;
}

export default function ReportsCenter({ orders, onClose }: ReportsCenterProps) {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const stats = useMemo(() => {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        if (end) end.setHours(23, 59, 59, 999);

        return aggregateOrderData(orders, start, end);
    }, [orders, startDate, endDate]);

    const filteredOrders = useMemo(() => {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        if (end) end.setHours(23, 59, 59, 999);

        return orders.filter(o => {
            const date = new Date(o.date);
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        });
    }, [orders, startDate, endDate]);

    const handlePrint = () => {
        setIsPreviewMode(true);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (isPreviewMode) {
        return (
            <div className="fixed inset-0 z-[200] bg-white overflow-auto print:overflow-visible">
                <div className="p-4 print:hidden flex justify-between items-center bg-gray-900 text-white sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsPreviewMode(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <span className="font-bold">Financial Report Preview</span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => window.print()} className="bg-melagri-primary px-4 py-2 rounded-lg hover:bg-melagri-secondary text-sm font-bold">Print / Export PDF</button>
                        <button onClick={() => setIsPreviewMode(false)} className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 text-sm font-bold">Back to Filters</button>
                    </div>
                </div>
                <div className="p-8 print:p-0">
                    <SalesReportTemplate
                        orders={filteredOrders}
                        startDate={startDate ? new Date(startDate) : undefined}
                        endDate={endDate ? new Date(endDate) : undefined}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-slate-800 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-melagri-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Reports Center</h2>
                            <p className="text-gray-400 text-sm mt-1">Generate comprehensive business insights</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    {/* Date Filters */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-melagri-primary/10 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-melagri-primary/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* Preview Stats */}
                    <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Live Preview ({filteredOrders.length} Orders)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <div className="text-[10px] text-gray-400 font-bold uppercase">Revenue</div>
                                <div className="text-lg font-black text-gray-900">KES {stats.totalRevenue.toLocaleString()}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <div className="text-[10px] text-gray-400 font-bold uppercase">Avg Order</div>
                                <div className="text-lg font-black text-gray-900">KES {stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Selects */}
                    <div className="flex gap-3 mb-8">
                        <button
                            onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() - 30);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - 3);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                        >
                            Last Quarter
                        </button>
                    </div>

                    {/* Action */}
                    <button
                        onClick={handlePrint}
                        className="w-full bg-melagri-primary text-white py-4 rounded-2xl font-black uppercase tracking-[.2em] shadow-xl shadow-green-900/10 hover:shadow-green-900/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Generate & Print Report
                    </button>
                </div>
            </div>
        </div>
    );
}
