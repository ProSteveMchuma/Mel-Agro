import { isActiveFulfillmentStatus } from './pickup.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function isCashOnDelivery(paymentMethod?: string | null): boolean {
    const method = String(paymentMethod || '').toLowerCase();
    return method === 'cod' || method.includes('cash');
}

export function isMpesaPayment(paymentMethod?: string | null): boolean {
    const method = String(paymentMethod || '').toLowerCase();
    return method.includes('m-pesa') || method.includes('mpesa');
}

function placedMs(order: { date?: string | null; createdAt?: string | null }): number {
    const value = Date.parse(String(order.date || order.createdAt || ''));
    return Number.isFinite(value) ? value : NaN;
}

/** Unpaid M-Pesa/card holds older than a day, unless an STK prompt is still in flight. */
export function shouldReleaseUnpaidReservation(
    order: {
        stockReservationStatus?: string | null;
        stockRestored?: boolean | null;
        status?: string | null;
        paymentStatus?: string | null;
        paymentMethod?: string | null;
        date?: string | null;
        createdAt?: string | null;
        paymentInitiatedAt?: string | null;
    },
    now = Date.now(),
): boolean {
    if (order.stockReservationStatus !== 'active' || order.stockRestored) return false;
    if (order.status === 'Cancelled') return false;
    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Refunded') return false;
    if (isCashOnDelivery(order.paymentMethod)) return false;
    const placed = placedMs(order);
    if (!Number.isFinite(placed) || now - placed < DAY_MS) return false;
    const initiated = Date.parse(String(order.paymentInitiatedAt || ''));
    if (Number.isFinite(initiated) && now - initiated < HOUR_MS) return false;
    return true;
}

/** One automatic pay-link text. Cash on delivery is collected later, not reminded. */
export function shouldSendScheduledPaymentReminder(
    order: {
        paymentStatus?: string | null;
        paymentMethod?: string | null;
        status?: string | null;
        reminderCount?: number | null;
        phone?: string | null;
        mpesaPhoneNumber?: string | null;
        date?: string | null;
        createdAt?: string | null;
    },
    now = Date.now(),
): boolean {
    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Refunded') return false;
    if (order.status === 'Cancelled') return false;
    if (isCashOnDelivery(order.paymentMethod) || !isMpesaPayment(order.paymentMethod)) return false;
    if (Number(order.reminderCount || 0) > 0) return false;
    if (!String(order.phone || order.mpesaPhoneNumber || '').trim()) return false;
    const placed = placedMs(order);
    if (!Number.isFinite(placed) || now - placed < 2 * HOUR_MS) return false;
    return true;
}

export function paymentReminderBlockReason(order: {
    paymentStatus?: string | null;
    paymentMethod?: string | null;
}): string | null {
    if (order.paymentStatus === 'Paid') return 'Order is already paid — nothing to remind';
    if (order.paymentStatus === 'Refunded') return 'Order has been refunded';
    if (isCashOnDelivery(order.paymentMethod)) return 'Cash on delivery is collected when the order is delivered or collected';
    return null;
}

/** Paid orders, plus unpaid cash-on-delivery orders already in packing. */
export function canPackOrder(order: {
    status?: string | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
}): boolean {
    if (!isActiveFulfillmentStatus(String(order.status || ''))) return false;
    if (order.paymentStatus === 'Paid') return true;
    return isCashOnDelivery(order.paymentMethod) && order.paymentStatus !== 'Refunded';
}

export function cashSettlementOnFinish(order: {
    paymentMethod?: string | null;
    paymentStatus?: string | null;
}, nextStatus: string): boolean {
    return (nextStatus === 'Delivered' || nextStatus === 'Collected')
        && isCashOnDelivery(order.paymentMethod)
        && order.paymentStatus !== 'Paid'
        && order.paymentStatus !== 'Refunded';
}

