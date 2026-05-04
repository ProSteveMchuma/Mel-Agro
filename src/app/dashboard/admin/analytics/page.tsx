"use client";
import { useMemo, useState } from "react";
import { useOrders } from "@/context/OrderContext";
import {
    DateRange, Granularity,
    filterByRange, computeKPIs, revenueSeries, topProducts,
    revenueByCategory, revenueByCounty, newVsRepeat,
    ordersByDayOfWeek, ordersByHourOfDay, paymentMethodMix,
} from "@/lib/analytics-aggregations";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const RANGES: Array<{ value: DateRange; label: string }> = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '12m', label: 'Last 12 months' },
    { value: 'all', label: 'All time' },
];

const PIE_COLORS = ['#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#84cc16', '#14b8a6'];

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function Kpi({ label, value, sub, accent = 'text-melagri-primary' }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl md:text-3xl font-black ${accent} mt-1 tracking-tighter`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1 font-medium">{sub}</p>}
        </div>
    );
}

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm ${className}`}>
            <div className="mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{title}</h3>
                {subtitle && <p className="text-xs text-gray-400 font-medium mt-1">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

export default function AnalyticsPage() {
    const { orders } = useOrders();
    const [range, setRange] = useState<DateRange>('30d');
    const [granularity, setGranularity] = useState<Granularity>('day');

    const ranged = useMemo(() => filterByRange(orders, range), [orders, range]);

    const kpis = useMemo(() => computeKPIs(ranged), [ranged]);
    const series = useMemo(() => revenueSeries(ranged, granularity), [ranged, granularity]);
    const products = useMemo(() => topProducts(ranged, 8), [ranged]);
    const categories = useMemo(() => revenueByCategory(ranged), [ranged]);
    const counties = useMemo(() => revenueByCounty(ranged).slice(0, 8), [ranged]);
    const segments = useMemo(() => newVsRepeat(ranged), [ranged]);
    const dow = useMemo(() => ordersByDayOfWeek(ranged), [ranged]);
    const hourly = useMemo(() => ordersByHourOfDay(ranged), [ranged]);
    const paymentMix = useMemo(() => paymentMethodMix(ranged), [ranged]);

    const noData = ranged.length === 0;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Revenue Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Live numbers across orders, products, and customer segments.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as DateRange)}
                        className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-melagri-primary/20 outline-none"
                    >
                        {RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {(['day', 'week', 'month'] as Granularity[]).map(g => (
                            <button
                                key={g}
                                onClick={() => setGranularity(g)}
                                className={`px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${granularity === g ? 'bg-melagri-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {noData && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
                    <p className="font-black text-sm uppercase tracking-tight">No orders in this period</p>
                    <p className="text-xs text-amber-800 mt-1">Try a wider date range, or wait for the first orders to come in.</p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Kpi label="Revenue" value={fmtKES(kpis.revenue)} accent="text-melagri-primary" />
                <Kpi label="Paid Orders" value={kpis.paidCount.toLocaleString()} sub={`${kpis.orderCount.toLocaleString()} total`} accent="text-gray-900" />
                <Kpi label="AOV" value={fmtKES(kpis.aov)} accent="text-blue-600" />
                <Kpi label="Customers" value={kpis.uniqueCustomers.toLocaleString()} sub={`${fmtPct(kpis.repeatRate)} repeat`} accent="text-purple-600" />
                <Kpi label="Conversion" value={fmtPct(kpis.conversionRate)} sub="paid / total" accent="text-emerald-600" />
                <Kpi label="Refunded" value={fmtKES(kpis.refundedRevenue)} sub={`${kpis.cancelledCount} cancelled`} accent="text-red-600" />
            </div>

            <Card title="Revenue Trend" subtitle="Total paid revenue over time">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
                            <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v: any, name: any) => [name === 'revenue' ? fmtKES(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} yAxisId="orders" hide />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Products" subtitle="By revenue, paid orders only">
                    {products.length === 0 ? <p className="text-gray-400 text-sm">No products yet.</p> : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={products} layout="vertical" margin={{ left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="label" stroke="#9ca3af" fontSize={11} width={130} />
                                    <Tooltip formatter={(v: any) => fmtKES(v)} />
                                    <Bar dataKey="revenue" fill="#22c55e" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <Card title="Revenue by Category" subtitle="Where the money's coming from">
                    {categories.length === 0 ? <p className="text-gray-400 text-sm">No data.</p> : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categories} dataKey="revenue" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2}>
                                        {categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => fmtKES(v)} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Revenue by County" subtitle="Top 8 destinations">
                    {counties.length === 0 ? <p className="text-gray-400 text-sm">No location data.</p> : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={counties}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} angle={-30} textAnchor="end" height={60} />
                                    <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v: any) => fmtKES(v)} />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <Card title="New vs Repeat Customers" subtitle="Paid orders attributed to first-time vs returning buyers">
                    {segments.length === 0 ? <p className="text-gray-400 text-sm">No data.</p> : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={segments}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                                    <YAxis yAxisId="left" stroke="#22c55e" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} />
                                    <Tooltip formatter={(v: any, name: any) => [name === 'revenue' ? fmtKES(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar yAxisId="left" dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Day of Week" subtitle="When customers buy">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dow}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} />
                                <YAxis stroke="#9ca3af" fontSize={11} />
                                <Tooltip formatter={(v: any, name: any) => [name === 'revenue' ? fmtKES(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                                <Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Hour of Day" subtitle="Peak ordering hours (local time)">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" stroke="#9ca3af" fontSize={9} interval={2} />
                                <YAxis stroke="#9ca3af" fontSize={11} />
                                <Tooltip formatter={(v: any, name: any) => [name === 'revenue' ? fmtKES(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                                <Bar dataKey="orders" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card title="Payment Method Mix" subtitle="How customers actually pay">
                {paymentMix.length === 0 ? <p className="text-gray-400 text-sm">No paid orders yet.</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-1 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={paymentMix} dataKey="revenue" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                                        {paymentMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => fmtKES(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            {paymentMix.map((m, i) => (
                                <div key={m.label} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="font-bold text-sm text-gray-900 truncate">{m.label}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-black text-sm text-gray-900">{fmtKES(m.revenue)}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{m.orders} orders</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
