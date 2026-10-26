"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { skipImageOptimizer } from "@/lib/product-image";
import type { Order } from "@/types";
import { hoursSincePackableLabel, type QueueFacts } from "@/lib/fulfillment-age";
import { isPickupOrder, nextFulfillmentStatus, PICKUP_STORE } from "@/lib/pickup";
import { canRecordWhatWentOut, dispatchLineLabel, lineBalances, lineKey, nairobiPlacedLabel, partialBlocksCompletion, partSent } from "@/lib/order-admin";
import { fulfillmentSteps, previewDispatch, type DispatchDraft } from "@/lib/fulfillment-draft";

export type QueueOrder = Order & { queue?: QueueFacts };

export default function FulfillmentOrderCard({
  order,
  pending,
  extras,
  onRecord,
  onDispatch,
  onReady,
  onDelivered,
  onCollected,
  onShortfall,
}: {
  order: QueueOrder;
  pending: boolean;
  extras?: ReactNode;
  onRecord: (draft: DispatchDraft) => void;
  onDispatch: (draft: DispatchDraft) => void;
  onReady: () => void;
  onDelivered: () => void;
  onCollected: () => void;
  onShortfall: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState(order.tracking?.carrier || "");
  const [trackingNumber, setTrackingNumber] = useState(order.tracking?.trackingNumber || "");

  const pickup = isPickupOrder(order);
  const draft: DispatchDraft = { quantities, carrier, trackingNumber };
  const preview = previewDispatch(order, draft);
  const shown = preview.order;
  const cue = preview.cue;
  const steps = fulfillmentSteps(shown);
  const savedBalances = lineBalances(order);
  const previewBalances = lineBalances(shown);
  const savedNext = nextFulfillmentStatus(order);
  const savedBlocked = partialBlocksCompletion(order);
  const canRecord = canRecordWhatWentOut(order) && savedBalances.some((row) => row.remaining > 0);
  const showTrackingFields = !pickup && (savedNext === "Shipped" || canRecord);
  const trackingReady = carrier.trim().length > 0 && trackingNumber.trim().length > 0;
  const queue = order.queue;
  const showLines = (shown.deliveries || []).length > 0;
  const unsaved = preview.lines.length > 0 || (preview.dirty && !pickup && savedNext === "Shipped");

  function setLine(key: string, value: string) {
    setQuantities((current) => ({ ...current, [key]: value }));
  }

  function nudge(key: string, remaining: number, delta: number) {
    setQuantities((current) => {
      const typed = Math.floor(Number(current[key] || 0));
      const base = Number.isFinite(typed) && typed > 0 ? typed : 0;
      const next = Math.min(remaining, Math.max(0, base + delta));
      return { ...current, [key]: next > 0 ? String(next) : "" };
    });
  }

  function fillRemaining() {
    const next: Record<string, string> = {};
    for (const row of savedBalances) {
      if (row.remaining > 0) next[lineKey(row.productId, row.variantId)] = String(row.remaining);
    }
    setQuantities(next);
  }

  return (
    <article
      data-fulfillment-order={order.id}
      data-preview-status={shown.status}
      data-saved-status={order.status}
      data-on-the-way={cue.onTheWay ? "true" : "false"}
      data-delivered={cue.delivered ? "true" : "false"}
      data-part-sent={cue.partSent ? "true" : "false"}
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        unsaved ? "border-amber-400 ring-2 ring-amber-200/70" : "border-gray-200"
      }`}
    >
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (preview.lines.length > 0) onRecord(draft);
        else if (!pickup && savedNext === "Shipped") onDispatch(draft);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-gray-950">Order #{order.id.slice(0, 8)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {order.userName || order.userEmail || order.phone || "Guest customer"} · {nairobiPlacedLabel(order.date)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${pickup ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
            {pickup ? "Collection" : "Delivery"}
          </span>
          <span
            data-status-label
            className={`rounded-full px-3 py-1 text-left text-[11px] font-black leading-snug ${
              shown.status === "Processing"
                ? "bg-amber-100 text-amber-700"
                : shown.status === "Ready for Collection" || pickup
                  ? "bg-orange-100 text-orange-800"
                  : shown.status === "Delivered" || shown.status === "Collected"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
            }`}
          >
            {cue.label}
          </span>
          {unsaved ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-800">Not saved</span>
          ) : null}
          {cue.partSent ? (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase text-violet-800">Part sent</span>
          ) : null}
          {queue?.late ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase text-red-700">Late</span>
          ) : null}
          {queue?.waiting ? (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-700">Waiting</span>
          ) : null}
        </div>
      </div>

      <p className="mt-3 font-black text-gray-950">KES {Number(order.total || 0).toLocaleString()}</p>
      <p className="mt-1 text-sm text-gray-700">
        {queue ? hoursSincePackableLabel(queue.hours) : nairobiPlacedLabel(order.date)}
        {" · "}
        {queue?.methodLabel || (pickup ? "Machakos pickup" : "Delivery")}
        {" · "}
        {queue?.place || (pickup ? "Machakos pickup" : order.shippingAddress?.county || "No county")}
      </p>
      <p className="mt-1 text-sm text-gray-500">{queue?.etaText || (pickup ? PICKUP_STORE.etaText : "Zone promise")}</p>

      <div className="mt-4" aria-live="polite">
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((step) => (
            <li
              key={step.step}
              data-step={step.step}
              data-state={step.state}
              aria-current={step.state === "current" ? "step" : undefined}
              className="text-center"
            >
              <span
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-black ${
                  step.state === "done"
                    ? "border-green-700 bg-green-700 text-white"
                    : step.state === "current"
                      ? "border-green-700 bg-white text-green-800"
                      : "border-gray-200 bg-white text-gray-300"
                }`}
              >
                {step.state === "done" ? "✓" : step.state === "current" ? "●" : ""}
              </span>
              <span className={`mt-1 block text-[10px] font-black uppercase leading-tight tracking-wide ${
                step.state === "open" ? "text-gray-400" : "text-gray-800"
              }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
        {cue.onTheWay ? (
          <p data-courier className="mt-3 text-sm font-semibold text-blue-950">
            Dispatched. Courier is on the way.
            {cue.partSent ? ` ${cue.stillToSend} still to send.` : " Confirm delivered only when the customer has the goods."}
          </p>
        ) : null}
        {cue.delivered ? (
          <p data-delivered-copy className="mt-3 text-sm font-semibold text-green-900">Delivered. The customer has the goods.</p>
        ) : null}
        {cue.ready ? (
          <p className="mt-3 text-sm font-semibold text-amber-950">
            Ready for collection. Mark collected only when the customer has the goods.
            {cue.partSent ? ` ${cue.stillToSend} still to send.` : ""}
          </p>
        ) : null}
        {cue.collected ? (
          <p className="mt-3 text-sm font-semibold text-green-900">Collected. The customer has the goods.</p>
        ) : null}
        {unsaved ? (
          <p className="mt-2 text-xs font-semibold text-amber-800">
            Not saved yet.
            {cue.onTheWay ? " Saving keeps this as Dispatched · courier on the way." : ""}
            {cue.ready ? " Saving keeps this ready for collection." : ""}
          </p>
        ) : null}
      </div>

      {!pickup && (carrier.trim() || trackingNumber.trim() || order.tracking?.carrier || order.tracking?.trackingNumber) ? (
        <p data-tracking className="mt-3 text-sm font-semibold text-gray-800">
          {(carrier.trim() || order.tracking?.carrier || "Carrier")} · {(trackingNumber.trim() || order.tracking?.trackingNumber || "No tracking yet")}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
        <div className="space-y-3">
          <ul className="space-y-2">
            {savedBalances.map((row) => {
              const key = lineKey(row.productId, row.variantId);
              const previewRow = previewBalances.find((balance) => lineKey(balance.productId, balance.variantId) === key);
              const item = order.items.find((entry) => String(entry.id) === row.productId);
              const typed = Math.floor(Number(quantities[key] || 0));
              return (
                <li key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-gray-200 text-xs font-bold">
                      {item?.image ? (
                        <Image src={item.image} alt="" fill unoptimized={skipImageOptimizer(item.image)} className="object-cover" />
                      ) : (
                        item?.name?.[0] || "?"
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-950">{row.name}</p>
                      <p data-line={key} className="text-xs font-semibold text-gray-600">
                        {showLines && previewRow ? dispatchLineLabel(previewRow, pickup) : `${row.ordered} ordered`}
                      </p>
                    </div>
                  </div>
                  {canRecord && row.remaining > 0 ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Send one less ${row.name}`}
                        disabled={pending || !(typed > 0)}
                        onClick={() => nudge(key, row.remaining, -1)}
                        className="h-11 w-11 rounded-xl border border-gray-200 bg-white text-lg font-black text-gray-700 disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={row.remaining}
                        inputMode="numeric"
                        aria-label={`Quantity of ${row.name} going out`}
                        value={quantities[key] || ""}
                        onChange={(event) => setLine(key, event.target.value)}
                        placeholder={`Up to ${row.remaining}`}
                        className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                      />
                      <button
                        type="button"
                        aria-label={`Send one more ${row.name}`}
                        disabled={pending || typed >= row.remaining}
                        onClick={() => nudge(key, row.remaining, 1)}
                        className="h-11 w-11 rounded-xl border border-gray-200 bg-white text-lg font-black text-gray-700 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {canRecord ? (
            <button type="button" onClick={fillRemaining} className="text-xs font-black text-green-800 underline">
              Send all remaining
            </button>
          ) : null}
          {queue?.waiting ? (
            <p className="text-xs font-semibold text-slate-600">Waiting: {queue.waiting.reason} · {queue.waiting.by}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/${order.id}/delivery-note`} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold hover:bg-gray-50">
              {pickup ? "Collection slip" : "Packing slip"}
            </Link>
            <Link href={`/orders/${order.id}/invoice`} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold hover:bg-gray-50">
              Invoice
            </Link>
            <Link href={`/dashboard/admin/orders/${order.id}`} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-green-800 hover:bg-gray-50">
              Full details
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          {showTrackingFields ? (
            <>
              <input
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
                aria-label="Carrier"
                placeholder="Carrier e.g. G4S"
                className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
              />
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                aria-label="Tracking number"
                placeholder="Tracking / reference"
                className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm"
              />
            </>
          ) : null}
          {preview.over ? (
            <p className="text-xs font-semibold text-red-700">That quantity is more than what is still outstanding.</p>
          ) : null}
          {showTrackingFields && !trackingReady && unsaved ? (
            <p className="text-xs font-semibold text-gray-500">Enter carrier and tracking number before dispatch.</p>
          ) : null}

          {preview.lines.length > 0 ? (
            <button
              type="submit"
              disabled={pending || preview.over || (showTrackingFields && !trackingReady)}
              className="min-h-12 w-full rounded-xl bg-gray-950 px-4 text-sm font-black text-white disabled:opacity-50"
            >
              Record what went out
            </button>
          ) : null}
          {!pickup && savedNext === "Shipped" && preview.lines.length === 0 ? (
            <button
              type="submit"
              disabled={pending || !trackingReady}
              className="min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"
            >
              Dispatch / mark shipped
            </button>
          ) : null}
          {savedNext === "Delivered" && !savedBlocked && preview.lines.length === 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={onDelivered}
              className="min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"
            >
              Confirm delivered
            </button>
          ) : null}
          {savedNext === "Ready for Collection" && preview.lines.length === 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={onReady}
              className="min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"
            >
              Mark ready for collection
            </button>
          ) : null}
          {savedNext === "Collected" && !savedBlocked && preview.lines.length === 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={onCollected}
              className="min-h-12 w-full rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800 disabled:opacity-50"
            >
              Confirm collected
            </button>
          ) : null}
          {partSent(order) && !unsaved ? (
            <button
              type="button"
              disabled={pending}
              onClick={onShortfall}
              className="min-h-11 w-full rounded-xl border border-gray-200 text-sm font-bold text-gray-800 disabled:opacity-50"
            >
              Close shortfall
            </button>
          ) : null}
        </div>
      </div>
    </form>
      {extras ? <div className="mt-4 border-t border-gray-100 pt-4">{extras}</div> : null}
    </article>
  );
}
