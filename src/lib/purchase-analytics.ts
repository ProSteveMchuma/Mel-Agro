import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { INTELLIGENCE_RETENTION_DAYS } from '@/lib/experimentation';
import { ANALYTICS_SCHEMA_VERSION, purchaseAnalyticsPayload } from '@/lib/storefront-analytics';

const MAX_RECONCILE = 100;

export { ANALYTICS_SCHEMA_VERSION, purchaseAnalyticsPayload };

function safeOrderId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    return id && id.length <= 128 && !id.includes('/') ? id : null;
}

export async function recordPaidPurchase(args: {
    orderId: string;
    order: Record<string, unknown>;
}): Promise<{ recorded: boolean; reason?: string }> {
    const orderId = safeOrderId(args.orderId);
    if (!orderId) return { recorded: false, reason: 'invalid-order-id' };

    const purchaseRef = adminDb.collection('analytics_purchases').doc(orderId);
    const payload = purchaseAnalyticsPayload(orderId, args.order || {});

    const created = await adminDb.runTransaction(async transaction => {
        const existing = await transaction.get(purchaseRef);
        if (existing.exists) return false;
        transaction.create(purchaseRef, {
            ...payload,
            timestamp: FieldValue.serverTimestamp(),
        });
        return true;
    });

    if (!created) return { recorded: false, reason: 'already-recorded' };

    const uniqueProductIds = Array.from(new Set(payload.productIds)).slice(0, 20);
    if (uniqueProductIds.length) {
        const batch = adminDb.batch();
        for (const productId of uniqueProductIds) {
            batch.set(adminDb.collection('analytics_products').doc(productId), {
                schemaVersion: ANALYTICS_SCHEMA_VERSION,
                productId,
                purchases: FieldValue.increment(1),
                lastPurchased: FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        await batch.commit().catch(error => {
            console.warn('Could not increment product purchase analytics:', error);
        });
    }

    return { recorded: true };
}

export async function reconcilePaidPurchases(limit = MAX_RECONCILE): Promise<{ scanned: number; recorded: number }> {
    const cap = Math.min(MAX_RECONCILE, Math.max(1, limit));
    const paid = await adminDb.collection('orders').where('paymentStatus', '==', 'Paid').limit(cap).get();
    if (paid.empty) return { scanned: 0, recorded: 0 };

    const existing = await adminDb.getAll(...paid.docs.map(doc => adminDb.collection('analytics_purchases').doc(doc.id)));
    const retentionCutoff = Date.now() - INTELLIGENCE_RETENTION_DAYS.purchaseReconciliation * 86_400_000;
    let recorded = 0;
    for (let index = 0; index < paid.docs.length; index += 1) {
        if (existing[index]?.exists) continue;
        const data = paid.docs[index].data() as Record<string, unknown>;
        const orderTime = new Date(String(data.paidAt || data.date || '')).getTime();
        if (Number.isFinite(orderTime) && orderTime < retentionCutoff) continue;
        const result = await recordPaidPurchase({
            orderId: paid.docs[index].id,
            order: data,
        });
        if (result.recorded) recorded += 1;
    }
    return { scanned: paid.size, recorded };
}
