import { computeOrderDocumentTotals, type TaxSettingsLike } from './document-totals.ts';
import { getDeliveryCost } from './delivery.ts';
import { isPickupOrder } from './pickup.ts';
import { bookPaymentMethod, type BookMethod } from './day-book.ts';

export type SalesBookOrder = {
    id?: string;
    date?: string | null;
    userName?: string | null;
    userEmail?: string | null;
    userId?: string | null;
    total?: number | null;
    subtotal?: number | null;
    shippingCost?: number | null;
    discountAmount?: number | null;
    couponCode?: string | null;
    couponDiscount?: number | null;
    paymentMethod?: string | null;
    paymentStatus?: string | null;
    status?: string | null;
    refundStatus?: string | null;
    refundAmount?: number | null;
    shippingMethod?: string | null;
    shippingAddress?: { county?: string | null; method?: string | null } | null;
    items?: Array<{
        name?: string | null;
        price?: number | null;
        quantity?: number | null;
        selectedVariant?: { name?: string | null } | null;
    }> | null;
};

export type SalesBook = {
    goodsAfterDiscount: number;
    deliveryFees: number;
    discountsGiven: number;
    refunds: number;
    net: number;
    vatEstimate: number;
    methods: Record<BookMethod, { count: number; total: number }>;
    products: Array<{ name: string; pack: string; units: number; amount: number }>;
    codes: Array<{ code: string; times: number; amount: number }>;
    zones: Array<{ zone: string; amount: number }>;
};

function roundMoney(value: number) {
    return Math.max(0, Math.round(Number(value) || 0));
}

export function isRefundedOrder(order: { paymentStatus?: string | null; refundStatus?: string | null }): boolean {
    return order.refundStatus === 'Reversed' || order.paymentStatus === 'Refunded';
}

export function refundKes(order: SalesBookOrder): number {
    if (!isRefundedOrder(order)) return 0;
    const amount = Number(order.refundAmount);
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount);
    return roundMoney(Number(order.total) || 0);
}

function isSale(order: SalesBookOrder): boolean {
    return order.paymentStatus === 'Paid' || isRefundedOrder(order);
}

function emptyMethods(): SalesBook['methods'] {
    return {
        stk: { count: 0, total: 0 },
        till: { count: 0, total: 0 },
        cod: { count: 0, total: 0 },
        card: { count: 0, total: 0 },
    };
}

/**
 * The book lines for a Nairobi range. Checkout totals are not changed.
 * VAT is the inclusive estimate already on the invoice, summed and labelled estimate.
 * Refunds stay on the order: product rows are paid units only.
 */
