"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useOrders } from "@/context/OrderContext";
import type { Order } from "@/types";

type OrderStatus = Order["status"];
type ViewId = "all" | "attention" | "unfulfilled" | "unpaid" | "completed";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

const PAGE_SIZE = 20;
const statuses: OrderStatus[] = ["Pending Payment", "Processing", "Shipped", "Delivered", "Cancelled"];
const views: Array<{ id: ViewId; label: string; predicate: (order: Order) => boolean }> = [
  { id: "all", label: "All orders", predicate: () => true },
  { id: "attention", label: "Needs attention", predicate: (order) => order.status === "Pending Payment" || order.paymentStatus === "Failed" },
  { id: "unfulfilled", label: "Unfulfilled", predicate: (order) => order.status === "Processing" },
  { id: "unpaid", label: "Unpaid", predicate: (order) => order.paymentStatus !== "Paid" },
  { id: "completed", label: "Completed", predicate: (order) => order.status === "Delivered" },
];

const statusStyle: Record<OrderStatus, string> = {
  "Pending Payment": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Processing: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Cancelled: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function OrderManagement() {
  const { orders, updateOrderStatus } = useOrders();
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewId>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrderStatus>("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("Processing");
  const [updating, setUpdating] = useState(false);

  const counts = useMemo(() => Object.fromEntries(views.map((view) => [view.id, orders.filter(view.predicate).length])), [orders]);
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const view = views.find((item) => item.id === activeView) || views[0];
    return orders
      .filter(view.predicate)
      .filter((order) => !query || [order.id, order.userId, order.userName, order.userEmail, order.phone, order.transactionId].some((value) => String(value || "").toLowerCase().includes(query)))
      .filter((order) => statusFilter === "All" || order.status === statusFilter)
      .filter((order) => paymentFilter === "All" || (paymentFilter === "Unpaid" ? order.paymentStatus !== "Paid" : order.paymentStatus === paymentFilter))
      .sort((a, b) => sort === "newest" ? Date.parse(b.date) - Date.parse(a.date) : sort === "oldest" ? Date.parse(a.date) - Date.parse(b.date) : sort === "highest" ? b.total - a.total : a.total - b.total);
  }, [orders, activeView, searchTerm, statusFilter, paymentFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every((order) => selected.has(order.id));

  function resetPage() { setPage(1); setSelected(new Set()); }
  function chooseView(id: ViewId) { setActiveView(id); setStatusFilter("All"); setPaymentFilter("All"); resetPage(); }
  function toggleOrder(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleVisible() { setSelected((current) => { const next = new Set(current); visibleOrders.forEach((order) => allVisibleSelected ? next.delete(order.id) : next.add(order.id)); return next; }); }

  async function changeStatus(orderId: string, next: OrderStatus) {
    try { await updateOrderStatus(orderId, next); toast.success(`Order moved to ${next}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update status"); }
  }

  async function applyBulkStatus() {
    if (!selected.size || updating) return;
    const ids = [...selected];
    const consequence = bulkStatus === "Cancelled" ? " This cancels the orders and restores reserved stock; it does not automatically reverse completed payments." : " Customer notifications may be sent for each status change.";
    if (!window.confirm(`Move ${ids.length} selected order${ids.length === 1 ? "" : "s"} to ${bulkStatus}?${consequence}`)) return;
    setUpdating(true);
    const results = await Promise.allSettled(ids.map((id) => updateOrderStatus(id, bulkStatus)));
    const failures = results.filter((result) => result.status === "rejected").length;
    setUpdating(false);
    if (failures) toast.error(`${ids.length - failures} updated; ${failures} failed.`);
    else toast.success(`${ids.length} orders moved to ${bulkStatus}.`);
    setSelected(new Set());
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Commerce operations</p><h1 className="text-2xl font-black tracking-tight text-gray-950">Orders</h1><p className="mt-1 text-sm text-gray-500">Find, fulfil and resolve orders from one queue.</p></div>
      <Link href="/dashboard/admin/orders/create" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2"><span className="text-lg" aria-hidden="true">+</span>Create order</Link>
    </header>

    <section aria-label="Saved order views" className="overflow-x-auto rounded-2xl border border-gray-200 bg-white px-2 shadow-sm">
      <div className="flex min-w-max gap-1" role="tablist">{views.map((view) => <button key={view.id} type="button" role="tab" aria-selected={activeView === view.id} onClick={() => chooseView(view.id)} className={`relative min-h-12 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${activeView === view.id ? "text-green-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-green-600" : "text-gray-500 hover:text-gray-900"}`}>{view.label}<span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{counts[view.id] || 0}</span></button>)}</div>
    </section>

    <section className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm max-md:[&>.overflow-x-auto]:hidden [&>footer]:order-4">
      <div className="order-3 divide-y divide-gray-100 md:hidden">{visibleOrders.map((order) => <article key={order.id} className={`p-4 ${selected.has(order.id) ? "bg-green-50/60" : "bg-white"}`}><div className="flex items-start gap-3"><input type="checkbox" aria-label={`Select order ${order.id}`} checked={selected.has(order.id)} onChange={() => toggleOrder(order.id)} className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-green-700 focus:ring-green-600" /><Link href={`/dashboard/admin/orders/${order.id}`} className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="font-black text-gray-950">#{order.id.slice(0, 10)}</span><span className="font-black text-gray-950">KES {order.total.toLocaleString()}</span></span><span className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-500"><span className="truncate">{order.userName || order.phone || "Guest customer"}</span><span className="shrink-0">{new Date(order.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span></span></Link></div><div className="mt-4 grid grid-cols-2 gap-2"><span className={`inline-flex min-h-11 items-center justify-center rounded-xl px-2 text-[10px] font-black uppercase ring-1 ring-inset ${order.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : order.paymentStatus === "Failed" ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-gray-100 text-gray-600 ring-gray-500/20"}`}>{order.paymentStatus || "Unpaid"}</span><select aria-label={`Status for order ${order.id}`} value={order.status} onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)} className={`min-h-11 rounded-xl border-0 px-2 text-xs font-bold ring-1 ring-inset focus:ring-2 focus:ring-green-600 ${statusStyle[order.status]}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"><span className="text-xs text-gray-400">{order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}</span><div className="flex gap-1"><Link href={`/orders/${order.id}/receipt`} className="min-h-11 rounded-lg px-3 py-3 text-xs font-bold text-gray-600">Receipt</Link><Link href={`/dashboard/admin/orders/${order.id}`} className="min-h-11 rounded-lg bg-gray-950 px-3 py-3 text-xs font-bold text-white">Open</Link></div></div></article>)}</div>
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Search orders</span><svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); resetPage(); }} placeholder="Order ID, customer, phone or M-Pesa receipt" className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10" /></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label><span className="sr-only">Status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "All" | OrderStatus); resetPage(); }} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold"><option value="All">Any status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span className="sr-only">Payment</span><select value={paymentFilter} onChange={(event) => { setPaymentFilter(event.target.value); resetPage(); }} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold"><option value="All">Any payment</option><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Failed">Failed</option></select></label>
          <label className="col-span-2 sm:col-span-1"><span className="sr-only">Sort orders</span><select value={sort} onChange={(event) => { setSort(event.target.value as SortOption); setPage(1); }} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest value</option><option value="lowest">Lowest value</option></select></label>
        </div>
      </div>

      {selected.size > 0 && <div className="flex flex-col gap-3 border-b border-green-200 bg-green-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-green-900">{selected.size} order{selected.size === 1 ? "" : "s"} selected</p><div className="flex items-center gap-2"><select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as OrderStatus)} className="min-h-10 rounded-lg border border-green-200 bg-white px-3 text-sm font-semibold">{statuses.map((status) => <option key={status}>{status}</option>)}</select><button type="button" onClick={applyBulkStatus} disabled={updating} className="min-h-10 rounded-lg bg-green-700 px-4 text-sm font-bold text-white disabled:opacity-60">{updating ? "Updating..." : "Apply status"}</button><button type="button" onClick={() => setSelected(new Set())} className="min-h-10 px-2 text-sm font-bold text-green-800">Clear</button></div></div>}

      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black uppercase tracking-wider text-gray-500"><tr><th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select visible orders" checked={allVisibleSelected} onChange={toggleVisible} className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-600" /></th><th className="px-3 py-3">Order</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Fulfilment</th><th className="px-4 py-3 text-right">Documents</th></tr></thead>
      <tbody className="divide-y divide-gray-100">{visibleOrders.map((order) => <tr key={order.id} onClick={() => router.push(`/dashboard/admin/orders/${order.id}`)} className={`cursor-pointer transition-colors hover:bg-gray-50 ${selected.has(order.id) ? "bg-green-50/60" : ""}`}><td className="px-4 py-4" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Select order ${order.id}`} checked={selected.has(order.id)} onChange={() => toggleOrder(order.id)} className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-600" /></td><td className="px-3 py-4"><Link href={`/dashboard/admin/orders/${order.id}`} className="font-black text-gray-950 hover:text-green-700">#{order.id.slice(0, 10)}</Link><span className="mt-0.5 block text-[10px] text-gray-400">{order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}</span></td><td className="px-3 py-4 text-gray-600">{new Date(order.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td><td className="max-w-48 px-3 py-4"><span className="block truncate font-semibold text-gray-800">{order.userName || "Guest customer"}</span><span className="block truncate text-xs text-gray-400">{order.phone || order.userEmail || order.userId}</span></td><td className="px-3 py-4 font-black text-gray-950">KES {order.total.toLocaleString()}</td><td className="px-3 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ring-inset ${order.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : order.paymentStatus === "Failed" ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-gray-100 text-gray-600 ring-gray-500/20"}`}>{order.paymentStatus || "Unpaid"}</span></td><td className="px-3 py-4" onClick={(event) => event.stopPropagation()}><select aria-label={`Status for order ${order.id}`} value={order.status} onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)} className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold ring-1 ring-inset focus:ring-2 focus:ring-green-600 ${statusStyle[order.status]}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td><td className="px-4 py-4 text-right" onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1"><Link href={`/orders/${order.id}/receipt`} className="rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-green-700">Receipt</Link><Link href={`/orders/${order.id}/delivery-note`} className="rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-green-700">Delivery note</Link></div></td></tr>)}</tbody></table></div>

      {visibleOrders.length === 0 ? <div className="px-6 py-16 text-center"><p className="font-black text-gray-900">No orders in this view</p><p className="mt-1 text-sm text-gray-500">Try another saved view or clear the filters.</p><button type="button" onClick={() => { setSearchTerm(""); chooseView("all"); }} className="mt-4 text-sm font-bold text-green-700">Clear filters</button></div> : <footer className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold text-gray-700 disabled:opacity-40">Previous</button><span className="px-2 text-xs font-bold">Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold text-gray-700 disabled:opacity-40">Next</button></div></footer>}
    </section>
  </div>;
}
