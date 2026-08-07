import type { Order } from '@/types';

export type ReorderConfidence = 'high' | 'medium' | 'low';

export interface ReorderPrediction {
    userId: string;
    productId: string;
    productName: string;
    image?: string;
    lastPrice: number;
    recommendedQuantity: number;
    lastPurchasedAt: string;
    expectedAt: string;
    daysUntilExpected: number;
    intervalDays: number;
    confidence: ReorderConfidence;
    reason: string;
}

const DAY_MS = 86_400_000;

function median(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildReorderPredictions(orders: Order[], now = new Date()): ReorderPrediction[] {
    const groups = new Map<string, Array<{ date: Date; item: Order['items'][number] }>>();
    for (const order of orders) {
        if (order.paymentStatus !== 'Paid' || order.status === 'Cancelled') continue;
        const date = new Date(order.date || order.createdAt || '');
        if (Number.isNaN(date.getTime())) continue;
        for (const item of order.items || []) {
            const key = `${order.userId}:${String(item.id)}`;
            const entries = groups.get(key) || [];
            entries.push({ date, item });
            groups.set(key, entries);
        }
    }

    return [...groups.entries()].map(([key, entries]) => {
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());
        const intervals = entries.slice(1).map((entry, index) => Math.max(1, Math.round((entry.date.getTime() - entries[index].date.getTime()) / DAY_MS)));
        const intervalDays = intervals.length ? Math.round(median(intervals)) : 45;
        const confidence: ReorderConfidence = intervals.length >= 2 ? 'high' : intervals.length === 1 ? 'medium' : 'low';
        const last = entries[entries.length - 1];
        const expected = new Date(last.date.getTime() + intervalDays * DAY_MS);
        const daysUntilExpected = Math.ceil((expected.getTime() - now.getTime()) / DAY_MS);
        const [userId, ...productParts] = key.split(':');
        return {
            userId,
            productId: productParts.join(':'),
            productName: last.item.name,
            image: last.item.image,
            lastPrice: Number(last.item.price || 0),
            recommendedQuantity: Math.max(1, Math.round(median(entries.map(entry => Number(entry.item.quantity || 1))))),
            lastPurchasedAt: last.date.toISOString(),
            expectedAt: expected.toISOString(),
            daysUntilExpected,
            intervalDays,
            confidence,
            reason: confidence === 'low'
                ? `Estimated from your last purchase using a ${intervalDays}-day starter interval`
                : `Your purchases of this item are typically ${intervalDays} days apart`,
        };
    }).sort((a, b) => a.daysUntilExpected - b.daysUntilExpected);
}

export function actionableReorders(predictions: ReorderPrediction[]) {
    return predictions.filter(prediction => prediction.daysUntilExpected <= 14 && prediction.daysUntilExpected >= -30);
}
