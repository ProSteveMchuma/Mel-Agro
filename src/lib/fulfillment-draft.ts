import { canPackOrder } from './commerce-ops.ts';
import { lineBalances, lineKey, partSent, outstandingQuantity, statusAfterRecordingDispatch } from './order-admin.ts';
import { fulfillmentStepsFor, isPickupOrder, staffFulfillmentLabel } from './pickup.ts';

/**
 * What staff have typed, before it is saved.
 * A courier dispatch preview is Shipped (“on the way”), never Delivered.
 */
export type DispatchDraft = {
    quantities: Record<string, string>;
    carrier: string;
    trackingNumber: string;
};

export type DraftLine = {
    productId: string;
    variantId?: string;
    name: string;
    quantity: number;
};

type DraftableOrder = {
    status?: string | null;
    shippingMethod?: string | null;
    shippingAddress?: { method?: string | null } | null;
    tracking?: { carrier?: string; trackingNumber?: string } | null;
    items?: Array<{
        id?: string | number;
        name?: string;
        quantity?: number;
        selectedVariant?: { id?: string; name?: string } | null;
    }> | null;
    deliveries?: Array<{
        at?: string;
        by?: string;
        method?: 'courier' | 'pickup' | 'shortfall';
        shortfall?: boolean;
        tracking?: { carrier?: string; trackingNumber?: string } | null;
        lines?: Array<{ productId: string; variantId?: string | null; name?: string; quantity: number }>;
    }> | null;
};

export type QueueStats = {
    processing: number;
    shipped: number;
    readyPickup: number;
    stockAlerts: number;
    late: number;
};

export function readDraftLines(order: DraftableOrder, quantities: Record<string, string>): { lines: DraftLine[]; over: boolean } {
    let over = false;
    const lines: DraftLine[] = [];
    for (const row of lineBalances(order)) {
        if (row.remaining <= 0) continue;
        const raw = quantities[lineKey(row.productId, row.variantId)];
        if (raw == null || String(raw).trim() === '') continue;
        const typed = Math.floor(Number(raw));
        if (!Number.isFinite(typed) || typed <= 0) continue;
        if (typed > row.remaining) over = true;
        lines.push({
            productId: row.productId,
            ...(row.variantId ? { variantId: row.variantId } : {}),
            name: row.name,
            quantity: Math.min(typed, row.remaining),
        });
    }
    return { lines, over };
}

function trackingFields(order: DraftableOrder, draft: DispatchDraft) {
    const savedCarrier = String(order.tracking?.carrier || '').trim();
    const savedNumber = String(order.tracking?.trackingNumber || '').trim();
    const carrier = draft.carrier.trim();
    const trackingNumber = draft.trackingNumber.trim();
    return {
        carrier,
        trackingNumber,
        dirty: carrier !== savedCarrier || trackingNumber !== savedNumber,
    };
}

/** Apply unsaved quantities and tracking. Does not mark Delivered or Collected. */
export function orderWithDraft<T extends DraftableOrder>(order: T, draft: DispatchDraft): T {
    const pickup = isPickupOrder(order);
    const { lines } = readDraftLines(order, draft.quantities);
    const tracking = trackingFields(order, draft);
    const trackingDirty = !pickup && tracking.dirty;
    if (lines.length === 0 && !trackingDirty) return order;

    let status = String(order.status || '');
    let deliveries = order.deliveries;
    if (lines.length > 0) {
        status = statusAfterRecordingDispatch(pickup);
        deliveries = [
            ...(order.deliveries || []),
            {
                method: pickup ? 'pickup' as const : 'courier' as const,
                lines,
                ...(!pickup ? { tracking: { carrier: tracking.carrier, trackingNumber: tracking.trackingNumber } } : {}),
            },
        ];
    } else if (trackingDirty && (status === 'Processing' || status === 'Shipped')) {
        status = 'Shipped';
    }

    const nextTracking = !pickup && (trackingDirty || lines.length > 0)
        ? { carrier: tracking.carrier, trackingNumber: tracking.trackingNumber }
        : order.tracking;

    return { ...order, status, deliveries, tracking: nextTracking } as T;
}

export type FulfillmentCue = {
    label: string;
    onTheWay: boolean;
    delivered: boolean;
    ready: boolean;
    collected: boolean;
    partSent: boolean;
    stillToSend: number;
};

/** One status, one cue. On the way and Delivered cannot both be true. */
export function fulfillmentCue(order: DraftableOrder): FulfillmentCue {
    const pickup = isPickupOrder(order);
    const status = String(order.status || '');
    const onTheWay = !pickup && status === 'Shipped';
    const delivered = !pickup && status === 'Delivered';
    return {
        label: staffFulfillmentLabel(status, order),
        onTheWay,
        delivered,
        ready: pickup && (status === 'Ready for Collection' || status === 'Shipped'),
        collected: pickup && (status === 'Collected' || status === 'Delivered'),
        partSent: partSent(order),
        stillToSend: outstandingQuantity(order),
    };
}

export type StepState = 'done' | 'current' | 'open';

export function fulfillmentStepIndex(order: DraftableOrder): number {
    const steps = fulfillmentStepsFor(order);
    const status = String(order.status || '');
    if (isPickupOrder(order) && (status === 'Shipped' || status === 'Delivered')) {
        const mapped = status === 'Delivered' ? 'Collected' : 'Ready for Collection';
        const index = steps.indexOf(mapped);
        return index < 0 ? 0 : index;
    }
    const index = steps.indexOf(status);
    return index < 0 ? 0 : index;
}

