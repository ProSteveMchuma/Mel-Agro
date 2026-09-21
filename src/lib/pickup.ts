import { SITE_NAME } from './site.ts';

/** In-store collection is available in Machakos only. */
export const PICKUP_STORE = {
    name: `${SITE_NAME} Machakos Collection Point`,
    label: 'Machakos Town, Machakos County',
    county: 'Machakos',
    town: 'Machakos',
    address: 'Machakos Town collection point',
    etaText: 'Ready for collection in 1–2 hours',
    availabilityNote: 'Pickup is available in Machakos only',
} as const;

export type FulfillmentMethod = 'delivery' | 'pickup';

export function isPickupOrder(order: {
    shippingMethod?: string | null;
    shippingAddress?: { method?: string | null } | null;
}): boolean {
    const method = String(order.shippingMethod || order.shippingAddress?.method || '').toLowerCase();
    return method === 'pickup' || method === 'collection';
}

export function fulfillmentMethodOf(order: {
    shippingMethod?: string | null;
    shippingAddress?: { method?: string | null } | null;
}): FulfillmentMethod {
    return isPickupOrder(order) ? 'pickup' : 'delivery';
}

/** Customer-facing status labels (pickup uses collection language). */
export function statusLabelForOrder(
    status: string,
    order?: { shippingMethod?: string | null; shippingAddress?: { method?: string | null } | null },
): string {
    if (order && isPickupOrder(order)) {
        if (status === 'Shipped' || status === 'Ready for Collection') return 'Ready for collection';
        if (status === 'Delivered' || status === 'Collected') return 'Collected';
        if (status === 'Processing') return 'Preparing for collection';
        if (status === 'Pending Payment') return 'Awaiting payment';
    }
    if (status === 'Pending Payment') return 'Awaiting payment';
    if (status === 'Processing') return 'Preparing your order';
    if (status === 'Shipped') return 'Out for delivery';
    if (status === 'Delivered') return 'Delivered';
    if (status === 'Cancelled') return 'Cancelled';
    return status;
}

export const DELIVERY_FULFILLMENT_STATUSES = ['Processing', 'Shipped', 'Delivered'] as const;
export const PICKUP_FULFILLMENT_STATUSES = ['Processing', 'Ready for Collection', 'Collected'] as const;

export function fulfillmentStepsFor(order: {
    shippingMethod?: string | null;
    shippingAddress?: { method?: string | null } | null;
}): readonly string[] {
    return isPickupOrder(order) ? PICKUP_FULFILLMENT_STATUSES : DELIVERY_FULFILLMENT_STATUSES;
}

/** Allowed next status from current (paid orders). */
export function nextFulfillmentStatus(
    order: {
        status?: string | null;
        shippingMethod?: string | null;
        shippingAddress?: { method?: string | null } | null;
    },
): string | null {
    const status = String(order.status || '');
    if (isPickupOrder(order)) {
        if (status === 'Processing') return 'Ready for Collection';
        if (status === 'Ready for Collection') return 'Collected';
        // Legacy pickup orders that were shipped under delivery statuses
        if (status === 'Shipped') return 'Collected';
        return null;
    }
    if (status === 'Processing') return 'Shipped';
    if (status === 'Shipped') return 'Delivered';
    return null;
}

export function isActiveFulfillmentStatus(status: string): boolean {
    return ['Processing', 'Shipped', 'Ready for Collection'].includes(status);
}

export function awardsLoyaltyOnStatus(status: string): boolean {
    return status === 'Delivered' || status === 'Collected';
}
