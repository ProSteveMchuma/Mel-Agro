import type { DocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

function numberOrZero(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

export type StockLine = {
    productId: string;
    variantId?: string;
    quantity: number;
    name?: string;
};

export function linesFromOrderItems(items: unknown): StockLine[] {
    if (!Array.isArray(items)) return [];
    const grouped = new Map<string, StockLine>();
    for (const raw of items) {
        const item = raw as { id?: string | number; quantity?: number; name?: string; selectedVariant?: { id?: string } | null };
        const productId = String(item.id || '');
        if (!productId) continue;
        const variantId = item.selectedVariant?.id ? String(item.selectedVariant.id) : '';
        const key = `${productId}::${variantId}`;
        const current = grouped.get(key) || { productId, ...(variantId ? { variantId } : {}), quantity: 0, name: item.name };
        current.quantity += Math.max(0, numberOrZero(item.quantity));
        if (item.name) current.name = String(item.name);
        grouped.set(key, current);
    }
    return [...grouped.values()].filter((line) => line.quantity > 0);
}

/** Puts line quantities back on the parent product and matching variant. */
export function writeStockIncrease(
    transaction: Transaction,
    snaps: DocumentSnapshot[],
    lines: StockLine[],
    meta: { orderId: string; updatedBy: string; now: string; historyType: string },
) {
    for (const snapshot of snaps) {
        if (!snapshot.exists) continue;
        const product = snapshot.data() || {};
        const productLines = lines.filter((line) => line.productId === snapshot.id);
        const quantity = productLines.reduce((sum, line) => sum + line.quantity, 0);
        if (quantity <= 0) continue;
        const previousStock = numberOrZero(product.stockQuantity);
        const nextStock = previousStock + quantity;
        const variants = Array.isArray(product.variants) ? product.variants.map((variant: { id?: string; stockQuantity?: number; stock?: number }) => {
            const restored = productLines
                .filter((line) => String(line.variantId || '') === String(variant.id))
                .reduce((sum, line) => sum + line.quantity, 0);
            return restored > 0
                ? { ...variant, stockQuantity: numberOrZero(variant.stockQuantity ?? variant.stock) + restored }
                : variant;
        }) : undefined;
        transaction.update(snapshot.ref, {
            stockQuantity: nextStock,
            inStock: nextStock > 0,
            ...(variants ? { variants } : {}),
        });
        transaction.set(adminDb.collection('inventory_history').doc(), {
            productId: snapshot.id,
            productName: String(product.name || productLines[0]?.name || 'Product'),
            previousStock,
            newStock: nextStock,
            change: quantity,
            type: meta.historyType,
            updatedBy: meta.updatedBy,
            updatedAt: meta.now,
            orderId: meta.orderId,
        });
    }
}