export function buildSalesBook(orders: SalesBookOrder[], tax?: TaxSettingsLike | null): SalesBook {
    const book: SalesBook = {
        goodsAfterDiscount: 0,
        deliveryFees: 0,
        discountsGiven: 0,
        refunds: 0,
        net: 0,
        vatEstimate: 0,
        methods: emptyMethods(),
        products: [],
        codes: [],
        zones: [],
    };
    const products = new Map<string, { name: string; pack: string; units: number; amount: number }>();
    const codes = new Map<string, { code: string; times: number; amount: number }>();
    const zones = new Map<string, number>();

    for (const order of orders) {
        book.refunds += refundKes(order);
        if (!isSale(order)) continue;
        const totals = computeOrderDocumentTotals({
            total: order.total,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            discountAmount: order.discountAmount,
            items: order.items || [],
        }, tax);
        book.goodsAfterDiscount += totals.netMerchandise;
        book.deliveryFees += totals.shipping;
        book.discountsGiven += totals.discount;
        book.vatEstimate += totals.taxAmount;

        const code = String(order.couponCode || '').trim();
        if (code) {
            const given = Number(order.couponDiscount ?? order.discountAmount) || 0;
            const current = codes.get(code) || { code, times: 0, amount: 0 };
            current.times += 1;
            current.amount += roundMoney(given);
            codes.set(code, current);
        }

        const zone = isPickupOrder(order)
            ? 'Machakos pickup'
            : getDeliveryCost(String(order.shippingAddress?.county || ''), 0).zoneName;
        zones.set(zone, (zones.get(zone) || 0) + totals.shipping);

        if (order.paymentStatus !== 'Paid') continue;
        const method = bookPaymentMethod(order.paymentMethod);
        if (method) {
            book.methods[method].count += 1;
            book.methods[method].total += roundMoney(Number(order.total) || 0);
        }
        for (const item of order.items || []) {
            const name = String(item.name || 'Product').trim() || 'Product';
            const pack = String(item.selectedVariant?.name || '').trim() || '—';
            const units = Math.max(0, Math.round(Number(item.quantity) || 0));
            const amount = roundMoney((Number(item.price) || 0) * (Number(item.quantity) || 0));
            const key = `${name}::${pack}`;
            const current = products.get(key) || { name, pack, units: 0, amount: 0 };
            current.units += units;
            current.amount += amount;
            products.set(key, current);
        }
    }

    book.net = book.goodsAfterDiscount + book.deliveryFees - book.refunds;
    book.products = [...products.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
    book.codes = [...codes.values()].sort((a, b) => b.amount - a.amount || a.code.localeCompare(b.code));
    book.zones = [...zones.entries()]
        .map(([zone, amount]) => ({ zone, amount }))
        .sort((a, b) => a.zone.localeCompare(b.zone));
    return book;
}

function csvCell(value: unknown) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function line(cells: unknown[]) {
    return cells.map(csvCell).join(',');
}

/** Order rows plus the book lines. No street, card number, or tax identifier. */
export function salesBookCsv(orders: SalesBookOrder[], book: SalesBook): string {
    const header = [
        'Order ID', 'Date', 'Customer', 'County', 'Payment method', 'Payment status', 'Fulfillment status',
        'Gross total', 'Goods after discount', 'Delivery fee', 'Discount', 'Discount code', 'Refund status', 'Refund amount',
    ];
    const rows = orders.map((order) => {
        const totals = computeOrderDocumentTotals({
            total: order.total,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            discountAmount: order.discountAmount,
            items: order.items || [],
        });
        return [
            order.id || '',
            order.date || '',
            order.userName || order.userEmail || order.userId || 'Guest',
            isPickupOrder(order) ? 'Machakos pickup' : (order.shippingAddress?.county || ''),
            order.paymentMethod || '',
            order.paymentStatus || 'Unpaid',
            order.status || '',
            order.total || 0,
            totals.netMerchandise,
            totals.shipping,
            totals.discount,
            order.couponCode || '',
            order.refundStatus || '',
            order.refundAmount || 0,
        ];
    });
    const methodRows: Array<[string, number, number]> = [
        ['M-Pesa Express', book.methods.stk.count, book.methods.stk.total],
        ['Till 3130847', book.methods.till.count, book.methods.till.total],
        ['Cash on delivery', book.methods.cod.count, book.methods.cod.total],
        ['Card', book.methods.card.count, book.methods.card.total],
    ];
    const sections = [
        line(header),
        ...rows.map(line),
        '',
        line(['Books']),
        line(['Line', 'Amount']),
        line(['Goods after discount', book.goodsAfterDiscount]),
        line(['Delivery fees', book.deliveryFees]),
        line(['Discounts given', book.discountsGiven]),
        line(['Refunds', book.refunds]),
        line(['Net', book.net]),
        line(['VAT estimate', book.vatEstimate]),
        '',
        line(['Payment methods', 'Orders', 'Total']),
        ...methodRows.map((row) => line(row)),
        '',
        line(['Product', 'Pack', 'Paid units', 'Paid amount']),
        ...book.products.map((row) => line([row.name, row.pack, row.units, row.amount])),
        '',
        line(['Discount code', 'Times used', 'KES given away']),
        ...book.codes.map((row) => line([row.code, row.times, row.amount])),
        '',
        line(['Zone', 'Delivery fees']),
        ...book.zones.map((row) => line([row.zone, row.amount])),
    ];
    return sections.join('\r\n');
}
