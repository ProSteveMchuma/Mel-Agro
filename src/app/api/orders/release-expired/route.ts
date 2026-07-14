import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const expired = await adminDb.collection('orders')
        .where('reservationExpiresAt', '<=', now)
        .limit(50)
        .get();

    let released = 0;

    for (const candidate of expired.docs) {
        const didRelease = await adminDb.runTransaction(async (transaction) => {
            const orderRef = adminDb.collection('orders').doc(candidate.id);
            const freshOrder = await transaction.get(orderRef);
            const order = freshOrder.data();

            if (!order || order.paymentStatus === 'Paid' || order.status === 'Cancelled' || order.stockRestored) {
                return false;
            }

            const grouped = new Map<string, { quantity: number; variants: Map<string, number> }>();
            for (const item of order.items || []) {
                const productId = String(item.id);
                const entry = grouped.get(productId) || { quantity: 0, variants: new Map<string, number>() };
                entry.quantity += Number(item.quantity) || 0;
                const variantId = item.selectedVariant?.id;
                if (variantId) {
                    entry.variants.set(variantId, (entry.variants.get(variantId) || 0) + (Number(item.quantity) || 0));
                }
                grouped.set(productId, entry);
            }

            const productEntries = [...grouped.entries()];
            const productRefs = productEntries.map(([productId]) => adminDb.collection('products').doc(productId));
            const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

            productEntries.forEach(([productId, quantities], index) => {
                const snapshot = productSnapshots[index];
                if (!snapshot.exists) return;
                const product = snapshot.data() || {};
                const currentStock = Number(product.stockQuantity) || 0;
                const update: Record<string, unknown> = {
                    stockQuantity: currentStock + quantities.quantity,
                    inStock: true,
                };

                if (Array.isArray(product.variants) && quantities.variants.size > 0) {
                    update.variants = product.variants.map((variant: any) => {
                        const restore = quantities.variants.get(variant.id) || 0;
                        if (!restore) return variant;
                        return {
                            ...variant,
                            stockQuantity: (Number(variant.stockQuantity ?? variant.stock) || 0) + restore,
                        };
                    });
                }

                transaction.update(adminDb.collection('products').doc(productId), update);
            });

            transaction.update(orderRef, {
                status: 'Cancelled',
                stockRestored: true,
                stockRestoredAt: now,
                cancellationReason: 'Payment window expired',
                reservationReleasedAt: now,
            });

            return true;
        });

        if (didRelease) released += 1;
    }

    return NextResponse.json({ scanned: expired.size, released });
}
