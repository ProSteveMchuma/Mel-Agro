"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import { db } from "@/lib/firebase";
import { useOrders } from "@/context/OrderContext";
import { DateRange, filterByRange } from "@/lib/analytics-aggregations";
import {
    unmatchedC2BSummary, refundAudit, applyRefundFilter, stuckStkSessions,
    failureBreakdown, paymentKpis, customerLabel,
    type C2bRecord, type RefundRecord, type RefundFilter,
} from "@/lib/payments-intelligence";

const RANGES: Array<{ value: DateRange; label: string }> = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: 'all', label: 'All' },
];

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function Kpi({ label, value, sub, accent = 'text-gray-900', tone = 'neutral' }: {
    label: string; value: string; sub?: string; accent?: string; tone?: 'neutral' | 'warn' | 'danger' | 'good';
}) {
    const ringTone = tone === 'danger' ? 'border-red-200 bg-red-50/50'
        : tone === 'warn' ? 'border-amber-200 bg-amber-50/50'
        : tone === 'good' ? 'border-emerald-200 bg-emerald-50/50'
        : 'border-gray-100 bg-white';
    return (
        <div className={`rounded-2xl p-5 border shadow-sm ${ringTone}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl md:text-3xl font-black ${accent} mt-1 tracking-tighter`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1 font-medium">{sub}</p>}
        </div>
    );
}

function Card({ title, subtitle, children, action }: {
    title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-400 font-medium mt-1">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function refundBadge(status?: string, isStuck?: boolean) {
    if (isStuck) return <span className="px-2 py-1 rounded-md text-[10px] font-black bg-red-100 text-red-700 tracking-tight">STUCK</span>;
    if (status === 'Reversed') return <span className="px-2 py-1 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 tracking-tight">REVERSED</span>;
    if (status === 'Pending') return <span className="px-2 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 tracking-tight">PENDING</span>;
    if (status === 'Failed' || status === 'Timeout') return <span className="px-2 py-1 rounded-md text-[10px] font-black bg-gray-200 text-gray-700 tracking-tight">{status?.toUpperCase()}</span>;
    return null;
}

export default function PaymentsHub() {
    const { orders } = useOrders();
    const [range, setRange] = useState<DateRange>('30d');

    const [c2b, setC2b] = useState<C2bRecord[]>([]);
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [refundFilter, setRefundFilter] = useState<RefundFilter>('all');

    const [linkingFor, setLinkingFor] = useState<C2bRecord | null>(null);
    const [linkSearch, setLinkSearch] = useState('');
    const [linking, setLinking] = useState(false);

    // Live subscription: c2bPayments (most recent 200)
    useEffect(() => {
        const q = query(collection(db, 'c2bPayments'), orderBy('recordedAt', 'desc'), limit(200));
        const unsub = onSnapshot(q,
            snap => setC2b(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
            err => { console.error('c2bPayments listener:', err); },
        );
        return () => unsub();
    }, []);

    // Live subscription: refunds (most recent 100)
    useEffect(() => {
        const q = query(collection(db, 'refunds'), orderBy('initiatedAt', 'desc'), limit(100));
        const unsub = onSnapshot(q,
            snap => setRefunds(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
            err => { console.error('refunds listener:', err); },
        );
        return () => unsub();
    }, []);

    const rangedOrders = useMemo(() => filterByRange(orders, range), [orders, range]);

    const kpis = useMemo(() => paymentKpis({
        rangedOrders, allOrders: orders, c2b, refunds,
    }), [rangedOrders, orders, c2b, refunds]);

    const unmatched = useMemo(() => unmatchedC2BSummary(c2b), [c2b]);
    const refundsOut = useMemo(() => refundAudit(refunds), [refunds]);
    const visibleRefunds = useMemo(() => applyRefundFilter(refundsOut.rows, refundFilter), [refundsOut.rows, refundFilter]);
    const stuck = useMemo(() => stuckStkSessions(orders, 24), [orders]);
    const failures = useMemo(() => failureBreakdown(rangedOrders, range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365), [rangedOrders, range]);

    // Match candidates for the link modal — orders that are NOT yet Paid, sorted by recency.
    // Search by order id prefix or phone or customer name.
    const linkCandidates = useMemo(() => {
        const q = linkSearch.trim().toLowerCase();
        if (!q) {
            return orders
                .filter(o => (o as any).paymentStatus !== 'Paid')
                .slice(0, 20);
        }
        return orders.filter(o => {
            if ((o as any).paymentStatus === 'Paid') return false;
            const a = o as any;
            const hay = [
                o.id, a.userName, a.userEmail, a.phone,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        }).slice(0, 30);
    }, [orders, linkSearch]);

    const performLinkOrIgnore = async (action: 'link' | 'ignore', c2bPaymentId: string, orderId?: string) => {
        setLinking(true);
        try {
            const token = await getAuth().currentUser?.getIdToken();
            const res = await fetch('/api/admin/payments/link-c2b', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ c2bPaymentId, orderId, action }),
            });
            const j = await res.json();
            if (!res.ok || !j.success) {
                toast.error(j.message || 'Action failed');
                return;
            }
            toast.success(action === 'ignore' ? 'Marked as not-an-order' : 'Linked to order');
            setLinkingFor(null);
            setLinkSearch('');
        } catch (e: any) {
            toast.error(e?.message || 'Network error');
        } finally {
            setLinking(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Payments</h1>
                    <p className="text-gray-500 text-sm mt-1">Triage payment records — unmatched Till payments, refund audit, stuck sessions, failure breakdown.</p>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {RANGES.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${range === r.value ? 'bg-melagri-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi label="Revenue" value={fmtKES(kpis.revenuePeriod)} sub={`${kpis.paidCountPeriod} paid orders`} accent="text-melagri-primary" />
                <Kpi label="Failed Payments" value={String(kpis.failedPaymentsPeriod)} sub="In selected period" accent={kpis.failedPaymentsPeriod > 0 ? 'text-red-600' : 'text-gray-900'} tone={kpis.failedPaymentsPeriod > 0 ? 'danger' : 'neutral'} />
                <Kpi label="Refund Rate 7d" value={fmtPct(kpis.refundRate7d)} sub="Always last 7 days" accent={kpis.refundRate7d > 5 ? 'text-red-600' : kpis.refundRate7d > 2 ? 'text-amber-600' : 'text-gray-900'} tone={kpis.refundRate7d > 5 ? 'danger' : kpis.refundRate7d > 2 ? 'warn' : 'neutral'} />
                <Kpi label="Unmatched Till" value={String(kpis.unmatchedC2BCount)} sub={fmtKES(kpis.unmatchedC2BTotal)} accent={kpis.unmatchedC2BCount > 0 ? 'text-amber-600' : 'text-gray-900'} tone={kpis.unmatchedC2BCount > 0 ? 'warn' : 'neutral'} />
                <Kpi label="Stuck STK" value={String(kpis.stuckStkCount)} sub=">24h, no result" accent={kpis.stuckStkCount > 0 ? 'text-amber-600' : 'text-gray-900'} tone={kpis.stuckStkCount > 0 ? 'warn' : 'neutral'} />
                <Kpi label="Stuck Refunds" value={String(kpis.stuckRefundsCount)} sub="Pending >48h" accent={kpis.stuckRefundsCount > 0 ? 'text-red-600' : 'text-gray-900'} tone={kpis.stuckRefundsCount > 0 ? 'danger' : 'neutral'} />
                <Kpi label="Refunds Reversed" value={String(refundsOut.reversedCount)} sub={fmtKES(refundsOut.totalRefundedKes)} accent="text-gray-900" />
                <Kpi label="Refunds Failed" value={String(refundsOut.failedCount)} sub="All-time, last 100" accent={refundsOut.failedCount > 0 ? 'text-red-600' : 'text-gray-900'} tone={refundsOut.failedCount > 0 ? 'danger' : 'neutral'} />
            </div>

            {/* Unmatched C2B */}
            <Card
                title="Unmatched M-Pesa Till payments"
                subtitle="Money received that couldn't be auto-linked to an order. Link manually or mark as not-an-order."
            >
                {unmatched.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">All Till payments are matched. Nothing to triage.</p>
                ) : (
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-2 py-3">Customer</th>
                                    <th className="px-2 py-3">Receipt</th>
                                    <th className="px-2 py-3">Bill Ref</th>
                                    <th className="px-2 py-3 text-right">Amount</th>
                                    <th className="px-2 py-3 text-right">Age</th>
                                    <th className="px-2 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {unmatched.rows.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-2 py-3">
                                            <p className="font-bold text-gray-900 text-sm">{customerLabel(r)}</p>
                                            <p className="text-[11px] text-gray-400 font-medium">{r.phone || '—'}</p>
                                        </td>
                                        <td className="px-2 py-3 font-mono text-xs text-gray-700">{r.transID || '—'}</td>
                                        <td className="px-2 py-3 font-mono text-xs text-gray-500">{r.billRefNumber || '—'}</td>
                                        <td className="px-2 py-3 text-right font-black text-gray-900">{fmtKES(Number(r.amount) || 0)}</td>
                                        <td className="px-2 py-3 text-right text-xs text-gray-500">
                                            {r.recordedAt ? `${Math.floor((Date.now() - new Date(r.recordedAt).getTime()) / (60 * 60 * 1000))}h` : '—'}
                                        </td>
                                        <td className="px-2 py-3 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => { setLinkingFor(r); setLinkSearch(''); }}
                                                className="px-3 py-1.5 bg-melagri-primary text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-melagri-secondary mr-2"
                                            >
                                                Link
                                            </button>
                                            <button
                                                onClick={() => performLinkOrIgnore('ignore', r.id)}
                                                disabled={linking}
                                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50"
                                            >
                                                Ignore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Refund audit + Stuck STK */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                    title="Refund audit trail"
                    subtitle={`${refundsOut.pendingCount} pending · ${refundsOut.stuckCount} stuck >48h`}
                    action={
                        <div className="flex gap-1 flex-wrap">
                            {(['all', 'pending', 'stuck', 'reversed', 'failed'] as RefundFilter[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setRefundFilter(f)}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md ${refundFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    }
                >
                    {visibleRefunds.length === 0 ? (
                        <p className="text-sm text-gray-500">No refunds in this filter.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                            {visibleRefunds.slice(0, 50).map(r => (
                                <li key={r.id} className="py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={r.orderId ? `/dashboard/admin/orders/${r.orderId}` : '#'}
                                                className="font-bold text-gray-900 text-sm hover:text-melagri-primary truncate block"
                                            >
                                                Order #{(r.orderId || '').slice(0, 8) || '—'}
                                            </Link>
                                            <p className="text-[11px] text-gray-500 font-medium">
                                                {r.initiatedByEmail || r.initiatedBy || 'system'} · {r.ageHours}h ago
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-gray-900 text-sm tracking-tight">{fmtKES(Number(r.amount) || 0)}</p>
                                            <div className="mt-1">{refundBadge(r.status, r.isStuck)}</div>
                                        </div>
                                    </div>
                                    {r.failureReason && (
                                        <p className="text-[11px] text-red-600 mt-1 font-medium truncate">{r.failureReason}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card
                    title="Stuck STK sessions"
                    subtitle="Orders with an STK Push fired >24h ago that never resolved"
                >
                    {stuck.length === 0 ? (
                        <p className="text-sm text-gray-500">No stuck STK sessions. All recent prompts resolved.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                            {stuck.slice(0, 30).map(s => (
                                <li key={s.orderId} className="py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={`/dashboard/admin/orders/${s.orderId}`}
                                                className="font-bold text-gray-900 text-sm hover:text-melagri-primary truncate block"
                                            >
                                                {s.userName || s.userEmail || s.phone || `Order ${s.orderId.slice(0, 8)}`}
                                            </Link>
                                            <p className="text-[11px] text-gray-500 font-medium">
                                                #{s.orderId.slice(0, 8)} · {s.paymentStatus || 'Unpaid'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-amber-600 text-sm tracking-tight">{s.hoursSinceOrder}h</p>
                                            <p className="text-[11px] text-gray-500 font-medium">{fmtKES(s.total)}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            {/* Failure breakdown */}
            <Card
                title="Payment failure breakdown"
                subtitle={`Grouped by Daraja result code, last ${range === 'all' ? 365 : range === '7d' ? 7 : range === '30d' ? 30 : 90} days`}
            >
                {failures.length === 0 ? (
                    <p className="text-sm text-gray-500">No failed payments in this period. All STK Pushes resolved successfully.</p>
                ) : (
                    <div className="space-y-3">
                        {failures.map(f => (
                            <div key={f.code} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                    <div>
                                        <p className="font-black text-gray-900 text-sm">Code {f.code}</p>
                                        <p className="text-xs text-gray-500 font-medium">{f.label}</p>
                                    </div>
                                    <p className="text-2xl font-black text-red-600 tracking-tighter">{f.count}</p>
                                </div>
                                {f.recentOrders.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {f.recentOrders.map(o => (
                                            <Link
                                                key={o.id}
                                                href={`/dashboard/admin/orders/${o.id}`}
                                                className="px-2 py-1 text-[11px] font-medium bg-white border border-gray-200 rounded-md hover:border-melagri-primary text-gray-600"
                                            >
                                                #{o.id.slice(0, 6)} · {fmtKES(o.total)}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Link modal */}
            {linkingFor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-4 gap-3">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Link Till payment to order</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    {customerLabel(linkingFor)} · {fmtKES(Number(linkingFor.amount) || 0)} · {linkingFor.transID || '—'}
                                </p>
                            </div>
                            <button onClick={() => setLinkingFor(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search by order ID prefix, phone, name, or email…"
                            value={linkSearch}
                            onChange={(e) => setLinkSearch(e.target.value)}
                            className="w-full px-4 py-3 mb-4 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-sm"
                        />
                        {linkCandidates.length === 0 ? (
                            <p className="text-sm text-gray-500 py-8 text-center">No unpaid orders match.</p>
                        ) : (
                            <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto -mx-2">
                                {linkCandidates.map(o => {
                                    const a = o as any;
                                    return (
                                        <li key={o.id}>
                                            <button
                                                onClick={() => performLinkOrIgnore('link', linkingFor.id, o.id)}
                                                disabled={linking}
                                                className="w-full text-left px-3 py-3 hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-gray-900 text-sm truncate">
                                                            {a.userName || a.userEmail || a.phone || `Order ${o.id.slice(0, 8)}`}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 font-medium">
                                                            #{o.id.slice(0, 8)} · {a.paymentStatus || 'Unpaid'} · {new Date(o.date).toLocaleDateString('en-KE')}
                                                        </p>
                                                    </div>
                                                    <p className="font-black text-gray-900 text-sm tracking-tight">{fmtKES(Number(o.total) || 0)}</p>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
