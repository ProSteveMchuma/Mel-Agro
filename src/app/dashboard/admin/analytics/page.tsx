"use client";
import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/types";
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
import AnalyticsWorkspaceControls from '@/components/admin/AnalyticsWorkspaceControls';
import ShopTodayReadout from '@/components/admin/ShopTodayReadout';
import { pagesLosingBeforeSale, productsLosingBeforeSale, salesByLandingPage, todayShopReadout, type ProductCounter } from '@/lib/shop-journey';

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

function Card({ title, subtitle, children, className = '', id }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; id?: string }) {
    return (
        <div id={id} className={`bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm ${className}`}>
            <div className="mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{title}</h3>
                {subtitle && <p className="text-xs text-gray-400 font-medium mt-1">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

export default function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [storefront, setStorefront] = useState<{
        traffic: Array<{ date: string; totalVisits: number; uniqueVisitors: number }>;
        searches: Array<{ term: string; count: number }>;
        products: ProductCounter[];
        funnel: { sampled: number; steps: Array<{ key: string; label: string; count: number; conversionFromStart: number; dropOff?: number }> };
        pages?: Array<{ key: string; views: number; uniques: number }>;
        regions?: Array<{ key: string; views: number; uniques: number }>;
        visitHours?: Array<{ label: string; visits: number }>;
        visitWeekdays?: Array<{ label: string; visits: number }>;
    } | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [dataError, setDataError] = useState<string | null>(null);
    const [dataTruncated, setDataTruncated] = useState(false);
    const [range, setRange] = useState<DateRange>('30d');
    const [granularity, setGranularity] = useState<Granularity>('day');
    const [pulse, setPulse] = useState<{
        visits: number;
        paidOrders: number;
        checkoutStarted: number;
        checkoutCompleted: number;
        pages: Array<{ key: string; views: number }>;
        products: ProductCounter[];
    } | null>(null);
    const [textableCarts, setTextableCarts] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            setDataLoading(true); setDataError(null);
            try {
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) throw new Error('Admin session is unavailable.');
                const response = await fetch(`/api/admin/analytics/data?range=${range}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Could not load analytics data.');
                setOrders(result.orders || []); setDataTruncated(Boolean(result.truncated));
                setStorefront(result.storefront || null);
            } catch (caught) {
                if ((caught as Error).name !== 'AbortError') setDataError(caught instanceof Error ? caught.message : 'Could not load analytics data.');
            } finally { if (!controller.signal.aborted) setDataLoading(false); }
        })();
        return () => controller.abort();
    }, [range]);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };
                const [overviewResponse, cartsResponse] = await Promise.all([
                    fetch('/api/admin/analytics/overview', { headers, signal: controller.signal }),
                    fetch('/api/admin/intelligence/abandoned-carts', { headers, signal: controller.signal }),
                ]);
                const overview = overviewResponse.ok ? await overviewResponse.json() : null;
                const carts = cartsResponse.ok ? await cartsResponse.json() : null;
                const steps = Array.isArray(overview?.funnel?.steps) ? overview.funnel.steps : [];
                const stepCount = (key: string) => Number(steps.find((step: { key?: string; count?: number }) => step.key === key)?.count || 0);
                if (overview?.success) {
                    setPulse({
                        visits: Number(overview.traffic?.today?.totalVisits || 0),
                        paidOrders: Number(overview.paidToday || 0),
                        checkoutStarted: stepCount('start'),
                        checkoutCompleted: stepCount('complete'),
                        pages: Array.isArray(overview.todayPages) ? overview.todayPages : [],
                        products: Array.isArray(overview.products) ? overview.products : [],
                    });
                }
                const textable = Array.isArray(carts?.carts)
                    ? carts.carts.filter((cart: { recovery?: { contactEligible?: boolean }; purchasedAfterCart?: boolean }) => cart.recovery?.contactEligible && !cart.purchasedAfterCart).length
                    : 0;
                setTextableCarts(textable);
            } catch (caught) {
                if ((caught as Error).name !== 'AbortError') setTextableCarts(0);
            }
        })();
        return () => controller.abort();
    }, []);

    const ranged = useMemo(() => filterByRange(orders, range), [orders, range]);

    const kpis = useMemo(() => computeKPIs(ranged), [ranged]);
    const series = useMemo(() => revenueSeries(ranged, granularity), [ranged, granularity]);
    const products = useMemo(() => topProducts(ranged, 8), [ranged]);
    const categories = useMemo(() => revenueByCategory(ranged), [ranged]);
    const counties = useMemo(() => revenueByCounty(ranged).slice(0, 8), [ranged]);
    const segments = useMemo(() => newVsRepeat(ranged), [ranged]);
    const dow = useMemo(() => ordersByDayOfWeek(ranged), [ranged]);
    const hourly = useMemo(() => ordersByHourOfDay(ranged), [ranged]);
    const visitHours = storefront?.visitHours ?? [];
    const visitWeekdays = storefront?.visitWeekdays ?? [];
    const countedVisitHours = visitHours.reduce((sum, bucket) => sum + Number(bucket.visits || 0), 0);
    const paymentMix = useMemo(() => paymentMethodMix(ranged), [ranged]);
    const landingSales = useMemo(() => salesByLandingPage(ranged), [ranged]);
    const pageLosers = useMemo(() => pagesLosingBeforeSale(storefront?.pages || [], landingSales), [storefront, landingSales]);
    const productLosers = useMemo(() => productsLosingBeforeSale(storefront?.products || []), [storefront]);
    const todayReadout = useMemo(() => {
        if (!pulse) return null;
        const todayKey = new Date().toISOString().slice(0, 10);
        return todayShopReadout({
            ...pulse,
            textableCarts,
            landingSales: salesByLandingPage(orders.filter((order) => String(order.date || '').slice(0, 10) === todayKey)),
            pageMinViews: 3,
        });
    }, [pulse, textableCarts, orders]);

    const noData = ranged.length === 0;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Revenue Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Live numbers from Firestore: paid orders, anonymous storefront visits by page and region, searches, and signed-in checkout sessions.</p>
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

            <AnalyticsWorkspaceControls
                range={range}
                granularity={granularity}
                onApplyView={(nextRange, nextGranularity) => { setRange(nextRange); setGranularity(nextGranularity); }}
                kpis={kpis}
                orders={ranged}
            />

            {dataLoading && <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-500">Refreshing secured analytics data…</div>}
            {dataError && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{dataError}</div>}
            {dataTruncated && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">This view reached the 2,500-order analysis limit. Use a shorter range for complete charts.</div>}

            {noData && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
                    <p className="font-black text-sm uppercase tracking-tight">No orders in this period</p>
                    <p className="text-xs text-amber-800 mt-1">Try a wider date range, or wait for the first orders to come in.</p>
                </div>
            )}

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-sm text-emerald-950">
                <p className="font-black text-xs uppercase tracking-widest text-emerald-800 mb-1">What visitor data means</p>
                <p className="text-xs leading-relaxed text-emerald-900/90">
                    <strong>Visits</strong> and <strong>uniques</strong> are anonymous daily counts (IP + browser fingerprint, hashed — we do not store names, phones, or IPs).
                    You cannot open a roster of “who browsed the site.” Page and region totals use the same anonymous visit. Named people appear only after they sign in or place an order (Customers KPI, Orders, checkout funnel).
                </p>
            </div>

            {todayReadout && <ShopTodayReadout readout={todayReadout} />}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Kpi label="Revenue" value={fmtKES(kpis.revenue)} accent="text-melagri-primary" />
                <Kpi label="Paid Orders" value={kpis.paidCount.toLocaleString()} sub={`${kpis.orderCount.toLocaleString()} total`} accent="text-gray-900" />
                <Kpi label="AOV" value={fmtKES(kpis.aov)} accent="text-blue-600" />
                <Kpi label="Customers" value={kpis.uniqueCustomers.toLocaleString()} sub={`${fmtPct(kpis.repeatRate)} repeat`} accent="text-purple-600" />
                <Kpi label="Conversion" value={fmtPct(kpis.conversionRate)} sub="paid / total" accent="text-emerald-600" />
                <Kpi label="Refunded" value={fmtKES(kpis.refundedRevenue)} sub={`${kpis.cancelledCount} cancelled`} accent="text-red-600" />
            </div>

            {storefront && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Storefront Traffic" subtitle="Anonymous daily page loads — not named visitors">
                        {storefront.traffic.length === 0 ? <p className="text-gray-400 text-sm">No visit events yet.</p> : (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[...storefront.traffic].reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickFormatter={(value) => String(value).slice(5)} />
                                        <YAxis stroke="#9ca3af" fontSize={11} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="totalVisits" name="Visits" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="uniqueVisitors" name="Anon. devices" fill="#22c55e" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </Card>
                    <Card title="Top Searches" subtitle="Lifetime counts from /api/analytics">
                        {storefront.searches.length === 0 ? <p className="text-gray-400 text-sm">No searches recorded yet.</p> : (
                            <div className="space-y-3">
                                {storefront.searches.map(item => (
                                    <div key={item.term} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                        <span className="truncate font-bold text-gray-900">{item.term}</span>
                                        <span className="shrink-0 text-xs font-black uppercase tracking-widest text-melagri-primary">{item.count} searches</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                    <Card id="shop-checkout" title="Checkout Funnel" subtitle={`${storefront.funnel.sampled} signed-in sessions · one row per account, latest visit`}>
                        {storefront.funnel.steps.every(step => step.count === 0) ? <p className="text-gray-400 text-sm">Funnel fills after signed-in checkout starts.</p> : (
                            <div className="space-y-3">
                                {storefront.funnel.steps.map(step => (
                                    <div key={step.key} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                        <span className="font-bold text-gray-900">{step.label}</span>
                                        <span className="text-right text-sm font-black text-gray-900">{step.count} <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{step.dropOff ? `${step.dropOff} did not continue` : `${Math.round(step.conversionFromStart * 100)}% from start`}</span></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {storefront && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Viewers by page" subtitle="Anonymous page loads in this range. Daily uniques are counted again each day.">
                        {(storefront.pages || []).length === 0 ? <p className="text-gray-400 text-sm">No page visits recorded yet. New visits fill this in.</p> : (
                            <div className="space-y-3">
                                {(storefront.pages || []).map((item) => (
                                    <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                        <span className="truncate font-bold text-gray-900">{item.key}</span>
                                        <span className="shrink-0 text-xs font-black uppercase tracking-widest text-gray-500">{item.views} views · {item.uniques} daily uniques</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                    <Card title="Sales by landing page" subtitle="Paid orders in this range. A product, category, or brand page they opened is used when it was stored. Older one-product orders use that product page and are marked. A path, not an address.">
                        {landingSales.length === 0 ? <p className="text-gray-400 text-sm">No paid orders in this range.</p> : (
                            <div className="space-y-3">
                                {landingSales.map((item) => (
                                    <div key={item.path} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                        <span className="truncate font-bold text-gray-900">{item.path}</span>
                                        <span className="shrink-0 text-right text-xs font-black uppercase tracking-widest text-gray-500">
                                            {item.orders} paid · {fmtKES(item.revenue)}
                                            {item.fromOrderProduct > 0 ? <span className="mt-1 block font-bold normal-case tracking-normal text-amber-700">{item.fromOrderProduct === item.orders ? 'Product on the order' : `${item.fromOrderProduct} from the product on the order`}</span> : null}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                    <Card title="Visits by region" subtitle="City and country from the hosting network, not the delivery address.">
                        {(storefront.regions || []).length === 0 ? <p className="text-gray-400 text-sm">No region data yet. New visits fill this in.</p> : (
                            <div className="space-y-3">
                                {(storefront.regions || []).map((item) => (
                                    <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                        <span className="truncate font-bold text-gray-900">{item.key}</span>
                                        <span className="shrink-0 text-xs font-black uppercase tracking-widest text-gray-500">{item.views} views · {item.uniques} daily uniques</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {storefront && (
                <Card title="Shop journey" subtitle="Each row counts a different group. Use a gap as a clue, then check carts or orders before changing the shop.">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pages and regions · anonymous browsers</p>
                            <p className="text-sm text-gray-700">Busiest page: <span className="font-bold text-gray-900">{storefront.pages?.[0]?.key || 'None yet'}</span>{storefront.pages?.[0] ? ` · ${storefront.pages[0].views} views` : ''}</p>
                            <p className="text-sm text-gray-700">Busiest region: <span className="font-bold text-gray-900">{storefront.regions?.[0]?.key || 'None yet'}</span>{storefront.regions?.[0] ? ` · ${storefront.regions[0].views} views` : ''}. Network city and country, not the delivery county. Unknown means the host sent no city.</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2">Products · lifetime totals, not this date range</p>
                            {storefront.products.length === 0 ? <p className="text-sm text-gray-400">No product views yet.</p> : storefront.products.map((item) => (
                                <div key={item.productId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                    <span className="truncate font-bold text-gray-900">{item.name || item.productId}</span>
                                    <span className="shrink-0 text-xs font-black uppercase tracking-widest text-gray-500">{item.views} views · {item.addToCartCount} adds · {item.purchases} purchases{item.inStock === false ? ' · out of stock' : ''}</span>
                                </div>
                            ))}
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2">Loses people before a sale</p>
                            {pageLosers.length === 0 ? <p className="text-sm text-gray-500">No page in this range has enough views and zero paid orders from that page.</p> : pageLosers.map((item) => (
                                <div key={item.path} className="rounded-xl bg-amber-50 px-4 py-3">
                                    <p className="truncate font-bold text-gray-900">{item.path}</p>
                                    <p className="text-xs font-semibold text-amber-800">{item.views} views · no paid order names this page</p>
                                </div>
                            ))}
                            {productLosers.length === 0 ? <p className="text-sm text-gray-500">No product is clearly losing people before a purchase.</p> : productLosers.map((item) => (
                                <div key={item.productId} className="rounded-xl bg-amber-50 px-4 py-3">
                                    <p className="truncate font-bold text-gray-900">{item.name}</p>
                                    <p className="text-xs font-semibold text-amber-800">{item.reason === 'out of stock' ? 'Out of stock' : item.reason === 'looked, not added' ? 'Looked at, not added' : 'Added, not bought'} · {item.views} views · {item.adds} adds · {item.purchases} purchases</p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Checkout · one row per account, latest visit</p>
                            {storefront.funnel.steps.every((step) => step.count === 0) ? <p className="text-sm text-gray-400">Signed-in checkout has not started yet.</p> : storefront.funnel.steps.map((step) => (
                                <div key={step.key} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                                    <span className="font-bold text-gray-900">{step.label}</span>
                                    <span className="text-right text-sm font-black text-gray-900">{step.count}{step.dropOff ? <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-700">{step.dropOff} did not continue</span> : null}</span>
                                </div>
                            ))}
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2">Paid orders · orders in this date range</p>
                            <div className="rounded-xl bg-emerald-50 px-4 py-3">
                                <p className="font-black text-gray-900">{kpis.paidCount.toLocaleString()} paid · {fmtKES(kpis.revenue)}</p>
                                <p className="mt-1 text-xs text-emerald-900/80">These are orders, not the browsers in the page list. A new checkout replaces the previous steps, so the funnel is the latest visit.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

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
                <Card title="Day of Week" subtitle="When customers buy · Africa/Nairobi" className="lg:col-span-2">
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

                <Card title="Hour of Day" subtitle="Peak ordering hours · Africa/Nairobi">
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

                <Card title="Visits by hour" subtitle="Africa/Nairobi. Older daily totals are not split into hours.">
                    {countedVisitHours === 0 ? (
                        <p className="text-sm text-gray-500">New visits fill this in. Older daily totals stay on Storefront Traffic.</p>
                    ) : (
                        <>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={visitHours}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" stroke="#9ca3af" fontSize={9} interval={2} />
                                        <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                                        <Tooltip formatter={(v: any) => [v, 'Visits']} />
                                        <Bar dataKey="visits" name="Visits" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Visit weekday · Africa/Nairobi</p>
                            <div className="mt-2 grid grid-cols-7 gap-2">
                                {visitWeekdays.map((bucket) => (
                                    <div key={bucket.label} className="rounded-xl bg-gray-50 px-1 py-2 text-center">
                                        <p className="text-[10px] font-black uppercase text-gray-400">{bucket.label}</p>
                                        <p className="text-sm font-black text-gray-900">{bucket.visits}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
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
