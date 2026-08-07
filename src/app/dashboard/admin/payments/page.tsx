"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import type { Order } from "@/types";
import type { DateRange } from "@/lib/analytics-aggregations";
import { customerLabel, failureBreakdown, paymentKpis, refundAudit, stuckStkSessions, unmatchedC2BSummary, type C2bRecord, type RefundFilter } from "@/lib/payments-intelligence";

type DashboardData = {
  kpis: ReturnType<typeof paymentKpis>;
  unmatched: ReturnType<typeof unmatchedC2BSummary>;
  refunds: ReturnType<typeof refundAudit>;
  stuck: ReturnType<typeof stuckStkSessions>;
  failures: ReturnType<typeof failureBreakdown>;
  sourceWindow: { orders: number; c2b: number; refunds: number };
};
const ranges: Array<{ value: DateRange; label: string }> = [{ value: "7d", label: "7d" }, { value: "30d", label: "30d" }, { value: "90d", label: "90d" }, { value: "all", label: "All" }];
const fmtKES = (value: number) => `KES ${Math.round(value).toLocaleString()}`;

export default function PaymentsHub() {
  const [range, setRange] = useState<DateRange>("30d");
  const [refundFilter, setRefundFilter] = useState<RefundFilter>("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [linkingFor, setLinkingFor] = useState<C2bRecord | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [candidates, setCandidates] = useState<Order[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true); setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const response = await fetch(`/api/admin/payments?range=${range}&refundFilter=${refundFilter}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load payment operations.");
        setData(result);
      } catch (caught) { if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load payment operations."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [range, refundFilter, refreshKey]);

  useEffect(() => {
    if (!linkingFor) { setCandidates([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCandidateLoading(true);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch(`/api/admin/payments?mode=candidates&q=${encodeURIComponent(linkSearch)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (response.ok) setCandidates(result.candidates || []);
      } catch (caught) { if ((caught as Error).name !== "AbortError") toast.error("Could not search unpaid orders"); }
      finally { if (!controller.signal.aborted) setCandidateLoading(false); }
    }, linkSearch ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [linkingFor, linkSearch]);

  async function reconcile(action: "link" | "ignore", paymentId: string, orderId?: string) {
    if (action === "ignore" && !window.confirm("Mark this payment as unrelated to an order?")) return;
    setLinking(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch("/api/admin/payments/link-c2b", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, c2bPaymentId: paymentId, orderId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Reconciliation failed.");
      toast.success(action === "link" ? "Payment linked to order" : "Payment marked as unrelated");
      setLinkingFor(null); setLinkSearch(""); setRefreshKey((value) => value + 1);
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Reconciliation failed."); }
    finally { setLinking(false); }
  }

  const kpis = data?.kpis;
  return <div className="space-y-6 pb-12">
    <div className="flex flex-wrap items-end justify-between gap-4"><header><p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Financial operations</p><h1 className="text-2xl font-black text-gray-950">Payments & reconciliation</h1><p className="mt-1 text-sm text-gray-500">Triage Till payments, STK failures, and refund outcomes from a secured operational window.</p></header><div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">{ranges.map((item) => <button key={item.value} onClick={() => setRange(item.value)} className={`min-h-10 px-4 text-xs font-black ${range === item.value ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}>{item.label}</button>)}</div></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 font-black underline">Retry</button></div>}
    {loading && !data ? <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-sm font-semibold text-gray-500">Loading payment operations…</div> : data && <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Kpi label="Revenue" value={fmtKES(kpis?.revenuePeriod || 0)} sub={`${kpis?.paidCountPeriod || 0} paid orders`} tone="green"/><Kpi label="Failed payments" value={String(kpis?.failedPaymentsPeriod || 0)} sub="Selected period" tone={(kpis?.failedPaymentsPeriod || 0) > 0 ? "red" : "gray"}/><Kpi label="Unmatched Till" value={String(kpis?.unmatchedC2BCount || 0)} sub={fmtKES(kpis?.unmatchedC2BTotal || 0)} tone={(kpis?.unmatchedC2BCount || 0) > 0 ? "amber" : "gray"}/><Kpi label="Stuck refunds" value={String(kpis?.stuckRefundsCount || 0)} sub="Pending over 48 hours" tone={(kpis?.stuckRefundsCount || 0) > 0 ? "red" : "gray"}/></div>
      <Card title="Unmatched M-Pesa Till payments" subtitle="Money received that could not be linked automatically.">{data.unmatched.rows.length === 0 ? <Empty>All recent Till payments are reconciled.</Empty> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400"><tr><th className="py-3">Customer</th><th>Receipt</th><th>Bill reference</th><th className="text-right">Amount</th><th className="text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{data.unmatched.rows.slice(0, 75).map((record) => <tr key={record.id}><td className="py-3"><p className="font-bold text-gray-900">{customerLabel(record)}</p><p className="text-xs text-gray-400">{record.phone || "No phone"}</p></td><td className="font-mono text-xs">{record.transID || "—"}</td><td className="font-mono text-xs text-gray-500">{record.billRefNumber || "—"}</td><td className="text-right font-black">{fmtKES(Number(record.amount) || 0)}</td><td className="space-x-2 text-right"><button onClick={() => { setLinkingFor(record); setLinkSearch(""); }} className="rounded-lg bg-green-700 px-3 py-2 text-xs font-black text-white">Link</button><button disabled={linking} onClick={() => reconcile("ignore", record.id)} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 disabled:opacity-40">Ignore</button></td></tr>)}</tbody></table></div>}</Card>
      <div className="grid gap-6 lg:grid-cols-2"><Card title="Refund audit trail" subtitle={`${data.refunds.pendingCount} pending · ${data.refunds.stuckCount} stuck`} action={<div className="flex flex-wrap gap-1">{(["all", "pending", "stuck", "reversed", "failed"] as RefundFilter[]).map((filter) => <button key={filter} onClick={() => setRefundFilter(filter)} className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${refundFilter === filter ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>{filter}</button>)}</div>}>{data.refunds.rows.length === 0 ? <Empty>No refunds in this filter.</Empty> : <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">{data.refunds.rows.map((record) => <li key={record.id} className="flex items-center justify-between gap-3 py-3"><div><Link href={record.orderId ? `/dashboard/admin/orders/${record.orderId}` : "#"} className="font-bold text-gray-900 hover:text-green-700">Order #{record.orderId?.slice(0, 8) || "—"}</Link><p className="text-xs text-gray-500">{record.initiatedByEmail || record.initiatedBy || "System"} · {record.ageHours}h ago</p>{record.failureReason && <p className="mt-1 text-xs text-red-600">{record.failureReason}</p>}</div><div className="text-right"><p className="font-black">{fmtKES(Number(record.amount) || 0)}</p><StatusBadge status={record.status} stuck={record.isStuck}/></div></li>)}</ul>}</Card>
      <Card title="Stuck STK sessions" subtitle="Prompts unresolved for more than 24 hours">{data.stuck.length === 0 ? <Empty>No stuck STK sessions.</Empty> : <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">{data.stuck.map((session) => <li key={session.orderId} className="flex items-center justify-between py-3"><div><Link href={`/dashboard/admin/orders/${session.orderId}`} className="font-bold text-gray-900 hover:text-green-700">{session.userName || session.userEmail || session.phone || `Order ${session.orderId.slice(0, 8)}`}</Link><p className="text-xs text-gray-500">#{session.orderId.slice(0, 8)} · {session.paymentStatus || "Unpaid"}</p></div><div className="text-right"><p className="font-black text-amber-600">{session.hoursSinceOrder}h</p><p className="text-xs text-gray-500">{fmtKES(session.total)}</p></div></li>)}</ul>}</Card></div>
      <Card title="Payment failure breakdown" subtitle={`Grouped by provider result code for ${range === "all" ? "the bounded history" : range}`}>{data.failures.length === 0 ? <Empty>No failed payments in this period.</Empty> : <div className="grid gap-3 md:grid-cols-2">{data.failures.map((failure) => <div key={failure.code} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex justify-between gap-3"><div><p className="font-black text-gray-900">Code {failure.code}</p><p className="text-xs text-gray-500">{failure.label}</p></div><p className="text-2xl font-black text-red-600">{failure.count}</p></div><div className="mt-3 flex flex-wrap gap-2">{failure.recentOrders.map((order) => <Link key={order.id} href={`/dashboard/admin/orders/${order.id}`} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">#{order.id.slice(0, 6)} · {fmtKES(order.total)}</Link>)}</div></div>)}</div>}</Card>
      <p className="text-xs text-gray-400">Operational window: {data.sourceWindow.orders} orders · {data.sourceWindow.c2b} Till records · {data.sourceWindow.refunds} refunds.</p>
    </>}
    {linkingFor && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"><div className="flex justify-between gap-3"><div><h2 className="text-xl font-black">Link Till payment to order</h2><p className="mt-1 text-xs text-gray-500">{customerLabel(linkingFor)} · {fmtKES(Number(linkingFor.amount) || 0)} · {linkingFor.transID || "No receipt"}</p></div><button onClick={() => setLinkingFor(null)} className="h-10 w-10 rounded-full bg-gray-100 font-black">×</button></div><input autoFocus value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} placeholder="Search unpaid order, phone, name or email" className="my-4 min-h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-green-600"/>{candidateLoading ? <Empty>Searching unpaid orders…</Empty> : candidates.length === 0 ? <Empty>No unpaid orders match.</Empty> : <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">{candidates.map((order) => <li key={order.id}><button disabled={linking} onClick={() => reconcile("link", linkingFor.id, order.id)} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 disabled:opacity-50"><div><p className="font-bold text-gray-900">{order.userName || order.userEmail || order.phone || `Order ${order.id.slice(0, 8)}`}</p><p className="text-xs text-gray-500">#{order.id.slice(0, 8)} · {order.paymentStatus || "Unpaid"}</p></div><p className="font-black">{fmtKES(Number(order.total) || 0)}</p></button></li>)}</ul>}</div></div>}
  </div>;
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "green" | "red" | "amber" | "gray" }) { const colors = { green: "text-green-700", red: "text-red-600", amber: "text-amber-600", gray: "text-gray-900" }; return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p><p className={`mt-1 text-2xl font-black ${colors[tone]}`}>{value}</p><p className="mt-1 text-xs text-gray-500">{sub}</p></div>; }
function Card({ title, subtitle, children, action }: { title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }) { return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-wider text-gray-900">{title}</h2><p className="mt-1 text-xs text-gray-400">{subtitle}</p></div>{action}</div>{children}</section>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-8 text-center text-sm text-gray-500">{children}</p>; }
function StatusBadge({ status, stuck }: { status?: string; stuck?: boolean }) { const value = stuck ? "Stuck" : status || "Unknown"; const color = stuck || status === "Failed" || status === "Timeout" ? "bg-red-50 text-red-700" : status === "Reversed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"; return <span className={`mt-1 inline-flex rounded-md px-2 py-1 text-[10px] font-black uppercase ${color}`}>{value}</span>; }
