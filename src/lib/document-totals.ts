export type TaxSettingsLike = {
    enabled?: boolean;
    taxRate?: number;
};

export type OrderLikeForTotals = {
    total?: number | null;
    subtotal?: number | null;
    shippingCost?: number | null;
    discountAmount?: number | null;
    items?: Array<{ price?: number | null; quantity?: number | null }>;
};

export type DocumentTotals = {
    itemsSubtotal: number;
    discount: number;
    shipping: number;
    /** Merchandise after discount, before shipping. */
    netMerchandise: number;
    taxLabel: string;
    /** Display-only when tax is enabled; 0 when tax is off or not itemized on the order. */
    taxAmount: number;
    taxNote: string | null;
    total: number;
};

function moneyRound(n: number) {
    return Math.max(0, Math.round(Number(n) || 0));
}

/**
 * Checkout stores: total = subtotal + shipping - discount (no separate tax line).
 * Invoice display mirrors that and surfaces tax settings without inventing a second total.
 */
export function computeOrderDocumentTotals(
    order: OrderLikeForTotals,
    tax?: TaxSettingsLike | null,
): DocumentTotals {
    const itemsSubtotal = moneyRound(
        order.subtotal != null && order.subtotal !== undefined
            ? Number(order.subtotal)
            : (order.items || []).reduce(
                (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
                0,
            ),
    );
    const discount = moneyRound(Number(order.discountAmount) || 0);
    const shipping = moneyRound(Number(order.shippingCost) || 0);
    const netMerchandise = Math.max(0, itemsSubtotal - discount);
    const total = moneyRound(
        order.total != null && order.total !== undefined
            ? Number(order.total)
            : netMerchandise + shipping,
    );

    const enabled = Boolean(tax?.enabled);
    const rate = Math.max(0, Number(tax?.taxRate) || 0);
    if (!enabled || rate <= 0) {
        return {
            itemsSubtotal,
            discount,
            shipping,
            netMerchandise,
            taxLabel: 'Tax',
            taxAmount: 0,
            taxNote: null,
            total,
        };
    }

    // Orders are not tax-itemized yet — show inclusive VAT estimate on merchandise only.
    const taxAmount = moneyRound((netMerchandise * rate) / (100 + rate));
    return {
        itemsSubtotal,
        discount,
        shipping,
        netMerchandise,
        taxLabel: `VAT (${rate}%)`,
        taxAmount,
        taxNote: 'VAT estimate included in merchandise prices where applicable.',
        total,
    };
}
