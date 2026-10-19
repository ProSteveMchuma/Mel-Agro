import { mpesaControlVisibility } from './whatsapp-order.ts';

/** Payment values the order document actually stores. */
export const STORED_PAYMENT_STATUSES = [
    'Paid',
    'Unpaid',
    'Pending Verification',
    'Pending WhatsApp',
    'Failed',
    'Refunded',
] as const;

export const STORED_RETURN_STATUSES = ['Requested', 'Approved', 'Rejected'] as const;

const ACCOUNT_HOME_STATUSES = new Set([
    'Pending Payment',
    'Processing',
    'Shipped',
    'Ready for Collection',
]);

const REMEMBERED_ORDER_KEY = 'melagri_open_order';

type OrderIdentity = { id?: string | null; userId?: string | null };

type KeyValueStore = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
};

function browserSession(): KeyValueStore | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
}

/** Cart may be cleared only after this signed-in customer can open the saved order. */
export function customerCanOpenOrder(
    order: OrderIdentity | null | undefined,
    uid: string | null | undefined,
): boolean {
    const id = String(order?.id || '').trim();
    const owner = String(order?.userId || '').trim();
    const viewer = String(uid || '').trim();
    return Boolean(id && owner && viewer && owner === viewer);
}

/** Show a stored payment value. A poll result such as "Pending" is not one of them. */
export function storedPaymentLabel(status?: string | null): string {
    const value = String(status || '').trim();
    if ((STORED_PAYMENT_STATUSES as readonly string[]).includes(value)) return value;
    return 'Unpaid';
}

export function isRetryableMpesaOrder(order: {
    paymentMethod?: string | null;
    paymentStatus?: string | null;
    status?: string | null;
}): boolean {
    const { isStk } = mpesaControlVisibility(order.paymentMethod);
    const paymentStatus = storedPaymentLabel(order.paymentStatus);
    return isStk
        && (paymentStatus === 'Unpaid' || paymentStatus === 'Failed')
        && order.status !== 'Cancelled';
}

export function ordersWithReturn<T extends { returnStatus?: string | null }>(orders: T[]): T[] {
    return orders.filter((order) =>
        (STORED_RETURN_STATUSES as readonly string[]).includes(String(order.returnStatus || '')),
    );
}

/** Newest order the account home should show, including one still waiting for payment. */
export function accountHomeOrder<T extends { status?: string | null }>(orders: T[]): T | null {
    return orders.find((order) => ACCOUNT_HOME_STATUSES.has(String(order.status || ''))) || null;
}

/**
 * Listener rows overlay the server list so a live payment update wins.
 * A remembered checkout order fills a gap when the listener has not delivered it.
 * Rows for another account are left out.
 */
export function mergeCustomerOrders<T extends OrderIdentity & { date?: string | null }>(
    listenerOrders: T[],
    serverOrders: T[],
    remembered: T | null | undefined,
    uid: string | null | undefined,
): T[] {
    const map = new Map<string, T>();
    const add = (order: T | null | undefined) => {
        if (!customerCanOpenOrder(order, uid)) return;
        const id = String(order?.id);
        const prev = map.get(id);
        map.set(id, prev ? { ...prev, ...order } : order as T);
    };
    add(remembered);
    for (const order of serverOrders) add(order);
    for (const order of listenerOrders) add(order);
    return [...map.values()].sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
}

export function rememberOpenableOrder(
    order: Record<string, unknown> | null | undefined,
    storage?: KeyValueStore | null,
): void {
    const target = storage === undefined ? browserSession() : storage;
    if (!target || !order) return;
    const id = String(order.id || '').trim();
    const userId = String(order.userId || '').trim();
    if (!id || !userId) return;
    target.setItem(REMEMBERED_ORDER_KEY, JSON.stringify({
        id,
        userId,
        userName: order.userName || '',
        date: order.date || order.createdAt || new Date().toISOString(),
        total: Number(order.total) || 0,
        shippingCost: Number(order.shippingCost) || 0,
        paymentMethod: order.paymentMethod || 'M-Pesa',
        paymentStatus: storedPaymentLabel(typeof order.paymentStatus === 'string' ? order.paymentStatus : null),
        status: order.status || 'Pending Payment',
        phone: order.phone || '',
        items: Array.isArray(order.items) ? order.items : [],
        shippingAddress: order.shippingAddress || { county: '', details: '' },
        paymentFailureMessage: typeof order.paymentFailureMessage === 'string' ? order.paymentFailureMessage : '',
    }));
}

export function readRememberedOrder<T extends OrderIdentity>(
    uid: string | null | undefined,
    storage?: KeyValueStore | null,
): T | null {
    const target = storage === undefined ? browserSession() : storage;
    if (!target) return null;
    try {
        const parsed = JSON.parse(target.getItem(REMEMBERED_ORDER_KEY) || 'null') as T | null;
        if (!customerCanOpenOrder(parsed, uid)) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function forgetRememberedOrder(storage?: KeyValueStore | null): void {
    const target = storage === undefined ? browserSession() : storage;
    target?.removeItem(REMEMBERED_ORDER_KEY);
}