export function alertWorkHref(alert: { type?: string | null; entityId?: string | null }): string | null {
    const id = String(alert.entityId || '').trim();
    if (alert.type === 'stock' || alert.type === 'demand') {
        return id ? `/dashboard/admin/products/edit/${id}` : '/dashboard/admin/inventory';
    }
    if (alert.type === 'payment' || alert.type === 'payment_recovery') {
        return id ? `/dashboard/admin/orders/${id}` : '/dashboard/admin/payments';
    }
    if (alert.type === 'fulfillment') {
        return id ? `/dashboard/admin/orders/${id}` : '/dashboard/admin/fulfillment';
    }
    if (alert.type === 'abandoned_cart') return '/dashboard/admin/intelligence/abandoned-carts';
    if (alert.type === 'refund') return '/dashboard/admin/payments';
    return null;
}

export function alertWorkLabel(alert: { type?: string | null }): string {
    if (alert.type === 'stock' || alert.type === 'demand') return 'Open product';
    if (alert.type === 'payment' || alert.type === 'payment_recovery') return 'Open order';
    if (alert.type === 'fulfillment') return 'Open order';
    if (alert.type === 'abandoned_cart') return 'Open carts';
    if (alert.type === 'refund') return 'Open payments';
    return 'Open';
}

export const SNOOZE_MS = DAY_MS;

export function snoozeUntilFrom(now = Date.now()): string {
    return new Date(now + SNOOZE_MS).toISOString();
}

export function alertIsOpen(alert: { status?: string | null; snoozedUntil?: string | null }, now = Date.now()): boolean {
    if (alert.status === 'resolved') return false;
    if (alert.status === 'snoozed') {
        const until = Date.parse(String(alert.snoozedUntil || ''));
        if (Number.isFinite(until) && until > now) return false;
    }
    return true;
}

export function supplyFieldsMissing(data: {
    supplierLeadTimeDays?: unknown;
    safetyStock?: unknown;
    minimumOrderQuantity?: unknown;
}): boolean {
    return !Number.isFinite(Number(data.supplierLeadTimeDays))
        || !Number.isFinite(Number(data.safetyStock))
        || !Number.isFinite(Number(data.minimumOrderQuantity));
}

/** Shop path only. Drop query strings and staff console hits. */
export function normalizeAnalyticsPath(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) return null;
    const path = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    if (path.startsWith('/dashboard') || path.startsWith('/api') || path.startsWith('/_next')) return null;
    return path.slice(0, 120);
}

const COUNTRY_NAMES: Record<string, string> = {
    KE: 'Kenya',
    UG: 'Uganda',
    TZ: 'Tanzania',
    RW: 'Rwanda',
    US: 'United States',
    GB: 'United Kingdom',
    AE: 'United Arab Emirates',
    IN: 'India',
    ZA: 'South Africa',
    NG: 'Nigeria',
};

export function countryName(code?: string | null): string {
    const key = String(code || '').trim().toUpperCase();
    if (!key || key === 'XX' || key === 'T1') return '';
    return COUNTRY_NAMES[key] || key;
}

/** Region from the hosting geo headers already on the visit request. */
export function visitRegionLabel(headers: { get(name: string): string | null }): string {
    const city = headers.get('x-vercel-ip-city');
    const country = countryName(headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry'));
    const region = headers.get('x-vercel-ip-country-region');
    let cityName = '';
    if (city) {
        try { cityName = decodeURIComponent(city).replace(/\+/g, ' ').trim(); } catch { cityName = city.trim(); }
    }
    if (cityName && country) return `${cityName}, ${country}`.slice(0, 80);
    if (region && country) return `${region}, ${country}`.slice(0, 80);
    if (country) return country;
    return 'Unknown';
}

export function rollupVisitBreakdown(
    rows: Array<{ key: string; views: number; uniques: number }>,
    limit = 12,
): Array<{ key: string; views: number; uniques: number }> {
    const totals = new Map<string, { key: string; views: number; uniques: number }>();
    for (const row of rows) {
        const key = row.key.trim();
        if (!key) continue;
        const current = totals.get(key) || { key, views: 0, uniques: 0 };
        current.views += Math.max(0, Number(row.views) || 0);
        current.uniques += Math.max(0, Number(row.uniques) || 0);
        totals.set(key, current);
    }
    return [...totals.values()].sort((a, b) => b.views - a.views || a.key.localeCompare(b.key)).slice(0, limit);
}
