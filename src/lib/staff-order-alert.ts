import { normalizeKenyanPhone } from './account-upgrade.ts';
import { isPickupOrder } from './pickup.ts';
import { SITE_URL } from './site.ts';

/** Fallback when Settings → Notifications has no saved staff number. */
export const DEFAULT_STAFF_ORDER_ALERT_PHONE = '+254714657108';

export function resolveStaffOrderAlertPhone(raw: unknown): string {
    const value = String(raw || '').trim();
    if (!value) return DEFAULT_STAFF_ORDER_ALERT_PHONE;
    try {
        return normalizeKenyanPhone(value);
    } catch {
        return DEFAULT_STAFF_ORDER_ALERT_PHONE;
    }
}

export function parseStaffOrderAlertPhone(raw: string): string {
    return normalizeKenyanPhone(String(raw || '').trim());
}

type AlertOrder = {
    id?: string | null;
    userName?: string | null;
    phone?: string | null;
    total?: number | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    shippingMethod?: string | null;
    shippingAddress?: { county?: string | null; method?: string | null } | null;
};

/** One SMS to staff when a new order document is created. */
export function staffOrderAlertMessage(order: AlertOrder): string {
    const id = String(order.id || '').slice(0, 5).toUpperCase();
    const name = String(order.userName || 'Customer').trim() || 'Customer';
    const phone = String(order.phone || '').trim() || 'no phone';
    const place = isPickupOrder(order)
        ? 'Machakos pickup'
        : (String(order.shippingAddress?.county || '').trim() || 'Delivery');
    const pay = `${String(order.paymentStatus || 'Unpaid').trim()} ${String(order.paymentMethod || '').trim()}`.trim();
    const total = Number(order.total) || 0;
    const link = `${SITE_URL}/dashboard/admin/orders/${order.id}`;
    return `New Mel-Agri order #${id}. KES ${total.toLocaleString()}. ${name} · ${phone}. ${place}. ${pay}. ${link}`;
}
