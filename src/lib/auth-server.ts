import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export interface AdminAuthResult {
    ok: boolean;
    uid?: string;
    email?: string;
    message?: string;
}

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return { ok: false, message: 'Missing Authorization header' };

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        const userData = userSnap.data();
        const role = userData?.role || (decoded as any).role;
        if (role !== 'admin' && role !== 'super-admin') {
            return { ok: false, message: 'Admin access required' };
        }
        return { ok: true, uid: decoded.uid, email: decoded.email };
    } catch (e: any) {
        return { ok: false, message: e?.message || 'Invalid token' };
    }
}

export async function requireUser(request: Request): Promise<AdminAuthResult> {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return { ok: false, message: 'Missing Authorization header' };

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return { ok: true, uid: decoded.uid, email: decoded.email };
    } catch (e: any) {
        return { ok: false, message: e?.message || 'Invalid token' };
    }
}

export interface OrderAuthResult extends AdminAuthResult {
    isAdmin?: boolean;
}

export async function requireOrderOwnerOrAdmin(
    request: Request,
    orderId: string
): Promise<OrderAuthResult> {
    const userResult = await requireUser(request);
    if (!userResult.ok) return userResult;

    const userSnap = await adminDb.collection('users').doc(userResult.uid!).get();
    const role = userSnap.data()?.role;
    const isAdmin = role === 'admin' || role === 'super-admin';

    if (isAdmin) {
        return { ok: true, uid: userResult.uid, email: userResult.email, isAdmin: true };
    }

    const orderSnap = await adminDb.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) return { ok: false, message: 'Order not found' };
    if (orderSnap.data()?.userId !== userResult.uid) {
        return { ok: false, message: 'Forbidden — you do not own this order' };
    }

    return { ok: true, uid: userResult.uid, email: userResult.email, isAdmin: false };
}
