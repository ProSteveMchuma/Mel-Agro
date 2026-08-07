"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import type { Order } from "@/types";

type Stats = { processing: number; shipped: number; stockAlerts: number };

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stats, setStats] = useState<Stats>({ processing: 0, shipped: 0, stockAlerts: 0 });
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (status !== "all") params.set("status", status);
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/fulfillment?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load fulfillment queue.");
        setOrders(result.orders || []); setNextCursor(result.nextCursor || null); setStats(result.stats || { processing: 0, shipped: 0, stockAlerts: 0 }); setSearchLimited(Boolean(result.searchLimited));
        setSelectedOrder((current) => current ? (result.orders || []).find((order: Order) => order.id === current.id) || null : null);
      } catch (caught) { if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load fulfillment queue."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, search ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, status, cursor, refreshKey]);

  function resetPage() { setCursor(null); setHistory([]); setSelectedOrder(null); }
  async function mutate(body: Record<string, unknown>) {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error("Admin session is unavailable.");
    const response = await fetch("/api/admin/fulfillment", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Fulfillment update failed.");
  }
  async function moveOrder(order: Order, next: "Shipped" | "Delivered") {
    if (next === "Delivered" && !window.confirm("Confirm that this order has been delivered to the customer?")) return;
    setPending(true); const notice = toast.loading(next === "Shipped" ? "Marking order as shipped…" : "Confirming delivery…");
    try { await mutate({ action: "status", orderId: order.id, status: next }); toast.success(next === "Shipped" ? "Order marked as shipped" : "Delivery confirmed", { id: notice }); setSelectedOrder(null); setRefreshKey((value) => value + 1); }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Could not update order", { id: notice }); }
    finally { setPending(false); }
  }

  return <div className="space-y-6 pb-24 lg:pb-0">
    <header><p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Order operations</p><h1 className="text-2xl font-black text-gray-950">Fulfillment queue</h1><p className="mt-1 text-sm text-gray-500">Move paid orders through dispatch and delivery with an audited workflow.</p></header>
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Processing" value={stats.processing} tone="blue"/><StatCard label="In transit" value={stats.shipped} tone="green"/><StatCard label="Stock alerts" value={stats.stockAlerts} tone="red"/></div>
    <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row"><label className="relative flex-1"><span className="sr-only">Search queue</span><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Order, customer, phone or county" className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }} className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold"><option value="all">All fulfillment stages</option><option value="Processing">Processing</option><option value="Shipped">Shipped</option></select></section>
    {searchLimited && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">This search checked the next 600 orders. Use an order number, customer, phone, or county for a narrower match.</p>}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 font-black underline">Retry</button></div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <section className="space-y-3">{loading ? <QueueMessage>Loading paid orders…</QueueMessage> : orders.length === 0 && !error ? <QueueMessage>No paid orders are waiting in this stage.</QueueMessage> : orders.map((order) => <button key={order.id} type="button" onClick={() => setSelectedOrder(order)} className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition ${selectedOrder?.id === order.id ? "border-green-600 ring-2 ring-green-600/10" : "border-gray-200 hover:border-gray-300"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-gray-950">Order #{order.id.slice(0, 8)}</p><p className="mt-1 text-xs text-gray-500">{order.userName || order.userEmail || order.phone || "Guest customer"} · {new Date(order.date).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${order.status === "Processing" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{order.status}</span></div><p className="mt-3 text-sm text-gray-600">{order.shippingAddress?.county || "No county"} · {order.shippingAddress?.details || "No delivery address"}</p><div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3"><div className="flex -space-x-2">{order.items.slice(0, 3).map((item, index) => <span key={`${item.id}-${index}`} className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold">{item.image ? <Image src={item.image} alt="" fill className="object-cover"/> : item.name?.[0] || "?"}</span>)}</div><span className="font-black text-gray-950">KES {Number(order.total || 0).toLocaleString()}</span></div></button>)}
        {!loading && orders.length > 0 && <footer className="flex items-center justify-between pt-2 text-sm text-gray-500"><span>Page {history.length + 1} · {orders.length} orders</span><div className="flex gap-2"><button disabled={history.length === 0} onClick={() => setHistory((current) => { const copy = [...current]; setCursor(copy.pop() ?? null); setSelectedOrder(null); return copy; })} className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 font-bold disabled:opacity-40">Previous</button><button disabled={!nextCursor} onClick={() => { if (nextCursor) { setHistory((current) => [...current, cursor]); setCursor(nextCursor); setSelectedOrder(null); } }} className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 font-bold disabled:opacity-40">Next</button></div></footer>}
      </section>
      <aside>{selectedOrder ? <div className="sticky top-24 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black text-gray-950">Fulfillment actions</h2><Link href={`/dashboard/admin/orders/${selectedOrder.id}`} className="text-xs font-black text-green-700 hover:underline">Full details</Link></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-gray-400">Required next step</p><button type="button" disabled={pending} onClick={() => moveOrder(selectedOrder, selectedOrder.status === "Processing" ? "Shipped" : "Delivered")} className="mt-3 min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50">{selectedOrder.status === "Processing" ? "Mark as shipped" : "Confirm delivered"}</button><p className="mt-2 text-xs text-gray-500">Paid-order cancellation and refunds must be handled from the full order screen.</p></div><div className="grid grid-cols-2 gap-2"><Link href={`/orders/${selectedOrder.id}/delivery-note`} className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold hover:bg-gray-50">Packing slip</Link><Link href={`/orders/${selectedOrder.id}/invoice`} className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold hover:bg-gray-50">Invoice</Link></div><InternalNotes order={selectedOrder} mutate={mutate} onSaved={(note) => setSelectedOrder((current) => current ? { ...current, internalNotes: note, internalHistory: [...(current.internalHistory || []), { date: new Date().toISOString(), note, author: "Current admin" }] } : current)}/></div> : <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">Select an order to see its next action.</div>}</aside>
    </div>
  </div>;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "red" }) { const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-700" }; return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-gray-500">{label}</p><p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${colors[tone]}`}>{value}</p></div>; }
function QueueMessage({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-14 text-center text-sm font-semibold text-gray-500">{children}</div>; }
function InternalNotes({ order, mutate, onSaved }: { order: Order; mutate: (body: Record<string, unknown>) => Promise<void>; onSaved: (note: string) => void }) {
  const [note, setNote] = useState(order.internalNotes || ""); const [saving, setSaving] = useState(false);
  useEffect(() => setNote(order.internalNotes || ""), [order.id, order.internalNotes]);
  async function save() { setSaving(true); try { await mutate({ action: "note", orderId: order.id, note }); onSaved(note); toast.success("Internal note saved"); } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Could not save note"); } finally { setSaving(false); } }
  return <div className="border-t border-gray-100 pt-4"><label className="text-xs font-black uppercase tracking-wider text-gray-400">Internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className="mt-2 min-h-24 w-full rounded-xl border border-gray-200 p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-green-600" placeholder="Dispatch instructions or blocker…"/></label><button type="button" disabled={saving || !note.trim() || note === (order.internalNotes || "")} onClick={save} className="mt-2 min-h-10 w-full rounded-lg bg-gray-100 text-xs font-black text-gray-700 disabled:opacity-40">{saving ? "Saving…" : "Save note"}</button>{(order.internalHistory || []).length > 0 && <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">{[...(order.internalHistory || [])].reverse().slice(0, 10).map((entry, index) => <div key={`${entry.date}-${index}`} className="rounded-lg bg-gray-50 p-2 text-xs"><p className="font-bold text-gray-700">{entry.author} · {new Date(entry.date).toLocaleDateString()}</p><p className="mt-1 text-gray-500">{entry.note}</p></div>)}</div>}</div>;
}
