import { isPickupOrder } from './pickup.ts';

/** Staff-facing placed time. `date` stays the stored instant. */
export function nairobiPlacedLabel(value?: string | null): string {
    const date = new Date(String(value || ''));
    if (!Number.isFinite(date.getTime())) return '—';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Nairobi',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}`;
}

export type TimelineRow = { label: string; at: string; by?: string };

type HistoryRow = { status?: string; at?: string; by?: string };

export function orderTimeline(order: {
    date?: string | null;
    paidAt?: string | null;
    processingAt?: string | null;
    shippedAt?: string | null;
    readyForCollectionAt?: string | null;
    deliveredAt?: string | null;
    collectedAt?: string | null;
    status?: string | null;
    statusHistory?: HistoryRow[] | null;
    shippingMethod?: string | null;
    shippingAddress?: { method?: string | null } | null;
}): TimelineRow[] {
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const byFor = (status: string) => {
        const hit = [...history].reverse().find((row) => row.status === status && row.by);
        return hit?.by ? String(hit.by) : undefined;
    };
    const placedBy = history.find((row) => row.at && order.date && row.at === order.date)?.by;
    const pickup = isPickupOrder(order);
    const rows: Array<{ label: string; at?: string | null; by?: string }> = [
        { label: 'Placed', at: order.date, by: placedBy ? String(placedBy) : undefined },
        { label: 'Paid', at: order.paidAt },
        { label: 'Packing', at: order.processingAt, by: byFor('Processing') },
        pickup
            ? { label: 'Ready for collection', at: order.readyForCollectionAt, by: byFor('Ready for Collection') }
            : { label: 'Out for delivery', at: order.shippedAt, by: byFor('Shipped') },
        pickup
            ? { label: 'Collected', at: order.collectedAt, by: byFor('Collected') }
            : { label: 'Delivered', at: order.deliveredAt, by: byFor('Delivered') },
    ];
    return rows
        .filter((row) => row.at)
        .map((row) => ({ label: row.label, at: String(row.at), ...(row.by ? { by: row.by } : {}) }));
}

export type DeliveryLine = {
    productId: string;
    variantId?: string | null;
    name?: string;
    quantity: number;
};

export type OrderDelivery = {
    at?: string;
    by?: string;
    method?: 'courier' | 'pickup' | 'shortfall';
    lines?: DeliveryLine[];
    shortfall?: boolean;
    tracking?: { carrier?: string; trackingNumber?: string } | null;
};

type LineItem = {
    id?: string | number;
    name?: string;
    quantity?: number;
    selectedVariant?: { id?: string; name?: string } | null;
};

export function lineKey(productId: string, variantId?: string | null): string {
    return `${productId}::${variantId || ''}`;
}

export function itemLineKey(item: LineItem): string {
    return lineKey(String(item.id || ''), item.selectedVariant?.id || '');
}

export function lineBalances(order: { items?: LineItem[] | null; deliveries?: OrderDelivery[] | null }) {
    const balances = new Map<string, { productId: string; variantId: string; name: string; ordered: number; sent: number; shortfall: number }>();
    for (const item of order.items || []) {
        const productId = String(item.id || '');
        const variantId = String(item.selectedVariant?.id || '');
        const key = lineKey(productId, variantId);
        const current = balances.get(key) || { productId, variantId, name: String(item.name || 'Item'), ordered: 0, sent: 0, shortfall: 0 };
        current.ordered += Math.max(0, Number(item.quantity) || 0);
        if (item.name) current.name = String(item.name);
        balances.set(key, current);
    }
    for (const delivery of order.deliveries || []) {
        const bucket = delivery.shortfall || delivery.method === 'shortfall' ? 'shortfall' : 'sent';
        for (const line of delivery.lines || []) {
            const key = lineKey(String(line.productId || ''), line.variantId || '');
            const current = balances.get(key);
            if (!current) continue;
            current[bucket] += Math.max(0, Number(line.quantity) || 0);
        }
    }
    return [...balances.values()].map((row) => ({
        ...row,
        remaining: Math.max(0, row.ordered - row.sent - row.shortfall),
    }));
}

export function outstandingQuantity(order: { items?: LineItem[] | null; deliveries?: OrderDelivery[] | null }): number {
    return lineBalances(order).reduce((sum, row) => sum + row.remaining, 0);
}

/** Classic whole-order dispatch has no delivery rows, so it can still be marked delivered. */
export function partialBlocksCompletion(order: { items?: LineItem[] | null; deliveries?: OrderDelivery[] | null }): boolean {
    const deliveries = order.deliveries || [];
    if (!deliveries.some((delivery) => !delivery.shortfall && delivery.method !== 'shortfall')) return false;
    return outstandingQuantity(order) > 0;
}

export function partSent(order: { status?: string | null; items?: LineItem[] | null; deliveries?: OrderDelivery[] | null }): boolean {
    if (order.status !== 'Processing' && order.status !== 'Shipped') return false;
    return partialBlocksCompletion(order);
}

export function partialSmsSummary(lines: Array<{ name?: string; quantity: number }>): string {
    return lines
        .filter((line) => line.quantity > 0)
        .map((line) => `${line.quantity} of ${line.name || 'item'}`)
        .join(', ');
}
