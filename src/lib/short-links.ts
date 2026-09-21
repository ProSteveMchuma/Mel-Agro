import * as admin from 'firebase-admin';
import { adminDb } from './firebase-admin.ts';
import { SITE_URL } from './site.ts';
import {
    createOrderAccessToken,
    ORDER_ACCESS_TTL_MS,
    phoneAccessKey,
    type OrderAccessAction,
} from './order-access.ts';
import {
    generateShortLinkCode,
    isValidShortLinkCode,
    shortOrderLinkUrl,
} from './short-link-format.ts';

export { generateShortLinkCode, shortOrderLinkUrl, isValidShortLinkCode } from './short-link-format.ts';

const MAX_CREATE_ATTEMPTS = 6;

export type ShortLinkAction = Exclude<OrderAccessAction, 'rs'>;

export type ShortLinkRecord = {
    orderId: string;
    action: ShortLinkAction;
    phoneKey: string;
    expiresAt: number;
    createdAt?: FirebaseFirestore.FieldValue | string;
};

/**
 * Persist an opaque short code that resolves to a signed order action URL.
 * Returns null when phone is missing or Firestore write fails.
 */
export async function createShortOrderLink(args: {
    orderId: string;
    phone?: string | null;
    action: ShortLinkAction;
    now?: number;
}): Promise<{ code: string; url: string; expiresAt: number } | null> {
    const orderId = String(args.orderId || '').trim();
    const phoneKey = phoneAccessKey(args.phone);
    if (!orderId || !phoneKey) return null;

    const now = args.now || Date.now();
    const expiresAt = now + ORDER_ACCESS_TTL_MS[args.action];

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
        const code = generateShortLinkCode();
        const ref = adminDb.collection('shortLinks').doc(code);
        try {
            const created = await adminDb.runTransaction(async (tx) => {
                const existing = await tx.get(ref);
                if (existing.exists) return false;
                tx.set(ref, {
                    orderId,
                    action: args.action,
                    phoneKey,
                    expiresAt,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                } satisfies ShortLinkRecord);
                return true;
            });
            if (created) {
                return { code, url: shortOrderLinkUrl(code), expiresAt };
            }
        } catch (error) {
            console.error('createShortOrderLink failed:', error);
            return null;
        }
    }
    return null;
}

export type ResolveShortLinkResult =
    | { ok: true; orderId: string; action: ShortLinkAction; destination: string; expiresAt: number }
    | { ok: false; status: 404 | 410; message: string };

/**
 * Resolve a short code to a fresh signed deep link (token TTL = remaining link life).
 */
export async function resolveShortOrderLink(
    code: string,
    now = Date.now(),
): Promise<ResolveShortLinkResult> {
    const normalized = String(code || '').trim().toLowerCase();
    if (!isValidShortLinkCode(normalized)) {
        return { ok: false, status: 404, message: 'Short link not found' };
    }

    let snap: FirebaseFirestore.DocumentSnapshot;
    try {
        snap = await adminDb.collection('shortLinks').doc(normalized).get();
    } catch (error) {
        console.error('resolveShortOrderLink failed:', error);
        return { ok: false, status: 404, message: 'Short link not found' };
    }

    if (!snap.exists) {
        return { ok: false, status: 404, message: 'Short link not found' };
    }

    const data = snap.data() as ShortLinkRecord;
    const expiresAt = Number(data.expiresAt) || 0;
    if (!Number.isFinite(expiresAt) || now > expiresAt) {
        return { ok: false, status: 410, message: 'This link has expired' };
    }

    const action = data.action;
    if (action !== 'view' && action !== 'pay' && action !== 'return') {
        return { ok: false, status: 404, message: 'Short link not found' };
    }

    const orderId = String(data.orderId || '').trim();
    const phoneKey = String(data.phoneKey || '').trim();
    if (!orderId || phoneKey.length < 9) {
        return { ok: false, status: 404, message: 'Short link not found' };
    }

    try {
        const token = createOrderAccessToken({
            orderId,
            phone: phoneKey,
            action,
            ttlMs: Math.max(60_000, expiresAt - now),
            now,
        });
        const path = action === 'view' ? `/orders/${orderId}` : `/orders/${orderId}/${action}`;
        return {
            ok: true,
            orderId,
            action,
            expiresAt,
            destination: `${SITE_URL}${path}?t=${encodeURIComponent(token)}`,
        };
    } catch {
        return { ok: false, status: 404, message: 'Short link not found' };
    }
}
