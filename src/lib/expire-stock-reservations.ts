import { adminDb } from '@/lib/firebase-admin';

const BATCH_LIMIT = 50;

function numberOrZero(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

export async function expireStockReservations(limit = BATCH_LIMIT): Promise<{
    expired: number;
    skipped: number;
    errors: number;
}> {
    const nowISO = new Date().toISOString();
    const snapshot = await adminDb
        .collection('orders')
        .where('stockReservationStatus', '==', 'active')
        .where('stockReservationExpiresAt', '<', nowISO)
        .limit(Math.max(1, Math.min(limit, BATCH_LIMIT)))
        .get();

    let expired = 0;
    let skipped = 0;
    let errors = 0;

    for (const orderDoc of snapshot.docs) {
        try {
            const result = await adminDb.runTransaction(async transaction => {
                const orderRef = orderDoc.ref;
                const orderSnap = await transaction.get(orderRef);
                if (!orderSnap.exists) return 'skipped' as const;

                const order: any = orderSnap.data();
                if (order.paymentStatus === 'Paid' || order.stockRestored) return 'skipped' as const;
                if (order.stockReservationStatus !== 'active') return 'skipped' as const;

                const expiresAt = String(order.stockReservationExpiresAt || '');
                if (!expiresAt || expiresAt >= nowISO) return 'skipped' as const;

                const items = Array.isArray(order.items) ? order.items : [];
                const productIds: string[] = [...new Set<string>(items.map((item: any) => String(item.id)))];
                const productRefs = productIds.map(id => adminDb.collection('products').doc(id));
                const productSnaps = productRefs.length > 0
                    ? await transaction.getAll(...productRefs)
                    : [];
                const now = new Date().toISOString();

                for (const productSnap of productSnaps) {
                    if (!productSnap.exists) continue;
                    const product: any = productSnap.data();
                    const productItems = items.filter((item: any) => String(item.id) === productSnap.id);
                    const quantity = productItems.reduce(
                        (sum: number, item: any) => sum + Math.max(0, numberOrZero(item.quantity)),
                        0,
                    );
                    const previousStock = numberOrZero(product.stockQuantity);
                    const nextStock = previousStock + quantity;
                    const variants = Array.isArray(product.variants)
                        ? product.variants.map((variant: any) => {
                            const restoredQuantity = productItems
                                .filter((item: any) => String(item.selectedVariant?.id || '') === String(variant.id))
                                .reduce(
                                    (sum: number, item: any) => sum + Math.max(0, numberOrZero(item.quantity)),
                                    0,
                                );
                            return restoredQuantity > 0
                                ? {
                                    ...variant,
                                    stockQuantity: numberOrZero(variant.stockQuantity ?? variant.stock) + restoredQuantity,
                                }
                                : variant;
                        })
                        : undefined;

                    transaction.update(productSnap.ref, {
                        stockQuantity: nextStock,
                        inStock: nextStock > 0,
                        ...(variants ? { variants } : {}),
                    });
                    transaction.set(adminDb.collection('inventory_history').doc(), {
                        productId: productSnap.id,
                        productName: String(product.name || productItems[0]?.name || 'Product'),
                        previousStock,
                        newStock: nextStock,
                        change: quantity,
                        updatedBy: 'System (Stock reservation expired)',
                        updatedAt: now,
                        orderId: orderDoc.id,
                    });
                }

                transaction.update(orderRef, {
                    status: 'Cancelled',
                    stockReservationStatus: 'expired',
                    stockRestored: true,
                    stockRestoredAt: now,
                    cancelledAt: now,
                    cancelReason: 'Stock reservation expired',
                    updatedAt: now,
                });

                return 'expired' as const;
            });

            if (result === 'expired') expired += 1;
            else skipped += 1;
        } catch (error) {
            errors += 1;
            console.error(`[expire-stock] Failed for order ${orderDoc.id}:`, error);
        }
    }

    return { expired, skipped, errors };
}
