"use client";
import { useEffect, useMemo, useState } from "react";
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
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";

function renderInsightsMarkdown(md: string) {
    const html = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^### (.*)$/gm, '<h3 class="text-base font-black text-gray-900 mt-5 mb-2 tracking-tight">$1</h3>')
        .replace(/^## (.*)$/gm, '<h3 class="text-lg font-black text-gray-900 mt-6 mb-3 tracking-tight">$1</h3>')
        .replace(/^# (.*)$/gm, '<h2 class="text-xl font-black text-gray-900 mt-6 mb-3 tracking-tight">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-[12px] font-mono text-gray-800">$1</code>');

    const lines = html.split('\n');
    const out: string[] = [];
    let inList = false;
    for (const raw of lines) {
        const line = raw.trim();
        const isBullet = /^[-*]\s+/.test(line);
        if (isBullet) {
            if (!inList) { out.push('<ul class="list-disc pl-6 space-y-1.5 mb-3 text-gray-700">'); inList = true; }
            out.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
            continue;
        }
        if (inList) { out.push('</ul>'); inList = false; }
        if (!line) { out.push(''); continue; }
        if (line.startsWith('<h')) { out.push(line); continue; }
        out.push(`<p class="mb-3 text-gray-700 leading-relaxed">${line}</p>`);
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
}

interface InsightsState {
    loading: boolean;
    insights: string | null;
    generatedAt: string | null;
    cached: boolean;
    configurationRequired: boolean;
    error: string | null;
}

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
    const [aiState, setAiState] = useState<InsightsState>({
        loading: false, insights: null, generatedAt: null, cached: false, configurationRequired: false, error: null,
    });

    const loadInsights = async (force: boolean) => {
        setAiState(s => ({ ...s, loading: true, error: null }));
        try {
            const token = await getAuth().currentUser?.getIdToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };
            const res = force
                ? await fetch('/api/admin/ai-insights', { method: 'POST', headers, body: JSON.stringify({ range, force: true }) })
                : await fetch(`/api/admin/ai-insights?range=${range}`, { headers });
            const data = await res.json();
            if (!res.ok || !data.success) {
                if (data.configurationRequired) {
                    setAiState({ loading: false, insights: null, generatedAt: null, cached: false, configurationRequired: true, error: data.message || 'Not configured' });
                } else {
                    setAiState(s => ({ ...s, loading: false, error: data.message || 'Failed to load insights' }));
                    if (force) toast.error(data.message || 'Failed to generate insights');
                }
                return;
            }
            setAiState({
                loading: false,
                insights: data.insights || null,
                generatedAt: data.generatedAt || null,
                cached: !!data.cached,
                configurationRequired: false,
                error: null,
            });
            if (force) toast.success('Fresh insights generated');
        } catch (e: any) {
            setAiState(s => ({ ...s, loading: false, error: e?.message || 'Network error' }));
        }
    };

    // On mount and when range changes — fetch any cached insight (no LLM call)
    useEffect(() => {
        loadInsights(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

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

            {/* AI Insights — Claude-powered weekly briefing */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 rounded-3xl p-6 md:p-8 border-2 border-purple-100 shadow-sm relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg shadow-purple-300/30">✨</div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">AI Market Briefing</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Claude Opus 4.7 reads your live data and surfaces the actions that matter this {range === 'all' ? 'period' : range}.
                                    {aiState.generatedAt && (
                                        <span className="text-gray-400"> · Last generated {new Date(aiState.generatedAt).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}{aiState.cached ? ' (cached)' : ''}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => loadInsights(true)}
                            disabled={aiState.loading || aiState.configurationRequired}
                            className="px-5 py-2.5 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-300/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {aiState.loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                                    Generating...
                                </>
                            ) : aiState.insights ? (
                                <>↻ Refresh</>
                            ) : (
                                <>Generate Insights →</>
                            )}
                        </button>
                    </div>

                    {aiState.configurationRequired && (
                        <div className="bg-white border border-purple-200 rounded-2xl p-5 text-sm text-gray-700">
                            <p className="font-bold text-gray-900 mb-2">⚙️ AI Insights are not configured</p>
                            <p className="text-xs text-gray-600 leading-relaxed mb-2">{aiState.error}</p>
                            <p className="text-xs text-gray-500">Add <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px]">ANTHROPIC_API_KEY</code> to your environment (and Vercel) to enable. Cost is ~$0.05 per fresh briefing; cached for 1 hour.</p>
                        </div>
                    )}

                    {!aiState.configurationRequired && !aiState.insights && !aiState.loading && (
                        <div className="bg-white border border-purple-100 rounded-2xl p-6 text-center">
                            <p className="text-sm text-gray-600">Click <strong>Generate Insights</strong> to get a Claude-written briefing of this period&apos;s data: top actions, what&apos;s working, what needs attention.</p>
                        </div>
                    )}

                    {aiState.loading && !aiState.insights && (
                        <div className="bg-white border border-purple-100 rounded-2xl p-8 text-center">
                            <div className="inline-flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200 border-t-purple-600" />
                                <span className="text-sm text-gray-600">Claude is reading your data...</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">This usually takes 10–20 seconds.</p>
                        </div>
                    )}

                    {aiState.insights && (
                        <div
                            className="bg-white border border-purple-100 rounded-2xl p-6 md:p-8 prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderInsightsMarkdown(aiState.insights) }}
                        />
                    )}

                    {aiState.error && !aiState.configurationRequired && !aiState.insights && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 mt-3">
                            {aiState.error}
                        </div>
                    )}
                </div>
            </div>

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
