"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import type { Order } from "@/types";

type Stats = { requested: number; approved: number; rejected: number };

export default function ReturnsDeskPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Requested");
  const [stats, setStats] = useState<Stats>({ requested: 0, approved: 0, rejected: 0 });
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewNote, setReviewNote] = useState("");

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
        if (status) params.set("status", status);
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/returns?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load returns queue.");
        setOrders(result.orders || []);
        setNextCursor(result.nextCursor || null);
        setStats(result.stats || { requested: 0, approved: 0, rejected: 0 });
        setSearchLimited(Boolean(result.searchLimited));
        setSelectedOrder((current) =>
          current ? (result.orders || []).find((order: Order) => order.id === current.id) || null : null,
        );
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Could not load returns queue.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, status, cursor, refreshKey]);

  useEffect(() => {
    setReviewNote("");
  }, [selectedOrder?.id]);

  function resetPage() {
    setCursor(null);
    setHistory([]);
    setSelectedOrder(null);
  }

  async function mutate(body: Record<string, unknown>) {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error("Admin session is unavailable.");
    const response = await fetch("/api/admin/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Return update failed.");
  }

  async function decide(order: Order, next: "Approved" | "Rejected") {
    const label = next === "Approved" ? "approve" : "reject";
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} this return request?`)) return;
    setPending(true);
    const notice = toast.loading(next === "Approved" ? "Approving return…" : "Rejecting return…");
    try {
      await mutate({
        action: "decide",
        orderId: order.id,
        status: next,
        note: reviewNote.trim() || undefined,
      });
      toast.success(next === "Approved" ? "Return approved" : "Return rejected", { id: notice });
      setSelectedOrder(null);
      setRefreshKey((value) => value + 1);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update return", { id: notice });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <header>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Order operations</p>
        <h1 className="text-2xl font-black text-gray-950">Returns desk</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review customer return requests, decide, and notify them by SMS.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting review" value={stats.requested} tone="amber" />
        <StatCard label="Approved" value={stats.approved} tone="green" />
        <StatCard label="Rejected" value={stats.rejected} tone="red" />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search returns</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            placeholder="Order, customer, phone or reason"
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10"
          />
        </label>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            resetPage();
          }}
          className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold"
        >
          <option value="Requested">Awaiting review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="all">All returns</option>
        </select>
      </section>

      {searchLimited && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          This search checked the next 600 orders. Use an order number or phone for a narrower match.
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
            <QueueMessage>Loading return requests…</QueueMessage>
          ) : orders.length === 0 && !error ? (
            <QueueMessage>No returns in this filter.</QueueMessage>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                  selectedOrder?.id === order.id
                    ? "border-green-600 ring-2 ring-green-600/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-gray-950">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.userName || order.userEmail || order.phone || "Guest customer"} ·{" "}
                      {order.returnRequestedAt
                        ? new Date(order.returnRequestedAt).toLocaleString()
                        : new Date(order.date).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                      order.returnStatus === "Approved"
                        ? "bg-green-100 text-green-700"
                        : order.returnStatus === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.returnStatus}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                  {order.returnReason || "No reason provided"}
                </p>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item, index) => (
                      <span
                        key={`${item.id}-${index}`}
                        className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold"
                      >
                        {item.image ? (
                          <Image src={item.image} alt="" fill className="object-cover" />
                        ) : (
                          item.name?.[0] || "?"
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="font-black text-gray-950">KES {Number(order.total || 0).toLocaleString()}</span>
                </div>
              </button>
            ))
          )}

          {!loading && orders.length > 0 && (
            <footer className="flex items-center justify-between pt-2 text-sm text-gray-500">
              <span>
                Page {history.length + 1} · {orders.length} returns
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={history.length === 0}
                  onClick={() =>
                    setHistory((current) => {
                      const copy = [...current];
                      setCursor(copy.pop() ?? null);
                      setSelectedOrder(null);
                      return copy;
                    })
                  }
                  className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
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
                <h2 className="font-black text-gray-950">Return actions</h2>
                <Link
                  href={`/dashboard/admin/orders/${selectedOrder.id}`}
                  className="text-xs font-black text-green-700 hover:underline"
                >
                  Full details
                </Link>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Customer reason</p>
                <p className="mt-2 text-sm text-gray-700">{selectedOrder.returnReason || "—"}</p>
                <p className="mt-3 text-xs text-gray-500">
                  Order status: <span className="font-bold text-gray-800">{selectedOrder.status}</span>
                  {selectedOrder.paymentStatus ? ` · ${selectedOrder.paymentStatus}` : ""}
                </p>
              </div>

              {selectedOrder.returnStatus === "Requested" ? (
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400">
                    Review note (optional)
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Pickup instructions, refund path, or rejection reason…"
                      className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-green-600"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide(selectedOrder, "Approved")}
                    className="min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    Approve return
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide(selectedOrder, "Rejected")}
                    className="min-h-12 w-full rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject return
                  </button>
                  <p className="text-xs text-gray-500">
                    Approval notifies the customer. Process any refund from the order Payments panel.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                  Already {String(selectedOrder.returnStatus).toLowerCase()}.
                  {selectedOrder.returnReviewNote ? (
                    <p className="mt-2 text-gray-800">{selectedOrder.returnReviewNote}</p>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/orders/${selectedOrder.id}/receipt`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold hover:bg-gray-50"
                >
                  Receipt
                </Link>
                <Link
                  href={`/dashboard/admin/payments`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-bold hover:bg-gray-50"
                >
                  Payments
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
              Select a return to review and decide.
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
  tone: "amber" | "green" | "red";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function QueueMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-14 text-center text-sm font-semibold text-gray-500">
      {children}
    </div>
  );
}
