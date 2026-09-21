import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from './site.ts';

export type OrderAccessAction = 'view' | 'pay' | 'return' | 'rs';

export const ORDER_ACCESS_TTL_MS: Record<Exclude<OrderAccessAction, 'rs'>, number> = {
    view: 14 * 24 * 60 * 60 * 1000,
    pay: 48 * 60 * 60 * 1000,
    return: 14 * 24 * 60 * 60 * 1000,
};

export const RETURN_SESSION_TTL_MS = 15 * 60 * 1000;

function accessSecret(): string {
    return (
        process.env.ORDER_ACCESS_SECRET ||
        process.env.OTP_PEPPER ||
        process.env.FIREBASE_PRIVATE_KEY ||
        'melagri-order-access-dev'
    ).slice(0, 120);
}

export function phoneAccessKey(raw?: string | null): string {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 9) return '';
    return digits.slice(-9);
}

function sign(payload: string): string {
    return createHmac('sha256', accessSecret()).update(payload).digest('base64url').slice(0, 22);
}

function safeEqual(left: string, right: string): boolean {
    try {
        const a = Buffer.from(left);
        const b = Buffer.from(right);
        if (a.length === 0 || a.length !== b.length) return false;
        return timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export function createOrderAccessToken(args: {
    orderId: string;
    phone?: string | null;
    action: OrderAccessAction;
    ttlMs?: number;
    now?: number;
}): string {
    const orderId = String(args.orderId || '').trim();
    const phoneKey = phoneAccessKey(args.phone);
    if (!orderId || !phoneKey) {
        throw new Error('Order access token requires orderId and phone');
    }
    const exp = (args.now || Date.now()) + (args.ttlMs ?? (args.action === 'rs' ? RETURN_SESSION_TTL_MS : ORDER_ACCESS_TTL_MS[args.action]));
    const payload = `${orderId}.${args.action}.${exp}.${phoneKey}`;
    return `${payload}.${sign(payload)}`;
}

export function verifyOrderAccessToken(token: string, args: {
    orderId: string;
    phone?: string | null;
    action: OrderAccessAction;
    now?: number;
}): { ok: true; exp: number } | { ok: false; message: string } {
    const parts = String(token || '').split('.');
    if (parts.length !== 5) return { ok: false, message: 'Invalid access link' };

    const [orderId, action, expRaw, phoneKey, signature] = parts;
    if (orderId !== args.orderId) return { ok: false, message: 'Access link does not match this order' };
    if (action !== args.action) return { ok: false, message: 'Access link is for a different action' };

    const expectedPhone = phoneAccessKey(args.phone);
    if (!expectedPhone || phoneKey !== expectedPhone) {
        return { ok: false, message: 'Access link does not match this order contact' };
    }

    const payload = `${orderId}.${action}.${expRaw}.${phoneKey}`;
    if (!safeEqual(signature, sign(payload))) {
        return { ok: false, message: 'Access link is invalid or tampered' };
    }

    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || (args.now || Date.now()) > exp) {
        return { ok: false, message: 'This access link has expired' };
    }

    return { ok: true, exp };
}

export function createReturnSessionToken(args: {
    orderId: string;
    phone?: string | null;
    now?: number;
}): string {
    return createOrderAccessToken({
        orderId: args.orderId,
        phone: args.phone,
        action: 'rs',
        ttlMs: RETURN_SESSION_TTL_MS,
        now: args.now,
    });
}

export function verifyReturnSessionToken(token: string, args: {
    orderId: string;
    phone?: string | null;
    now?: number;
}): { ok: true } | { ok: false; message: string } {
    const verified = verifyOrderAccessToken(String(token || ''), {
        orderId: args.orderId,
        phone: args.phone,
        action: 'rs',
        now: args.now,
    });
    if (!verified.ok) {
        return { ok: false, message: verified.message === 'Access link is for a different action'
            ? 'Verify the SMS code before continuing with this return.'
            : verified.message };
    }
    return { ok: true };
}

export function customerOrderUrl(
    order: { id?: string; phone?: string | null },
    action: Exclude<OrderAccessAction, 'rs'> = 'view',
): string {
    const orderId = String(order.id || '').trim();
    if (!orderId) return `${SITE_URL}/dashboard/user`;

    try {
        const token = createOrderAccessToken({
            orderId,
            phone: order.phone,
            action,
        });
        const path = action === 'view'
            ? `/orders/${orderId}`
            : `/orders/${orderId}/${action}`;
        return `${SITE_URL}${path}?t=${encodeURIComponent(token)}`;
    } catch {
        // Fallback if phone missing — still better than a dead link.
        return `${SITE_URL}/dashboard/user?tab=${action === 'return' ? 'returns' : 'orders'}&orderId=${orderId}`;
    }
}

/** Attach signed action URLs for CommunicationTemplates on the server. */
export function withActionUrls<T extends { id?: string; phone?: string | null }>(order: T): T & {
    __actionUrls: Record<Exclude<OrderAccessAction, 'rs'>, string>;
} {
    return {
        ...order,
        __actionUrls: {
            view: customerOrderUrl(order, 'view'),
            pay: customerOrderUrl(order, 'pay'),
            return: customerOrderUrl(order, 'return'),
        },
    };
}

export function isReturnEligible(order: {
    status?: string | null;
    returnStatus?: string | null;
    deliveredAt?: string | null;
}): { ok: true } | { ok: false; message: string } {
    if (order.returnStatus) {
        return { ok: false, message: `A return is already ${String(order.returnStatus).toLowerCase()}` };
    }
    if (order.status !== 'Delivered') {
        return { ok: false, message: 'Returns are only available after delivery' };
    }
    const deliveredAt = order.deliveredAt;
    if (deliveredAt) {
        const elapsed = Date.now() - new Date(deliveredAt).getTime();
        if (!Number.isFinite(elapsed) || elapsed > 7 * 24 * 60 * 60 * 1000) {
            return { ok: false, message: 'The 7-day return window has closed' };
        }
    }
    return { ok: true };
}

export function publicOrderSummary(order: Record<string, any>, orderId: string) {
    const eligibility = isReturnEligible(order);
    return {
        id: orderId,
        shortId: orderId.slice(0, 8).toUpperCase(),
        userName: order.userName || 'Farmer',
        phoneMasked: maskPhone(order.phone),
        date: order.date || order.createdAt || null,
        deliveredAt: order.deliveredAt || null,
        status: order.status || 'Pending Payment',
        paymentStatus: order.paymentStatus || 'Unpaid',
        paymentMethod: order.paymentMethod || null,
        total: Number(order.total) || 0,
        shippingCost: Number(order.shippingCost) || 0,
        shippingMethod: order.shippingMethod || order.shippingAddress?.method || null,
        shippingAddress: order.shippingAddress
            ? {
                county: order.shippingAddress.county || '',
                details: order.shippingAddress.details || '',
                method: order.shippingAddress.method || null,
            }
            : null,
        items: Array.isArray(order.items)
            ? order.items.map((item: any) => ({
                id: String(item.id || ''),
                name: String(item.name || 'Item'),
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
            }))
            : [],
        returnStatus: order.returnStatus || null,
        returnReason: order.returnReason || null,
        returnEligible: eligibility.ok,
        returnBlockedReason: eligibility.ok ? null : eligibility.message,
        mpesaReceiptNumber: order.mpesaReceiptNumber || order.transactionId || null,
    };
}

function maskPhone(raw?: string | null): string {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 4) return '****';
    return `*** *** ${digits.slice(-3)}`;
}
