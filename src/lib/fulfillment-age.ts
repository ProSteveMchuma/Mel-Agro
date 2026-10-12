import { getDeliveryCost, type DeliveryZone } from './delivery.ts';
import { fulfillmentMethodOf, isPickupOrder, PICKUP_STORE, type FulfillmentMethod } from './pickup.ts';

const HOUR_MS = 60 * 60 * 1000;

export type FulfillmentWait = {
    reason: string;
    by: string;
    at: string;
};

export type QueueFacts = {
    packableAt: string | null;
    hours: number;
    method: FulfillmentMethod;
    methodLabel: 'Delivery' | 'Machakos pickup';
    place: string;
    etaText: string;
    late: boolean;
    waiting: FulfillmentWait | null;
};

type QueueOrder = {
    date?: string | null;
    paidAt?: string | null;
    processingAt?: string | null;
    shippingMethod?: string | null;
    shippingAddress?: { county?: string | null; method?: string | null } | null;
    fulfillmentWait?: { reason?: string | null; by?: string | null; at?: string | null } | null;
};

/** When the order entered the pack queue: packing time, else payment, else placement. */
export function packableAt(order: QueueOrder): string | null {
    const value = String(order.processingAt || order.paidAt || order.date || '').trim();
    return value || null;
}

export function hoursSincePackable(order: QueueOrder, now = Date.now()): number {
    const at = packableAt(order);
    if (!at) return 0;
    const parsed = Date.parse(at);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor((now - parsed) / HOUR_MS));
}

/**
 * Upper bound of a Logistics promise, in hours.
 * "1–2 business days" is 48 hours. "Same day or next day" is 48 hours.
 * "1–2 hours" is 2 hours. Unparsed text is not treated as late.
 */
export function promiseHours(etaText: string): number | null {
    const text = String(etaText || '').toLowerCase();
    if (!text) return null;
    if (text.includes('same day') || text.includes('next day')) return 48;
    const range = text.match(/(\d+)\s*(?:–|-|to)\s*(\d+)\s*(hours?|business days?|days?)/);
    if (range) {
        const max = Number(range[2]);
        return range[3].startsWith('hour') ? max : max * 24;
    }
    const single = text.match(/(\d+)\s*(hours?|business days?|days?)/);
    if (single) {
        const value = Number(single[1]);
        return single[2].startsWith('hour') ? value : value * 24;
    }
    return null;
}

export function readFulfillmentWait(order: QueueOrder): FulfillmentWait | null {
    const wait = order.fulfillmentWait;
    if (!wait || typeof wait !== 'object') return null;
    const reason = String(wait.reason || '').trim();
    if (!reason) return null;
    return {
        reason,
        by: String(wait.by || 'Staff').trim() || 'Staff',
        at: String(wait.at || ''),
    };
}

export function zonePromise(order: QueueOrder, zones?: DeliveryZone[]): { etaText: string; hours: number | null } {
    if (isPickupOrder(order)) {
        return { etaText: PICKUP_STORE.etaText, hours: promiseHours(PICKUP_STORE.etaText) };
    }
    const county = String(order.shippingAddress?.county || '');
    const quote = getDeliveryCost(county, 0, zones);
    return { etaText: quote.etaText, hours: promiseHours(quote.etaText) };
}

export function fulfillmentQueueFacts(order: QueueOrder, zones?: DeliveryZone[], now = Date.now()): QueueFacts {
    const method = fulfillmentMethodOf(order);
    const waiting = readFulfillmentWait(order);
    const promise = zonePromise(order, zones);
    const at = packableAt(order);
    const parsed = at ? Date.parse(at) : NaN;
    const elapsed = Number.isFinite(parsed) ? now - parsed : 0;
    const late = !waiting && promise.hours != null && Number.isFinite(parsed) && elapsed > promise.hours * HOUR_MS;
    return {
        packableAt: at,
        hours: hoursSincePackable(order, now),
        method,
        methodLabel: method === 'pickup' ? 'Machakos pickup' : 'Delivery',
        place: method === 'pickup' ? 'Machakos pickup' : (String(order.shippingAddress?.county || '').trim() || 'No county'),
        etaText: promise.etaText,
        late,
        waiting,
    };
}

export function hoursSincePackableLabel(hours: number): string {
    if (hours < 1) return 'Under 1 hour since packable';
    return `${hours} hour${hours === 1 ? '' : 's'} since packable`;
}
