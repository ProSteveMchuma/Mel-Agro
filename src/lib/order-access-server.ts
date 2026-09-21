import { adminDb } from '@/lib/firebase-admin';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';
import {
    type OrderAccessAction,
    publicOrderSummary,
    verifyOrderAccessToken,
    verifyReturnSessionToken,
} from '@/lib/order-access';

export async function loadOrderForAccess(orderId: string) {
    const snap = await adminDb.collection('orders').doc(orderId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ref: snap.ref, data: snap.data() || {} };
}

export async function authorizeOrderAction(args: {
    request: Request;
    orderId: string;
    action: Exclude<OrderAccessAction, 'rs'>;
    accessToken?: string | null;
    returnSessionToken?: string | null;
    requireReturnSession?: boolean;
}) {
    const order = await loadOrderForAccess(args.orderId);
    if (!order) {
        return { ok: false as const, status: 404, message: 'Order not found' };
    }

    const owner = await requireOrderOwnerOrAdmin(args.request, args.orderId);
    if (owner.ok) {
        if (args.requireReturnSession) {
            // Owners already authenticated — no extra OTP for logged-in account holders.
            return { ok: true as const, order, via: 'auth' as const, uid: owner.uid };
        }
        return { ok: true as const, order, via: 'auth' as const, uid: owner.uid };
    }

    const token = String(args.accessToken || '').trim();
    if (!token) {
        return { ok: false as const, status: 401, message: 'Sign in or use a valid order link from your SMS' };
    }

    const verified = verifyOrderAccessToken(token, {
        orderId: args.orderId,
        phone: order.data.phone,
        action: args.action,
    });
    if (!verified.ok) {
        return { ok: false as const, status: 401, message: verified.message };
    }

    if (args.requireReturnSession) {
        const session = verifyReturnSessionToken(String(args.returnSessionToken || ''), {
            orderId: args.orderId,
            phone: order.data.phone,
        });
        if (!session.ok) {
            return { ok: false as const, status: 401, message: session.message, otpRequired: true as const };
        }
    }

    return {
        ok: true as const,
        order,
        via: 'token' as const,
        summary: publicOrderSummary(order.data, order.id),
    };
}
