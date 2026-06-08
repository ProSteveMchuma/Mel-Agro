"use client";
import { useEffect, useMemo, useState } from "react";
import { useUsers } from "@/context/UserContext";
import { useOrders } from "@/context/OrderContext";
import { CATEGORY_ICONS } from "@/components/SidebarCategories";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildCustomerProfiles, summariseSegments, computeIntelKPIs, segmentColor, segmentDescription, Segment, CustomerProfile } from "@/lib/customer-intelligence";

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export default function IntelligencePage() {
    const { users } = useUsers();
    const { orders } = useOrders();
    const [cartCount, setCartCount] = useState<number | null>(null);
    const [activeSegment, setActiveSegment] = useState<Segment | 'all'>('all');
    const [tableSort, setTableSort] = useState<'ltv' | 'frequency' | 'recency'>('ltv');

    const profiles = useMemo(() => buildCustomerProfiles(orders), [orders]);
    const segments = useMemo(() => summariseSegments(profiles), [profiles]);
    const kpis = useMemo(() => computeIntelKPIs(profiles), [profiles]);

    const filtered = useMemo(() => {
        const list = activeSegment === 'all' ? profiles : profiles.filter(p => p.segment === activeSegment);
        if (tableSort === 'ltv') return [...list].sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (tableSort === 'frequency') return [...list].sort((a, b) => b.paidOrderCount - a.paidOrderCount);
        return [...list].sort((a, b) => a.daysSinceLastOrder - b.daysSinceLastOrder);
    }, [profiles, activeSegment, tableSort]);

    const visible = filtered.slice(0, 50);

    useEffect(() => {
        getDocs(collection(db, 'carts'))
            .then(snap => setCartCount(snap.size))
            .catch(() => setCartCount(null));
    }, []);

    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => (o as any).paymentStatus === 'Paid').length;
    const ordersWithPayment = orders.filter(o => (o as any).paymentMethod).length;
    const cartViewed = cartCount ?? users.length;

    const pct = (n: number) => cartViewed > 0 ? `${Math.round((n / cartViewed) * 100)}%` : '—';

    const funnelSteps = [
        { label: 'Cart Started', count: cartViewed, conversion: '100%', color: 'bg-blue-500' },
        { label: 'Shipping Info', count: totalOrders, conversion: pct(totalOrders), color: 'bg-indigo-500' },
        { label: 'Payment Method', count: ordersWithPayment, conversion: pct(ordersWithPayment), color: 'bg-purple-500' },
        { label: 'Order Paid', count: paidOrders, conversion: pct(paidOrders), color: 'bg-melagri-primary' },
    ];

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
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Prophet: Behavioral Intelligence</h1>
                    <p className="text-gray-500 mt-1">Real-time demand forecasting and bottleneck analysis.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-melagri-primary/10 text-melagri-primary text-xs font-black rounded-xl uppercase tracking-widest border border-melagri-primary/20">
                        {intelligentUsers.length} Predictive Profiles
                    </span>
                </div>
            </div>

            {/* CONVERSION FUNNEL VISUALIZATION */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <Link href="/dashboard/admin/intelligence/abandoned-carts" className="group">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight group-hover:text-melagri-primary transition-colors">Checkout Conversion Funnel</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Live Drop-off Tracking • <span className="text-melagri-primary">Recover Sales →</span></p>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    {funnelSteps.map((step, i) => (
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
                            {i < 3 && (
                                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 bg-gray-100 rotate-45 border-t border-r border-gray-200"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* CUSTOMER INTELLIGENCE — RFM segments + LTV */}
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Intelligence</h2>
                    <p className="text-gray-500 text-sm mt-1">RFM segmentation across {kpis.totalCustomers.toLocaleString()} paying customer{kpis.totalCustomers === 1 ? '' : 's'}.</p>
                </div>

                {kpis.totalCustomers === 0 ? (
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
                                            <th className="text-right px-6 py-3">RFM</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {visible.map(p => (
                                            <tr key={p.userId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="font-bold text-gray-900 truncate max-w-[200px]">{p.name || 'Anonymous'}</div>
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
                                                <td className="px-6 py-3 text-right">
                                                    <span className="font-mono text-[10px] font-black text-gray-400">{p.recency}-{p.frequency}-{p.monetary}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {visible.length === 0 && (
                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">No customers in this segment.</td></tr>
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

                    const intentLevel = totalScore > 50 ? 'High' : totalScore > 20 ? 'Medium' : 'Low';
                    const intentColor = intentLevel === 'High' ? 'text-green-600 bg-green-50' : intentLevel === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50';

                    return (
                        <div key={user.uid} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-xl font-black text-gray-700 shadow-inner group-hover:from-melagri-primary group-hover:to-melagri-secondary group-hover:text-white transition-all duration-500">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
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
                                    <Link
                                        href={`/dashboard/admin/users/${user.uid}`}
                                        className="text-melagri-primary font-bold hover:underline py-1"
                                    >
                                        Full Profile →
                                    </Link>
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
