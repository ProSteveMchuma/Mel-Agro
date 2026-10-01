"use client";
import { useEffect, useMemo, useState } from "react";
import { useUsers } from "@/context/UserContext";
import { useOrders } from "@/context/OrderContext";
import { CATEGORY_ICONS } from "@/components/SidebarCategories";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import { segmentColor, segmentDescription, Segment, type CustomerProfile, type IntelKPIs, type SegmentSummary } from "@/lib/customer-intelligence";
import { waitForAuthToken } from "@/lib/wait-for-auth-token";
import { profileAccountId, salesByLandingPage, todayShopReadout, type ProductCounter } from "@/lib/shop-journey";
import ShopTodayReadout from "@/components/admin/ShopTodayReadout";

type CustomerVisit = { lastStep: string | null; pathTrail: string[]; openCart: boolean };

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export default function IntelligencePage() {
    const { users } = useUsers();
    const { orders } = useOrders();
    const [cartCount, setCartCount] = useState<number | null>(null);
    const [serverReorders, setServerReorders] = useState<Array<{ userId: string; productId: string; productName: string; userName: string; phone: string; daysUntilExpected: number; confidence: string; lastPrice: number; recommendedQuantity: number; alreadyReminded: boolean }>>([]);
    const [reorderBusy, setReorderBusy] = useState<string | null>(null);
    const [funnel, setFunnel] = useState<{ sampled: number; steps: Array<{ key: string; label: string; count: number; conversionFromStart: number }> } | null>(null);
    const [activeSegment, setActiveSegment] = useState<Segment | 'all'>('all');
    const [tableSort, setTableSort] = useState<'ltv' | 'frequency' | 'recency'>('ltv');
    const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
    const [segments, setSegments] = useState<SegmentSummary[]>([]);
    const [kpis, setKpis] = useState<IntelKPIs>({ totalCustomers: 0, avgLtv: 0, medianLtv: 0, repeatRate: 0, churnRiskCount: 0, newCustomers30d: 0, avgOrdersPerCustomer: 0 });
    const [reorderDueUserIds, setReorderDueUserIds] = useState<string[]>([]);
    const [segmentOrders, setSegmentOrders] = useState<number | null>(null);
    const [segmentsLoading, setSegmentsLoading] = useState(true);
    const [segmentsError, setSegmentsError] = useState<string | null>(null);
    const [visits, setVisits] = useState<Record<string, CustomerVisit>>({});
    const [textableCarts, setTextableCarts] = useState(0);
    const [pulse, setPulse] = useState<{
        visits: number;
        paidOrders: number;
        checkoutStarted: number;
        checkoutCompleted: number;
        pages: Array<{ key: string; views: number }>;
        products: ProductCounter[];
    } | null>(null);
    const consentFor = (profile: { userId: string; phone?: string; email?: string }) => {
        const phone = String(profile.phone || '').replace(/\D/g, '').slice(-9);
        const email = String(profile.email || '').toLowerCase();
        return users.find(candidate => candidate.uid === profile.userId || candidate.id === profile.userId || (phone && String(candidate.phone || '').replace(/\D/g, '').slice(-9) === phone) || (email && String(candidate.email || '').toLowerCase() === email));
    };

    const filtered = useMemo(() => {
        const list = activeSegment === 'all' ? profiles : profiles.filter(p => p.segment === activeSegment);
        if (tableSort === 'ltv') return [...list].sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (tableSort === 'frequency') return [...list].sort((a, b) => b.paidOrderCount - a.paidOrderCount);
        return [...list].sort((a, b) => a.daysSinceLastOrder - b.daysSinceLastOrder);
    }, [profiles, activeSegment, tableSort]);

    const visible = filtered.slice(0, 50);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            setSegmentsLoading(true);
            setSegmentsError(null);
            try {
                const token = await waitForAuthToken();
                if (!token) throw new Error('Admin session is unavailable.');
                const headers = { Authorization: `Bearer ${token}` };
                const [cartsResponse, overviewResponse, reorderResponse, customersResponse] = await Promise.all([
                    fetch('/api/admin/intelligence/abandoned-carts', { headers, signal: controller.signal }),
                    fetch('/api/admin/analytics/overview', { headers, signal: controller.signal }),
                    fetch('/api/admin/intelligence/reorders', { headers, signal: controller.signal }),
                    fetch('/api/admin/intelligence/customers', { headers, signal: controller.signal }),
                ]);
                const cartsData = cartsResponse.ok ? await cartsResponse.json() : null;
                const overviewData = overviewResponse.ok ? await overviewResponse.json() : null;
                const reorderData = reorderResponse.ok ? await reorderResponse.json() : null;
                const customersData = customersResponse.ok ? await customersResponse.json() : null;
                setCartCount(Array.isArray(cartsData?.carts) ? cartsData.carts.length : null);
                setTextableCarts(Array.isArray(cartsData?.carts) ? cartsData.carts.filter((cart: { recovery?: { contactEligible?: boolean }; purchasedAfterCart?: boolean }) => cart.recovery?.contactEligible && !cart.purchasedAfterCart).length : 0);
                if (overviewData?.funnel?.steps) setFunnel(overviewData.funnel);
                if (overviewData?.success) {
                    const steps = Array.isArray(overviewData.funnel?.steps) ? overviewData.funnel.steps : [];
                    const stepCount = (key: string) => Number(steps.find((step: { key?: string; count?: number }) => step.key === key)?.count || 0);
                    setPulse({
                        visits: Number(overviewData.traffic?.today?.totalVisits || 0),
                        paidOrders: Number(overviewData.paidToday || 0),
                        checkoutStarted: stepCount('start'),
                        checkoutCompleted: stepCount('complete'),
                        pages: Array.isArray(overviewData.todayPages) ? overviewData.todayPages : [],
                        products: Array.isArray(overviewData.products) ? overviewData.products : [],
                    });
                }
                setServerReorders(Array.isArray(reorderData?.queue) ? reorderData.queue : []);
                if (!customersResponse.ok) throw new Error(customersData?.message || 'Could not load customer profiles.');
                setProfiles(Array.isArray(customersData?.profiles) ? customersData.profiles : []);
                setSegments(customersData?.segments || []);
                if (customersData?.kpis) setKpis(customersData.kpis);
                setReorderDueUserIds(Array.isArray(customersData?.reorderDueUserIds) ? customersData.reorderDueUserIds : []);
                setSegmentOrders(Number(customersData?.scannedOrders) || 0);
                setVisits(customersData?.visits && typeof customersData.visits === 'object' ? customersData.visits : {});
            } catch (caught) {
                if ((caught as Error).name !== 'AbortError') {
                    setSegmentsError(caught instanceof Error ? caught.message : 'Could not load customer profiles.');
                }
            } finally {
                if (!controller.signal.aborted) setSegmentsLoading(false);
            }
        })();
        return () => controller.abort();
    }, []);

    const paidOrders = orders.filter(o => (o as any).paymentStatus === 'Paid').length;
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
    const funnelColors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-violet-500'];
    const liveFunnelSteps = funnel?.steps?.length
        ? funnel.steps.map((step, index) => ({
            label: step.label,
            count: step.count,
            conversion: funnel.steps[0].count > 0 ? `${Math.round(step.conversionFromStart * 100)}%` : '—',
            color: funnelColors[index] || 'bg-gray-400',
        }))
        : null;

    // Filter to only show users with behavioral data
    const intelligentUsers = users
        .filter(u => u.affinityIndex && Object.keys(u.affinityIndex).length > 0)
        .sort((a, b) => {
            const sumA = Object.values(a.affinityIndex || {}).reduce((acc, val) => acc + val, 0);
            const sumB = Object.values(b.affinityIndex || {}).reduce((acc, val) => acc + val, 0);
            return sumB - sumA;
        });

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Customer Intelligence</h1>
                    <p className="text-gray-500 mt-1">Explainable customer value, repeat demand, and consent-aware opportunities.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-melagri-primary/10 text-melagri-primary text-xs font-black rounded-xl uppercase tracking-widest border border-melagri-primary/20">
                        {intelligentUsers.length} Predictive Profiles
                    </span>
                </div>
            </div>

            {todayReadout && <ShopTodayReadout readout={todayReadout} />}

            <section className="rounded-[2.5rem] border border-emerald-100 bg-white p-8 shadow-sm" aria-labelledby="reorder-opportunities">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Revenue opportunity</p>
                        <h2 id="reorder-opportunities" className="mt-1 text-2xl font-black text-gray-900">Reorder review queue</h2>
                        <p className="mt-1 text-sm text-gray-500">Paid history, high or medium confidence only. One text per purchase cycle. Nothing is sent on its own.</p>
                    </div>
                    <span className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700">{serverReorders.length} due soon</span>
                </div>
                {serverReorders.length > 0 ? (
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400"><tr><th className="py-3">Customer</th><th>Product</th><th>Timing</th><th>Confidence</th><th>Suggested value</th><th></th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {serverReorders.map(item => {
                                    const key = `${item.userId}:${item.productId}`;
                                    return (
                                    <tr key={key}>
                                        <td className="py-4 font-bold text-gray-900">{item.userName}<span className="block font-mono text-[10px] font-normal text-gray-400">{item.phone || item.userId.slice(0, 10)}</span></td>
                                        <td className="font-bold text-gray-900">{item.productName}<span className="block text-xs font-normal text-gray-400">Qty {item.recommendedQuantity}</span></td>
                                        <td className="text-gray-600">{item.daysUntilExpected <= 0 ? `${Math.abs(item.daysUntilExpected)}d overdue` : `In ${item.daysUntilExpected}d`}</td>
                                        <td><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600">{item.confidence}</span></td>
                                        <td className="font-black text-emerald-700">{fmtKES(item.lastPrice * item.recommendedQuantity)}</td>
                                        <td className="py-4 text-right"><button type="button" disabled={item.alreadyReminded || reorderBusy === key || !item.phone} onClick={async () => {
                                            setReorderBusy(key);
                                            try {
                                                const token = await getAuth().currentUser?.getIdToken();
                                                const response = await fetch('/api/admin/intelligence/reorders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: item.userId, productId: item.productId }) });
                                                const result = await response.json();
                                                if (!response.ok) throw new Error(result.message || 'Could not send the reminder');
                                                setServerReorders((current) => current.map((row) => row.userId === item.userId && row.productId === item.productId ? { ...row, alreadyReminded: true } : row));
                                                toast.success('Reorder SMS sent');
                                            } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send the reminder'); }
                                            finally { setReorderBusy(null); }
                                        }} className="rounded-xl bg-emerald-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:bg-gray-200 disabled:text-gray-500">{item.alreadyReminded ? 'Sent' : 'Text reminder'}</button></td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="mt-6 rounded-2xl bg-gray-50 p-6 text-sm font-semibold text-gray-500">No repeat buyers are inside the reorder window.</p>}
            </section>

            {/* CONVERSION FUNNEL VISUALIZATION */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <Link href="/dashboard/admin/intelligence/abandoned-carts" className="group">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight group-hover:text-melagri-primary transition-colors">Checkout Conversion Funnel</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Signed-in sessions from analytics_funnels • Paid orders from Firestore{cartCount != null ? ` • ${cartCount} recoverable carts` : ''} • <span className="text-melagri-primary">Recover Sales →</span></p>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    {(liveFunnelSteps || []).map((step, i) => (
                        <div key={step.label} className="relative group">
                            <div className="h-24 bg-gray-50 rounded-2xl p-6 flex flex-col justify-center border border-gray-100 group-hover:border-melagri-primary/30 transition-all overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${step.color}`}></div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{step.label}</p>
                                        <p className="text-2xl font-black text-gray-900">{step.count}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-melagri-primary">{step.conversion}</p>
                                    </div>
                                </div>
                            </div>
                            {i < (liveFunnelSteps?.length || 1) - 1 && (
                                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 bg-gray-100 rotate-45 border-t border-r border-gray-200"></div>
                            )}
                        </div>
                    ))}
                    {!liveFunnelSteps && (
                        <div className="md:col-span-4 rounded-2xl bg-gray-50 p-6 text-sm font-semibold text-gray-500">
                            Checkout steps appear after a signed-in customer reaches checkout.
                        </div>
                    )}
                </div>
                <p className="mt-6 text-sm font-semibold text-gray-600">Paid orders in the latest orders list: <span className="font-black text-gray-900">{paidOrders.toLocaleString()}</span>. This count is not the next step of the checkout sessions above.</p>
            </div>

            {/* CUSTOMER INTELLIGENCE — RFM segments + LTV */}
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Intelligence</h2>
                    <p className="text-gray-500 text-sm mt-1">RFM segmentation across {kpis.totalCustomers.toLocaleString()} paying customer{kpis.totalCustomers === 1 ? '' : 's'}{segmentOrders != null ? `, from the latest ${segmentOrders.toLocaleString()} orders` : ''}.</p>
                </div>

                {segmentsLoading ? (
                    <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">Loading customer segments…</p>
                ) : segmentsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
                        <p className="font-black text-sm uppercase tracking-tight">Customer profiles did not load</p>
                        <p className="text-xs mt-1">{segmentsError}</p>
                    </div>
                ) : kpis.totalCustomers === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
                        <p className="font-black text-sm uppercase tracking-tight">No paying customers yet</p>
                        <p className="text-xs text-amber-800 mt-1">Customer segments unlock once at least one order is marked Paid.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customers</p>
                                <p className="text-2xl font-black text-gray-900 mt-1 tracking-tighter">{kpis.totalCustomers.toLocaleString()}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg LTV</p>
                                <p className="text-2xl font-black text-melagri-primary mt-1 tracking-tighter">{fmtKES(kpis.avgLtv)}</p>
                                <p className="text-[10px] text-gray-500 mt-1">median {fmtKES(kpis.medianLtv)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Repeat Rate</p>
                                <p className="text-2xl font-black text-blue-600 mt-1 tracking-tighter">{fmtPct(kpis.repeatRate)}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Orders</p>
                                <p className="text-2xl font-black text-purple-600 mt-1 tracking-tighter">{kpis.avgOrdersPerCustomer.toFixed(1)}</p>
                                <p className="text-[10px] text-gray-500 mt-1">per customer</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New (30d)</p>
                                <p className="text-2xl font-black text-emerald-600 mt-1 tracking-tighter">{kpis.newCustomers30d}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Churn Risk</p>
                                <p className="text-2xl font-black text-amber-600 mt-1 tracking-tighter">{kpis.churnRiskCount}</p>
                                <p className="text-[10px] text-gray-500 mt-1">need attention</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Segments</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <button
                                    onClick={() => setActiveSegment('all')}
                                    className={`text-left bg-white rounded-2xl p-5 border-2 transition-all ${activeSegment === 'all' ? 'border-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
                                >
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">All Customers</p>
                                    <p className="text-2xl font-black text-gray-900 tracking-tighter">{kpis.totalCustomers.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-2">Click any segment to filter the list below.</p>
                                </button>
                                {segments.map(s => (
                                    <button
                                        key={s.segment}
                                        onClick={() => setActiveSegment(s.segment)}
                                        className={`text-left bg-white rounded-2xl p-5 border-2 transition-all ${activeSegment === s.segment ? 'shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
                                        style={activeSegment === s.segment ? { borderColor: s.color } : {}}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.count} {s.count === 1 ? 'person' : 'people'}</p>
                                        </div>
                                        <p className="text-base font-black text-gray-900 tracking-tight">{s.segment}</p>
                                        <p className="text-xs font-bold mt-1" style={{ color: s.color }}>{fmtKES(s.revenue)}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">avg LTV {fmtKES(s.avgLtv)}</p>
                                        <p className="text-[10px] text-gray-400 mt-2 leading-snug">{s.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-wrap gap-3">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                        {activeSegment === 'all' ? 'Top Customers' : activeSegment}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Showing {Math.min(visible.length, filtered.length)} of {filtered.length}
                                        {activeSegment !== 'all' && (
                                            <> · <span className="italic">{segmentDescription(activeSegment)}</span></>
                                        )}
                                    </p>
                                </div>
                                <div className="flex bg-gray-50 border border-gray-100 rounded-xl overflow-hidden text-xs font-black uppercase tracking-widest">
                                    {(['ltv', 'frequency', 'recency'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setTableSort(s)}
                                            className={`px-3 py-2 transition-colors ${tableSort === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="text-left px-6 py-3">Customer</th>
                                            <th className="text-left px-6 py-3">Segment</th>
                                            <th className="text-right px-6 py-3">LTV</th>
                                            <th className="text-right px-6 py-3">Orders</th>
                                            <th className="text-right px-6 py-3">AOV</th>
                                            <th className="text-right px-6 py-3">Last Order</th>
                                            <th className="text-left px-6 py-3">Contact</th>
                                            <th className="text-left px-6 py-3">This visit</th>
                                            <th className="text-left px-6 py-3">Opportunity</th>
                                            <th className="text-right px-6 py-3">RFM</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {visible.map(p => {
                                            const contactUser = consentFor(p);
                                            const visit = visits[p.userId];
                                            const accountId = profileAccountId({ id: p.userId });
                                            return <tr key={p.identityKey} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3">
                                                    {accountId ? <Link href={`/dashboard/admin/users/${accountId}`} className="font-bold text-gray-900 truncate max-w-[200px] block hover:text-melagri-primary">{p.name || 'Customer'}</Link> : <div className="font-bold text-gray-900 truncate max-w-[200px]">{p.name || 'Customer'}</div>}
                                                    <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{p.email || p.phone || p.userId.slice(0, 12)}</div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: `${segmentColor(p.segment)}1a`, color: segmentColor(p.segment) }}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: segmentColor(p.segment) }} />
                                                        {p.segment}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-black text-gray-900">{fmtKES(p.totalRevenue)}</td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-700">{p.paidOrderCount}</td>
                                                <td className="px-6 py-3 text-right text-gray-600">{fmtKES(p.avgOrderValue)}</td>
                                                <td className="px-6 py-3 text-right text-gray-600">
                                                    {p.daysSinceLastOrder === 0 ? 'today' : `${p.daysSinceLastOrder}d ago`}
                                                </td>
                                                <td className="px-6 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${contactUser?.cartRecoveryConsent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{contactUser?.cartRecoveryConsent ? 'Recovery allowed' : 'No recovery consent'}</span></td>
                                                <td className="px-6 py-3"><span className="text-xs font-bold text-gray-800">{visit?.lastStep || (visit?.openCart ? 'Before checkout' : 'No checkout recorded')}</span>{visit?.openCart ? <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-amber-700">Open cart</span> : null}{visit?.pathTrail?.length ? <span className="mt-1 block max-w-56 text-[10px] text-gray-400">{visit.pathTrail.join(' → ')}</span> : null}<span className="mt-1 block text-[10px] text-gray-500">{p.paidOrderCount} paid order{p.paidOrderCount === 1 ? '' : 's'}</span></td>
                                                <td className="px-6 py-3"><span className="text-xs font-bold text-gray-700">{reorderDueUserIds.includes(p.userId) ? 'Reorder due' : p.segment === 'At Risk' || p.segment === 'Big Spenders' ? 'Retention review' : p.segment === 'New' ? 'Onboarding' : 'Monitor'}</span><span className="block max-w-48 text-[10px] text-gray-400" title={p.segmentReason}>{p.segmentReason}</span></td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="font-mono text-[10px] font-black text-gray-400">{p.recency}-{p.frequency}-{p.monetary}</span>
                                                </td>
                                            </tr>;
                                        })}
                                        {visible.length === 0 && (
                                            <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400 text-sm">No customers in this segment.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Behavioral Affinities</h2>
                <p className="text-gray-500 text-sm mb-6">Cross-session product affinity from browse + cart events.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {intelligentUsers.map(user => {
                    const totalScore = Object.values(user.affinityIndex || {}).reduce((acc, val) => acc + val, 0);
                    const topCategories = Object.entries(user.affinityIndex || {})
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);
                    const displayName = user.name || 'Customer';
                    const accountId = profileAccountId(user);

                    const intentLevel = totalScore > 50 ? 'High' : totalScore > 20 ? 'Medium' : 'Low';
                    const intentColor = intentLevel === 'High' ? 'text-green-600 bg-green-50' : intentLevel === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50';

                    return (
                        <div key={accountId || displayName} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-xl font-black text-gray-700 shadow-inner group-hover:from-melagri-primary group-hover:to-melagri-secondary group-hover:text-white transition-all duration-500">
                                        {displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
                                        <p className="text-sm text-gray-500">{user.email || user.phone || 'No Contact'}</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${intentColor}`}>
                                    {intentLevel} Intent
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Top Affinities</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {topCategories.map(([cat, score]) => (
                                            <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 group-hover:border-melagri-primary/20 transition-colors">
                                                <span className="text-lg">{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || '📦'}</span>
                                                <span className="text-xs font-bold text-gray-700">{cat}</span>
                                                <span className="text-[10px] font-black text-melagri-primary ml-1">{score}pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-50 flex justify-between items-center text-xs">
                                    <div className="text-gray-400 font-medium italic">
                                        Last Active: {user.lastBehavioralSync ? new Date(user.lastBehavioralSync).toLocaleString() : 'Recently'}
                                    </div>
                                    {accountId ? <Link
                                        href={`/dashboard/admin/users/${accountId}`}
                                        className="text-melagri-primary font-bold hover:underline py-1"
                                    >
                                        Full Profile →
                                    </Link> : <span className="text-xs text-gray-400">No account id</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {intelligentUsers.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Intelligence Data Yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2">The system is currently learning from customer behavior. Check back soon for AI-driven profiles.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
