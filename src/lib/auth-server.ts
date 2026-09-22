import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { AdminPermission, hasAdminPermission } from '@/lib/admin-permissions';

export interface AdminAuthResult {
    ok: boolean;
    uid?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    message?: string;
}

async function verifyAdminFromIdToken(token: string | null | undefined): Promise<AdminAuthResult> {
    if (!token) return { ok: false, message: 'Missing Authorization token' };

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        const userData = userSnap.data();
        const role = userData?.role || (decoded as { role?: string }).role;
        if (role !== 'admin' && role !== 'super-admin') {
            return { ok: false, message: 'Admin access required' };
        }
        return { ok: true, uid: decoded.uid, email: decoded.email, role, permissions: userData?.adminPermissions };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Invalid token';
        return { ok: false, message };
    }
}

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    return verifyAdminFromIdToken(token);
}

export async function requirePermission(request: Request, permission: AdminPermission): Promise<AdminAuthResult> {
    const result = await requireAdmin(request);
    if (!result.ok) return result;
    if (!hasAdminPermission(result.role, result.permissions, permission)) {
        return { ...result, ok: false, message: `Missing required permission: ${permission}` };
    }
    return result;
}

/** Same checks as requirePermission, for server actions that pass a Firebase ID token. */
export async function requirePermissionToken(
    token: string | null | undefined,
    permission: AdminPermission,
): Promise<AdminAuthResult> {
    const result = await verifyAdminFromIdToken(token);
    if (!result.ok) return result;
    if (!hasAdminPermission(result.role, result.permissions, permission)) {
        return { ...result, ok: false, message: `Missing required permission: ${permission}` };
    }
    return result;
}

/** Session-cookie gate for same-origin staff pages (e.g. /preview iframe). */
export async function requirePermissionFromSessionCookie(
    sessionCookie: string | null | undefined,
    permission: AdminPermission,
): Promise<AdminAuthResult> {
    if (!sessionCookie) return { ok: false, message: 'Missing session cookie' };
    try {
        const decoded = await admin.auth().verifySessionCookie(decodeURIComponent(sessionCookie), true);
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        const userData = userSnap.data();
        const role = userData?.role || (decoded as { role?: string }).role;
        if (role !== 'admin' && role !== 'super-admin') {
            return { ok: false, message: 'Admin access required' };
        }
        if (!hasAdminPermission(role, userData?.adminPermissions, permission)) {
            return { ok: false, uid: decoded.uid, email: decoded.email, role, message: `Missing required permission: ${permission}` };
        }
        return { ok: true, uid: decoded.uid, email: decoded.email, role, permissions: userData?.adminPermissions };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Invalid session';
        return { ok: false, message };
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
