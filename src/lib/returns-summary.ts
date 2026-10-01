export type ReturnSummaryOrder = {
    returnStatus?: string | null;
    returnReason?: string | null;
    returnReviewedAt?: string | null;
    returnRequestedAt?: string | null;
    paymentStatus?: string | null;
    refundStatus?: string | null;
    refundAmount?: number | null;
    total?: number | null;
    items?: Array<{
        id?: string | number | null;
        name?: string | null;
        quantity?: number | null;
        selectedVariant?: { name?: string | null } | null;
    }> | null;
};

export type ReturnedPackRow = {
    product: string;
    pack: string;
    units: number;
    reason: string;
    refundAmount: number | null;
};

function activeLines(order: ReturnSummaryOrder) {
    return (order.items || []).filter((item) => Math.round(Number(item.quantity) || 0) > 0);
}

function refundAmount(order: ReturnSummaryOrder): number | null {
    if (activeLines(order).length !== 1) return null;
    const recorded = Number(order.refundAmount);
    if (Number.isFinite(recorded) && recorded > 0) return Math.round(recorded);
    if (order.paymentStatus === 'Refunded' || order.refundStatus === 'Reversed') {
        return Math.round(Number(order.total) || 0);
    }
    return null;
}

/**
 * Approved returns in the supplied list, summed by product, pack, and reason.
 * Mixed orders add units and reason only. A refund amount is shown when every
 * order in the row is a single product and a refund amount is already stored.
 */
export function returnedPacks(orders: ReturnSummaryOrder[]): ReturnedPackRow[] {
    const groups = new Map<string, ReturnedPackRow & { mixed: boolean; refund: number; sawRefund: boolean }>();
    for (const order of orders) {
        if (order.returnStatus !== 'Approved') continue;
        const reason = String(order.returnReason || '').trim() || 'No reason given';
        const lines = activeLines(order);
        const single = lines.length === 1;
        const money = refundAmount(order);
        for (const item of lines) {
            const product = String(item.name || 'Product').trim() || 'Product';
            const pack = String(item.selectedVariant?.name || '').trim() || '—';
            const units = Math.max(0, Math.round(Number(item.quantity) || 0));
            const key = `${product}::${pack}::${reason}`;
            const current = groups.get(key) || {
                product, pack, units: 0, reason, refundAmount: null, mixed: false, refund: 0, sawRefund: false,
            };
            current.units += units;
            if (!single) current.mixed = true;
            else if (money != null) {
                current.refund += money;
                current.sawRefund = true;
            }
            groups.set(key, current);
        }
    }
    return [...groups.values()]
        .map((row) => ({
            product: row.product,
            pack: row.pack,
            units: row.units,
            reason: row.reason,
            refundAmount: !row.mixed && row.sawRefund ? row.refund : null,
        }))
        .sort((a, b) => b.units - a.units || a.product.localeCompare(b.product));
}
