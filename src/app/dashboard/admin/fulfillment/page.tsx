"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import FulfillmentOrderCard, { type QueueOrder } from "@/components/admin/FulfillmentOrderCard";
import { isPickupOrder } from "@/lib/pickup";
import {
  onTheWayCount,
  orderAfterFulfillmentWrite,
  queueAfterSave,
  readDraftLines,
  statsAfterStatusChange,
  type DispatchDraft,
  type QueueStats,
} from "@/lib/fulfillment-draft";

type Stats = QueueStats;

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState<"all" | "delivery" | "pickup">("all");
  const [stats, setStats] = useState<Stats>({ processing: 0, shipped: 0, readyPickup: 0, stockAlerts: 0, late: 0 });
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [queueCapped, setQueueCapped] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const lateMemory = useRef<Record<string, boolean>>({});

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
        setStats(result.stats || { processing: 0, shipped: 0, readyPickup: 0, stockAlerts: 0, late: 0 });
        setSearchLimited(Boolean(result.searchLimited));
        setQueueCapped(Boolean(result.queueCapped));
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
  }

  function chooseStatus(next: string) {
    setStatus(next);
    resetPage();
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
    return result as { message?: string };
  }

  function commit(previous: QueueOrder, next: QueueOrder) {
    const filters = { status, method };
    const stays = queueAfterSave([previous], next, filters).length === 1;
    setOrders((current) => queueAfterSave(current, next, filters));
    setStats((current) => {
      const nextStats = statsAfterStatusChange(
        current,
        previous.status,
        String(next.status || ""),
        Boolean(previous.queue?.late) && !stays,
      );
      const onTheWayDelta = onTheWayCount([next]) - onTheWayCount([previous]);
      return { ...nextStats, shipped: Math.max(0, current.shipped + onTheWayDelta) };
    });
    setRevisions((current) => ({ ...current, [previous.id]: (current[previous.id] || 0) + 1 }));
  }

  async function record(order: QueueOrder, draft: DispatchDraft) {
    const parsed = readDraftLines(order, draft.quantities);
    if (parsed.over) {
      toast.error("That quantity is more than what is still outstanding.");
      return;
    }
    if (parsed.lines.length === 0) {
      toast.error("Enter a quantity for at least one line.");
      return;
    }
    const pickup = isPickupOrder(order);
    if (!pickup && (!draft.carrier.trim() || !draft.trackingNumber.trim())) {
      toast.error("Enter carrier and tracking number before dispatch.");
      return;
    }
    setPending(true);
    const notice = toast.loading("Recording what went out…");
    try {
      const result = await mutate({
        action: "partial",
        orderId: order.id,
        lines: parsed.lines.map((line) => ({
          productId: line.productId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          quantity: line.quantity,
        })),
        ...(!pickup ? { tracking: { carrier: draft.carrier.trim(), trackingNumber: draft.trackingNumber.trim() } } : {}),
      });
      commit(order, orderAfterFulfillmentWrite(order, { type: "partial", ...draft }));
      toast.success(result.message || "Recorded what went out", { id: notice });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update order", { id: notice });
    } finally {
      setPending(false);
    }
  }

  async function dispatchOrder(order: QueueOrder, draft: DispatchDraft) {
    if (!draft.carrier.trim() || !draft.trackingNumber.trim()) {
      toast.error("Enter carrier and tracking number before dispatch.");
      return;
    }
    setPending(true);
    const notice = toast.loading("Marking as shipped…");
    try {
      await mutate({
        action: "status",
        orderId: order.id,
        status: "Shipped",
        tracking: { carrier: draft.carrier.trim(), trackingNumber: draft.trackingNumber.trim() },
      });
      commit(order, orderAfterFulfillmentWrite(order, {
        type: "dispatch",
        carrier: draft.carrier,
        trackingNumber: draft.trackingNumber,
      }));
      toast.success("Order dispatched", { id: notice });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update order", { id: notice });
    } finally {
      setPending(false);
    }
  }

  async function advance(order: QueueOrder, nextStatus: "Delivered" | "Ready for Collection" | "Collected") {
    if (nextStatus === "Delivered" && !window.confirm("Confirm this order has been delivered?")) return;
    if (nextStatus === "Collected" && !window.confirm("Confirm the customer collected this order?")) return;
    const labels: Record<string, string> = {
      Delivered: "Confirming delivery…",
      "Ready for Collection": "Marking ready for collection…",
      Collected: "Confirming collection…",
    };
    const done: Record<string, string> = {
      Delivered: "Delivery confirmed",
      "Ready for Collection": "Ready for Machakos collection",
      Collected: "Collection confirmed",
    };
    setPending(true);
    const notice = toast.loading(labels[nextStatus]);
    try {
      await mutate({ action: "status", orderId: order.id, status: nextStatus });
      commit(order, orderAfterFulfillmentWrite(order, { type: "status", status: nextStatus }));
      toast.success(done[nextStatus], { id: notice });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update order", { id: notice });
    } finally {
      setPending(false);
    }
  }

  async function closeShortfall(order: QueueOrder) {
    if (!window.confirm("Close the unsent units? Those units go back on the shelf. This does not refund the customer.")) return;
    setPending(true);
    const notice = toast.loading("Closing the shortfall…");
    try {
      const result = await mutate({ action: "shortfall", orderId: order.id });
      commit(order, orderAfterFulfillmentWrite(order, { type: "shortfall" }));
      toast.success(result.message || "Shortfall closed", { id: notice });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update order", { id: notice });
    } finally {
      setPending(false);
    }
  }

  async function markWaiting(order: QueueOrder, reason: string) {
    setPending(true);
    const notice = toast.loading(reason ? "Marking as waiting…" : "Clearing the wait…");
    try {
      await mutate(reason
        ? { action: "wait", orderId: order.id, reason }
        : { action: "clear-wait", orderId: order.id });
      const wasLate = Boolean(order.queue?.late);
      const restoreLate = !reason && Boolean(lateMemory.current[order.id]);
      if (reason && wasLate) lateMemory.current[order.id] = true;
      if (!reason) delete lateMemory.current[order.id];
      setOrders((current) => current.map((entry) => {
        if (entry.id !== order.id || !entry.queue) return entry;
        if (reason) {
          return {
            ...entry,
            queue: {
              ...entry.queue,
              late: false,
              waiting: { reason, by: "You", at: new Date().toISOString() },
            },
          };
        }
        return { ...entry, queue: { ...entry.queue, late: restoreLate, waiting: null } };
      }));
      setStats((current) => {
        if (reason && wasLate) return { ...current, late: Math.max(0, current.late - 1) };
        if (restoreLate) return { ...current, late: current.late + 1 };
        return current;
      });
      toast.success(reason ? "Marked waiting" : "Wait cleared", { id: notice });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update the wait", { id: notice });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <header>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Order operations</p>
        <h1 className="text-2xl font-black text-gray-950">Fulfillment queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Delivery and Machakos pickup, oldest first. A dispatched courier order stays on the way until you confirm the customer has the goods. Late orders are listed before the rest. A wait is not counted late.
          What you type updates the line and the status here before you save.
        </p>
      </header>
      {stats.late > 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {stats.late} late. Pack or dispatch those first.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Processing" value={stats.processing} tone="blue" pressed={status === "Processing"} onClick={() => chooseStatus(status === "Processing" ? "all" : "Processing")} />
        <StatCard label="On the way" value={stats.shipped} tone="green" pressed={status === "Shipped"} onClick={() => chooseStatus(status === "Shipped" ? "all" : "Shipped")} />
        <StatCard label="Ready to collect" value={stats.readyPickup} tone="amber" pressed={status === "Ready for Collection"} onClick={() => chooseStatus(status === "Ready for Collection" ? "all" : "Ready for Collection")} />
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
          onChange={(event) => chooseStatus(event.target.value)}
          className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold"
        >
          <option value="all">All stages</option>
          <option value="Processing">Processing</option>
          <option value="Shipped">Dispatched · on the way</option>
          <option value="Ready for Collection">Ready for collection</option>
        </select>
      </section>

      {searchLimited && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          This search checked the next 600 orders. Narrow with an order number, phone, or county.
        </p>
      )}
      {queueCapped && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Showing the first 200 orders in a stage. Late orders in that set are still listed first.
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

      <section className="space-y-3">
        {loading ? (
          <QueueMessage>Loading paid orders…</QueueMessage>
        ) : orders.length === 0 && !error ? (
          <QueueMessage>No paid orders are waiting in this stage.</QueueMessage>
        ) : (
          orders.map((order) => (
            <FulfillmentOrderCard
              key={`${order.id}:${revisions[order.id] || 0}`}
              order={order}
              pending={pending}
              onRecord={(draft) => record(order, draft)}
              onDispatch={(draft) => dispatchOrder(order, draft)}
              onReady={() => advance(order, "Ready for Collection")}
              onDelivered={() => advance(order, "Delivered")}
              onCollected={() => advance(order, "Collected")}
              onShortfall={() => closeShortfall(order)}
              extras={
                <div className="grid gap-3 lg:grid-cols-2">
                  <WaitingControl
                    order={order}
                    pending={pending}
                    onWait={(reason) => markWaiting(order, reason)}
                    onClear={() => markWaiting(order, "")}
                  />
                  <InternalNotes
                    order={order}
                    mutate={mutate}
                    onSaved={(note) => setOrders((current) => current.map((entry) => (
                      entry.id === order.id
                        ? {
                            ...entry,
                            internalNotes: note,
                            internalHistory: [
                              ...(entry.internalHistory || []),
                              { date: new Date().toISOString(), note, author: "Current admin" },
                            ],
                          }
                        : entry
                    )))}
                  />
                </div>
              }
            />
          ))
        )}
        {!loading && orders.length > 0 && (
          <footer className="flex items-center justify-between pt-2 text-sm text-gray-500">
            <span>Page {history.length + 1} · {orders.length} orders</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={history.length === 0}
                onClick={() => setHistory((current) => {
                  const copy = [...current];
                  setCursor(copy.pop() ?? null);
                  return copy;
                })}
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
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  pressed,
  onClick,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "red" | "amber";
  pressed?: boolean;
  onClick?: () => void;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
  };
  const body = (
    <>
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${colors[tone]}`}>{value}</p>
    </>
  );
  if (!onClick) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm">{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(pressed)}
      className={`rounded-2xl border bg-white p-5 text-left shadow-sm ${pressed ? "border-green-700 ring-2 ring-green-600/20" : "border-gray-200 hover:border-gray-300"}`}
    >
      {body}
    </button>
  );
}

function QueueMessage({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">{children}</div>;
}

function WaitingControl({
  order,
  pending,
  onWait,
  onClear,
}: {
  order: QueueOrder;
  pending: boolean;
  onWait: (reason: string) => void;
  onClear: () => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { setReason(""); }, [order.id]);
  const waiting = order.queue?.waiting;
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-gray-400">Waiting</p>
      {waiting ? (
        <>
          <p className="mt-2 text-sm text-gray-800">{waiting.reason}</p>
          <p className="mt-1 text-xs text-gray-500">Set by {waiting.by}</p>
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="mt-3 min-h-10 w-full rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
          >
            Clear waiting
          </button>
        </>
      ) : (
        <>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Customer asked us to hold"
            className="mt-2 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
          />
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() => onWait(reason.trim())}
            className="mt-2 min-h-10 w-full rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
          >
            Mark waiting
          </button>
        </>
      )}
    </div>
  );
}

function InternalNotes({
  order,
  mutate,
  onSaved,
}: {
  order: QueueOrder;
  mutate: (body: Record<string, unknown>) => Promise<unknown>;
  onSaved: (note: string) => void;
}) {
  const [note, setNote] = useState(order.internalNotes || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setNote(order.internalNotes || ""); }, [order.id, order.internalNotes]);
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-wider text-gray-400">Internal note</label>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm" />
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
