"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import type { Order } from "@/types";
import { isPickupOrder, nextFulfillmentStatus, PICKUP_STORE } from "@/lib/pickup";

type Stats = { processing: number; shipped: number; readyPickup: number; stockAlerts: number };

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState<"all" | "delivery" | "pickup">("all");
  const [stats, setStats] = useState<Stats>({ processing: 0, shipped: 0, readyPickup: 0, stockAlerts: 0 });
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (status !== "all") params.set("status", status);
        if (method !== "all") params.set("method", method);
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/fulfillment?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load fulfillment queue.");
        setOrders(result.orders || []);
        setNextCursor(result.nextCursor || null);
        setStats(result.stats || { processing: 0, shipped: 0, readyPickup: 0, stockAlerts: 0 });
        setSearchLimited(Boolean(result.searchLimited));
        setSelectedOrder((current) =>
          current ? (result.orders || []).find((order: Order) => order.id === current.id) || null : null,
        );
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Could not load fulfillment queue.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, status, method, cursor, refreshKey]);

  function resetPage() {
    setCursor(null);
    setHistory([]);
    setSelectedOrder(null);
  }

  async function mutate(body: Record<string, unknown>) {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error("Admin session is unavailable.");
    const response = await fetch("/api/admin/fulfillment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Fulfillment update failed.");
  }

  async function advanceOrder(order: Order) {
    const next = nextFulfillmentStatus(order);
    if (!next) return;
    const pickup = isPickupOrder(order);

    if (next === "Shipped") {
      if (!carrier.trim() || !trackingNumber.trim()) {
        toast.error("Enter carrier and tracking number before dispatch.");
        return;
      }
    }
    if (next === "Delivered" && !window.confirm("Confirm this order has been delivered?")) return;
    if (next === "Collected" && !window.confirm("Confirm the customer collected this order?")) return;

    setPending(true);
    const labels: Record<string, string> = {
      Shipped: "Marking as shipped…",
      Delivered: "Confirming delivery…",
      "Ready for Collection": "Marking ready for collection…",
      Collected: "Confirming collection…",
    };
    const notice = toast.loading(labels[next] || "Updating…");
    try {
      await mutate({
        action: "status",
        orderId: order.id,
        status: next,
        ...(next === "Shipped"
          ? { tracking: { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() } }
          : {}),
      });
      toast.success(
        next === "Ready for Collection"
          ? "Ready for Machakos collection"
          : next === "Collected"
            ? "Collection confirmed"
            : next === "Shipped"
              ? "Order dispatched"
              : "Delivery confirmed",
        { id: notice },
      );
      setCarrier("");
      setTrackingNumber("");
      setSelectedOrder(null);
      setRefreshKey((value) => value + 1);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update order", { id: notice });
    } finally {
      setPending(false);
    }
  }

  const selectedPickup = selectedOrder ? isPickupOrder(selectedOrder) : false;
  const selectedNext = selectedOrder ? nextFulfillmentStatus(selectedOrder) : null;

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <header>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Order operations</p>
        <h1 className="text-2xl font-black text-gray-950">Fulfillment queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Delivery dispatch and Machakos store collection in one audited queue.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Processing" value={stats.processing} tone="blue" />
        <StatCard label="In transit" value={stats.shipped} tone="green" />
        <StatCard label="Ready to collect" value={stats.readyPickup} tone="amber" />
        <StatCard label="Stock alerts" value={stats.stockAlerts} tone="red" />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search queue</span>
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetPage(); }}
            placeholder="Order, customer, phone or county"
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10"
          />
        </label>
        <select
          value={method}
          onChange={(event) => { setMethod(event.target.value as typeof method); resetPage(); }}
          className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold"
        >
          <option value="all">All methods</option>
          <option value="delivery">Delivery only</option>
          <option value="pickup">Collection only</option>
        </select>
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); resetPage(); }}
          className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold"
        >
          <option value="all">All stages</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Shipped / in transit</option>
          <option value="Ready for Collection">Ready for collection</option>
        </select>
      </section>

      {searchLimited && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          This search checked the next 600 orders. Narrow with an order number, phone, or county.
        </p>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{" "}
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 font-black underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="space-y-3">
          {loading ? (
            <QueueMessage>Loading paid orders…</QueueMessage>
          ) : orders.length === 0 && !error ? (
            <QueueMessage>No paid orders are waiting in this stage.</QueueMessage>
          ) : (
            orders.map((order) => {
              const pickup = isPickupOrder(order);
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                    selectedOrder?.id === order.id ? "border-green-600 ring-2 ring-green-600/10" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-gray-950">Order #{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {order.userName || order.userEmail || order.phone || "Guest customer"} ·{" "}
                        {new Date(order.date).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                        pickup ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        {pickup ? "Collection" : "Delivery"}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                        order.status === "Processing"
                          ? "bg-amber-100 text-amber-700"
                          : order.status === "Ready for Collection"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-700"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {pickup
                      ? `${PICKUP_STORE.label} · ${PICKUP_STORE.etaText}`
                      : `${order.shippingAddress?.county || "No county"} · ${order.shippingAddress?.details || "No delivery address"}`}
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map((item, index) => (
                        <span
                          key={`${item.id}-${index}`}
                          className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold"
                        >
                          {item.image ? <Image src={item.image} alt="" fill className="object-cover" /> : item.name?.[0] || "?"}
                        </span>
                      ))}
                    </div>
                    <span className="font-black text-gray-950">KES {Number(order.total || 0).toLocaleString()}</span>
                  </div>
                </button>
              );
            })
          )}
          {!loading && orders.length > 0 && (
            <footer className="flex items-center justify-between pt-2 text-sm text-gray-500">
              <span>Page {history.length + 1} · {orders.length} orders</span>
              <div className="flex gap-2">
                <button
                  disabled={history.length === 0}
                  onClick={() => setHistory((current) => {
                    const copy = [...current];
                    setCursor(copy.pop() ?? null);
                    setSelectedOrder(null);
                    return copy;
                  })}
                  className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={!nextCursor}
                  onClick={() => {
                    if (nextCursor) {
                      setHistory((current) => [...current, cursor]);
                      setCursor(nextCursor);
                      setSelectedOrder(null);
                    }
                  }}
                  className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 font-bold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </footer>
          )}
        </section>

        <aside>
          {selectedOrder ? (
            <div className="sticky top-24 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-950">Fulfillment actions</h2>
                <Link href={`/dashboard/admin/orders/${selectedOrder.id}`} className="text-xs font-black text-green-700 hover:underline">
                  Full details
                </Link>
              </div>

              <div className={`rounded-xl p-4 ${selectedPickup ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                  {selectedPickup ? "Machakos collection" : "Delivery dispatch"}
                </p>
                {selectedPickup ? (
                  <p className="mt-2 text-sm text-amber-950">
                    {PICKUP_STORE.name}. Customer collects in person — no carrier tracking.
                  </p>
                ) : null}

                {!selectedPickup && selectedNext === "Shipped" ? (
                  <div className="mt-3 space-y-2">
                    <input
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="Carrier e.g. G4S"
                      className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                    />
                    <input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Tracking / reference"
                      className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm"
                    />
                  </div>
                ) : null}

                {selectedNext ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => advanceOrder(selectedOrder)}
                    className="mt-3 min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {selectedNext === "Ready for Collection"
                      ? "Mark ready for collection"
                      : selectedNext === "Collected"
                        ? "Confirm collected"
                        : selectedNext === "Shipped"
                          ? "Dispatch / mark shipped"
                          : "Confirm delivered"}
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">No further fulfillment step for this status.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/orders/${selectedOrder.id}/delivery-note`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold hover:bg-gray-50"
                >
                  {selectedPickup ? "Collection slip" : "Packing slip"}
                </Link>
                <Link
                  href={`/orders/${selectedOrder.id}/invoice`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold hover:bg-gray-50"
                >
                  Invoice
                </Link>
              </div>

              <InternalNotes
                order={selectedOrder}
                mutate={mutate}
                onSaved={(note) =>
                  setSelectedOrder((current) =>
                    current
                      ? {
                          ...current,
                          internalNotes: note,
                          internalHistory: [
                            ...(current.internalHistory || []),
                            { date: new Date().toISOString(), note, author: "Current admin" },
                          ],
                        }
                      : current,
                  )
                }
              />
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
              Select an order to see its next action.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "red" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function QueueMessage({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">{children}</div>;
}

function InternalNotes({
  order,
  mutate,
  onSaved,
}: {
  order: Order;
  mutate: (body: Record<string, unknown>) => Promise<void>;
  onSaved: (note: string) => void;
}) {
  const [note, setNote] = useState(order.internalNotes || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setNote(order.internalNotes || ""); }, [order.id, order.internalNotes]);
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-wider text-gray-400">Internal note</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm" />
      <button
        type="button"
        disabled={saving || !note.trim()}
        onClick={async () => {
          setSaving(true);
          try {
            await mutate({ action: "note", orderId: order.id, note: note.trim() });
            onSaved(note.trim());
            toast.success("Note saved");
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : "Could not save note");
          } finally {
            setSaving(false);
          }
        }}
        className="mt-2 min-h-10 w-full rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
      >
        Save note
      </button>
    </div>
  );
}
