"use client";
import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useOrders } from "@/context/OrderContext";
import { useProducts } from "@/context/ProductContext";
import {
    stockOutForecast, demandSpikes, paymentFailureClusters, refundWatch, slaBreaches, computeAlertKPIs,
    type StockAlert,
} from "@/lib/operational-alerts";

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

function Card({ title, subtitle, children, className = '', action }: {
    title: string; subtitle?: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
    return (
        <div className={`bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm ${className}`}>
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

function severityBadge(s: StockAlert['severity']) {
    const map = {
        out: { bg: 'bg-red-100 text-red-700', label: 'OUT OF STOCK' },
        critical: { bg: 'bg-red-100 text-red-700', label: 'CRITICAL' },
        low: { bg: 'bg-amber-100 text-amber-700', label: 'LOW' },
        ok: { bg: 'bg-emerald-100 text-emerald-700', label: 'OK' },
    } as const;
    const cfg = map[s];
    return <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-tight ${cfg.bg}`}>{cfg.label}</span>;
}

export default function OperationsPage() {
    const { orders } = useOrders();
    const { products } = useProducts();

    const stockAlerts = useMemo(() => stockOutForecast(orders, products, 30), [orders, products]);
    const spikes = useMemo(() => demandSpikes(orders, products), [orders, products]);
    const failures = useMemo(() => paymentFailureClusters(orders), [orders]);
    const refund = useMemo(() => refundWatch(orders), [orders]);
    const sla = useMemo(() => slaBreaches(orders, 48), [orders]);

    const kpis = useMemo(() => computeAlertKPIs(stockAlerts, spikes, failures, refund, sla), [stockAlerts, spikes, failures, refund, sla]);

    const stockNeedingAttention = useMemo(() => stockAlerts
        .filter(s => s.severity !== 'ok')
        .sort((a, b) => {
            const order = { out: 0, critical: 1, low: 2, ok: 3 } as const;
            if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
            return a.daysOfCover - b.daysOfCover;
        }), [stockAlerts]);

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Operations Alerts</h1>
                <p className="text-gray-500 text-sm mt-1">Real-time signals — stock-outs, demand spikes, payment health, refunds, SLA breaches.</p>
            </div>

            {kpis.totalOpenAlerts === 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-900">
                    <p className="font-black text-sm uppercase tracking-tight">All systems healthy</p>
                    <p className="text-xs text-emerald-800 mt-1">No open alerts. Stock levels are comfortable, payments are clearing, fulfillment is on track.</p>
                </div>
            )}

            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi
                    label="Open Alerts"
                    value={String(kpis.totalOpenAlerts)}
                    sub="Requires attention"
                    accent={kpis.totalOpenAlerts > 0 ? 'text-red-600' : 'text-emerald-600'}
                    tone={kpis.totalOpenAlerts > 0 ? 'danger' : 'good'}
                />
                <Kpi
                    label="Out / Critical"
                    value={String(kpis.outOfStock + kpis.criticalStock)}
                    sub={`${kpis.outOfStock} out · ${kpis.criticalStock} critical`}
                    accent={kpis.outOfStock + kpis.criticalStock > 0 ? 'text-red-600' : 'text-gray-900'}
                    tone={kpis.outOfStock + kpis.criticalStock > 0 ? 'danger' : 'neutral'}
                />
                <Kpi
                    label="Demand Spikes"
                    value={String(kpis.spikingProducts)}
                    sub="≥2× baseline"
                    accent="text-purple-600"
                    tone={kpis.spikingProducts > 0 ? 'warn' : 'neutral'}
                />
                <Kpi
                    label="Failed Payments 24h"
                    value={String(kpis.failedPayments24h)}
                    sub="Across all methods"
                    accent={kpis.failedPayments24h > 0 ? 'text-red-600' : 'text-gray-900'}
                    tone={kpis.failedPayments24h > 0 ? 'danger' : 'neutral'}
                />
                <Kpi
                    label="Low Stock"
                    value={String(kpis.lowStock)}
                    sub="≤7 days cover"
                    accent={kpis.lowStock > 0 ? 'text-amber-600' : 'text-gray-900'}
                    tone={kpis.lowStock > 0 ? 'warn' : 'neutral'}
                />
                <Kpi
                    label="Refund Rate 7d"
                    value={fmtPct(kpis.refundRate7d)}
                    sub={fmtKES(refund.refundedRevenue7d)}
                    accent={kpis.refundRate7d > 5 ? 'text-red-600' : kpis.refundRate7d > 2 ? 'text-amber-600' : 'text-gray-900'}
                    tone={kpis.refundRate7d > 5 ? 'danger' : kpis.refundRate7d > 2 ? 'warn' : 'neutral'}
                />
                <Kpi
                    label="SLA Breaches"
                    value={String(kpis.slaBreaches)}
                    sub=">48h in Processing"
                    accent={kpis.slaBreaches > 0 ? 'text-red-600' : 'text-gray-900'}
                    tone={kpis.slaBreaches > 0 ? 'danger' : 'neutral'}
                />
                <Kpi
                    label="Refund Rate 30d"
                    value={fmtPct(refund.refundRate30d)}
                    sub={fmtKES(refund.refundedRevenue30d)}
                    accent="text-gray-900"
                />
            </div>

            {/* Stock alerts */}
            <Card
                title="Stock-out Forecast"
                subtitle="Days-of-cover based on last 30 days of velocity"
                action={
                    <Link href="/dashboard/admin/inventory" className="text-xs font-black uppercase tracking-widest text-melagri-primary hover:underline">
                        Open inventory →
                    </Link>
                }
            >
                {stockNeedingAttention.length === 0 ? (
                    <p className="text-sm text-gray-500">No products are running low. All stock levels are healthy.</p>
                ) : (
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-2 py-3">Product</th>
                                    <th className="px-2 py-3">Severity</th>
                                    <th className="px-2 py-3 text-right">In Stock</th>
                                    <th className="px-2 py-3 text-right">Velocity / day</th>
                                    <th className="px-2 py-3 text-right">Days Cover</th>
                                    <th className="px-2 py-3 text-right">30d Units</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stockNeedingAttention.slice(0, 25).map(s => (
                                    <tr key={String(s.productId)} className="hover:bg-gray-50">
                                        <td className="px-2 py-3">
                                            <div className="flex items-center gap-3">
                                                {s.image && (
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                        <Image src={s.image} alt={s.name} fill sizes="40px" className="object-cover" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                                                    {s.category && <p className="text-[11px] text-gray-400 font-medium">{s.category}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3">{severityBadge(s.severity)}</td>
                                        <td className="px-2 py-3 text-right font-bold text-gray-900">{s.stockQuantity}</td>
                                        <td className="px-2 py-3 text-right font-mono text-gray-700">{s.dailyVelocity.toFixed(2)}</td>
                                        <td className="px-2 py-3 text-right font-bold text-gray-900">
                                            {Number.isFinite(s.daysOfCover) ? s.daysOfCover.toFixed(1) : '∞'}
                                        </td>
                                        <td className="px-2 py-3 text-right text-gray-700">{s.last30dUnits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Demand spikes + Payment health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Demand Spikes" subtitle="Products selling ≥2× faster than 14d baseline (last 3 days)">
                    {spikes.length === 0 ? (
                        <p className="text-sm text-gray-500">No demand spikes detected. Sales are running at typical pace.</p>
                    ) : (
                        <div className="space-y-3">
                            {spikes.slice(0, 8).map(s => (
                                <div key={String(s.productId)} className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50/30">
                                    {s.image && (
                                        <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0 relative">
                                            <Image src={s.image} alt={s.name} fill sizes="48px" className="object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm truncate">{s.name}</p>
                                        <p className="text-[11px] text-gray-500 font-medium">
                                            {s.recentDailyVelocity}/day now vs {s.baselineDailyVelocity}/day baseline · {s.recentUnits} units in 3d
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-purple-600 tracking-tighter">
                                            {Number.isFinite(s.multiplier) ? `${s.multiplier}×` : 'NEW'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                            {Number.isFinite(s.daysOfCoverAtRecentVelocity) ? `${s.daysOfCoverAtRecentVelocity}d cover` : 'no stock'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Payment Health" subtitle="Failure rate by method (last 24h / 7d)">
                    {failures.length === 0 ? (
                        <p className="text-sm text-gray-500">No payment activity in the last 7 days.</p>
                    ) : (
                        <div className="space-y-3">
                            {failures.map(f => {
                                const tone24h = f.failureRate24h > 30 ? 'text-red-600' : f.failureRate24h > 10 ? 'text-amber-600' : 'text-emerald-600';
                                const tone7d = f.failureRate7d > 30 ? 'text-red-600' : f.failureRate7d > 10 ? 'text-amber-600' : 'text-emerald-600';
                                return (
                                    <div key={f.method} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-black text-gray-900 text-sm">{f.method}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">
                                                {f.paid7d + f.failed7d} attempts · 7d
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">24h</p>
                                                <p className={`text-lg font-black ${tone24h} tracking-tighter`}>
                                                    {f.failed24h} failed · {fmtPct(f.failureRate24h)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">7d</p>
                                                <p className={`text-lg font-black ${tone7d} tracking-tighter`}>
                                                    {f.failed7d} failed · {fmtPct(f.failureRate7d)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* Refund watch + SLA breaches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Refund Watch" subtitle="Top refunded products in the last 30 days">
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">7-day rate</p>
                            <p className={`text-2xl font-black tracking-tighter ${refund.refundRate7d > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                {fmtPct(refund.refundRate7d)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1 font-medium">{fmtKES(refund.refundedRevenue7d)} refunded</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">30-day rate</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tighter">{fmtPct(refund.refundRate30d)}</p>
                            <p className="text-[11px] text-gray-500 mt-1 font-medium">{fmtKES(refund.refundedRevenue30d)} refunded</p>
                        </div>
                    </div>
                    {refund.topRefundedProducts.length === 0 ? (
                        <p className="text-sm text-gray-500">No refunds in the last 30 days. Quality is holding up.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {refund.topRefundedProducts.map(p => (
                                <li key={String(p.productId)} className="py-3 flex items-center gap-3">
                                    {p.image && (
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            <Image src={p.image} alt={p.name} fill sizes="40px" className="object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                                        <p className="text-[11px] text-gray-500 font-medium">{p.refundCount} units refunded</p>
                                    </div>
                                    <p className="font-black text-red-600 text-sm tracking-tight">{fmtKES(p.refundRevenue)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card
                    title="SLA Breaches"
                    subtitle=">48h in Processing — fulfillment overdue"
                    action={
                        <Link href="/dashboard/admin/orders" className="text-xs font-black uppercase tracking-widest text-melagri-primary hover:underline">
                            All orders →
                        </Link>
                    }
                >
                    {sla.length === 0 ? (
                        <p className="text-sm text-gray-500">No SLA breaches. All paid orders are within fulfillment window.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                            {sla.slice(0, 20).map(b => (
                                <li key={b.orderId} className="py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={`/dashboard/admin/orders/${b.orderId}`}
                                                className="font-bold text-gray-900 text-sm hover:text-melagri-primary truncate block"
                                            >
                                                {b.userName || b.userEmail || b.phone || `Order ${b.orderId.slice(0, 8)}`}
                                            </Link>
                                            <p className="text-[11px] text-gray-500 font-medium">
                                                {b.county || 'No county'} · #{b.orderId.slice(0, 8)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-red-600 text-sm tracking-tight">{b.hoursSinceOrder}h</p>
                                            <p className="text-[11px] text-gray-500 font-medium">{fmtKES(b.total)}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}