function stepCaption(step: string, state: StepState, pickup: boolean): string {
    if (pickup) {
        if (step === 'Processing') return 'Packing';
        if (step === 'Ready for Collection') return 'Ready for collection';
        if (step === 'Collected') return 'Collected';
        return step;
    }
    if (step === 'Processing') return 'Packing';
    if (step === 'Shipped') {
        if (state === 'current') return 'On the way';
        if (state === 'done') return 'Dispatched';
        return 'Dispatch';
    }
    if (step === 'Delivered') return 'Delivered';
    return step;
}

export function fulfillmentSteps(order: DraftableOrder): Array<{ step: string; state: StepState; label: string }> {
    const pickup = isPickupOrder(order);
    const current = fulfillmentStepIndex(order);
    return [...fulfillmentStepsFor(order)].map((step, index) => {
        const state: StepState = index < current ? 'done' : index === current ? 'current' : 'open';
        return { step, state, label: stepCaption(step, state, pickup) };
    });
}

export function previewDispatch<T extends DraftableOrder>(order: T, draft: DispatchDraft) {
    const parsed = readDraftLines(order, draft.quantities);
    const next = orderWithDraft(order, draft);
    return {
        order: next,
        dirty: next !== order,
        over: parsed.over,
        lines: parsed.lines,
        cue: fulfillmentCue(next),
    };
}

export type FulfillmentWrite =
    | { type: 'partial'; quantities: Record<string, string>; carrier: string; trackingNumber: string }
    | { type: 'dispatch'; carrier: string; trackingNumber: string }
    | { type: 'status'; status: 'Shipped' | 'Delivered' | 'Ready for Collection' | 'Collected'; carrier?: string; trackingNumber?: string }
    | { type: 'shortfall' };

/** Local queue shape after a save. Matches the status rules the API already applies. */
export function orderAfterFulfillmentWrite<T extends DraftableOrder>(order: T, write: FulfillmentWrite): T {
    if (write.type === 'partial') {
        return orderWithDraft(order, {
            quantities: write.quantities,
            carrier: write.carrier,
            trackingNumber: write.trackingNumber,
        });
    }
    if (write.type === 'shortfall') return orderAfterShortfall(order);
    if (write.type === 'dispatch' || (write.type === 'status' && write.status === 'Shipped')) {
        const carrier = String(write.carrier || '').trim();
        const trackingNumber = String(write.trackingNumber || '').trim();
        return { ...order, status: 'Shipped', tracking: { carrier, trackingNumber } } as T;
    }
    return { ...order, status: write.status } as T;
}

export function orderAfterShortfall<T extends DraftableOrder>(order: T): T {
    const rows = lineBalances(order).filter((row) => row.remaining > 0);
    if (rows.length === 0) return order;
    const pickup = isPickupOrder(order);
    const lines = rows.map((row) => ({
        productId: row.productId,
        ...(row.variantId ? { variantId: row.variantId } : {}),
        name: row.name,
        quantity: row.remaining,
    }));
    return {
        ...order,
        status: statusAfterRecordingDispatch(pickup),
        deliveries: [...(order.deliveries || []), { method: 'shortfall' as const, shortfall: true, lines }],
    } as T;
}

const ACTIVE = new Set(['Processing', 'Shipped', 'Ready for Collection']);

type QueueFilterOrder = {
    status?: string | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    shippingMethod?: string | null;
    shippingAddress?: { method?: string | null } | null;
};

/**
 * On the way is a courier order that is still Shipped.
 * Delivered is a different status. A pickup order stored as Shipped is not on the way.
 * The queue only lists orders it can still pack.
 */
export function includeInFulfillmentQueue(order: QueueFilterOrder, filters: { status: string | null; method: string }): boolean {
    if (!canPackOrder(order)) return false;
    const pickup = isPickupOrder(order);
    const status = String(order.status || '');
    if (filters.status === 'Shipped') {
        if (pickup || status !== 'Shipped') return false;
    } else if (filters.status) {
        if (status !== filters.status) return false;
    } else if (!ACTIVE.has(status)) {
        return false;
    }
    if (filters.method === 'pickup' && !pickup) return false;
    if (filters.method === 'delivery' && pickup) return false;
    return true;
}

export function onTheWayCount(orders: QueueFilterOrder[]): number {
    return orders.filter((order) => includeInFulfillmentQueue(order, { status: 'Shipped', method: 'all' })).length;
}

export function queueAfterSave<T extends { id: string } & DraftableOrder>(
    orders: T[],
    next: T,
    filters: { status: string; method: string },
): T[] {
    const index = orders.findIndex((order) => order.id === next.id);
    if (index < 0) return orders;
    const status = String(next.status || '');
    const pickup = isPickupOrder(next);
    const methodOk = filters.method === 'all' || (filters.method === 'pickup' ? pickup : !pickup);
    const listed = filters.status === 'Shipped'
        ? !pickup && status === 'Shipped' && methodOk
        : ACTIVE.has(status) && (filters.status === 'all' || filters.status === status) && methodOk;
    if (!listed) return orders.filter((order) => order.id !== next.id);
    const copy = orders.slice();
    copy[index] = next;
    return copy;
}

export function statsAfterStatusChange(stats: QueueStats, from: string, to: string, lateLeavesView: boolean): QueueStats {
    const next = { ...stats };
    const bucket = (status: string) => {
        if (status === 'Processing') return 'processing' as const;
        if (status === 'Shipped') return 'shipped' as const;
        if (status === 'Ready for Collection') return 'readyPickup' as const;
        return null;
    };
    const fromBucket = bucket(from);
    const toBucket = bucket(to);
    if (fromBucket && fromBucket !== toBucket) next[fromBucket] = Math.max(0, next[fromBucket] - 1);
    if (toBucket && fromBucket !== toBucket) next[toBucket] += 1;
    if (lateLeavesView) next.late = Math.max(0, next.late - 1);
    return next;
}
