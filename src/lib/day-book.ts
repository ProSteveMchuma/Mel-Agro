import { isCashOnDelivery } from './commerce-ops.ts';

export type MoneyCount = { count: number; total: number };

export type DayBook = {
    day: string;
    mpesaExpress: MoneyCount;
    till: MoneyCount & { unmatchedCount: number; unmatchedTotal: number };
    cash: MoneyCount & { stillOutCount: number; stillOutTotal: number };
    card: MoneyCount;
};

export type BookMethod = 'stk' | 'till' | 'cod' | 'card';

type BookOrder = {
    date?: string | null;
    paidAt?: string | null;
    total?: number | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    status?: string | null;
};

type TillRow = { amount?: number | null };

const PACKED_OR_OUT = new Set(['Shipped', 'Ready for Collection', 'Delivered', 'Collected']);

/** Africa/Nairobi calendar day as YYYY-MM-DD. */
export function nairobiDayKey(value: Date | string | number = new Date()): string | null {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

/** STK, Buy Goods, cash, or card. Till is checked before generic M-Pesa. */
export function bookPaymentMethod(method?: string | null): BookMethod | null {
    const value = String(method || '').toLowerCase();
    if (!value) return null;
    if (value.includes('card') || value.includes('paystack')) return 'card';
    if (isCashOnDelivery(method)) return 'cod';
    if (value.includes('till') || value.includes('buy goods') || value.includes('c2b') || value.includes('manual')) return 'till';
    if (value.includes('m-pesa') || value.includes('mpesa') || value.includes('stk')) return 'stk';
    return null;
}

function paidOnDay(order: BookOrder, day: string): boolean {
    if (order.paymentStatus !== 'Paid') return false;
    return nairobiDayKey(String(order.paidAt || order.date || '')) === day;
}

function add(bucket: MoneyCount, total: number) {
    bucket.count += 1;
    bucket.total += Math.round(Number(total) || 0);
}

/**
 * One Nairobi day: what was marked paid, by the four methods this shop collects,
 * plus till money still unmatched and cash still out on a packed order.
 */
export function nairobiDayBook(input: {
    orders: BookOrder[];
    unmatchedTill?: TillRow[];
    day: string;
}): DayBook {
    const book: DayBook = {
        day: input.day,
        mpesaExpress: { count: 0, total: 0 },
        till: { count: 0, total: 0, unmatchedCount: 0, unmatchedTotal: 0 },
        cash: { count: 0, total: 0, stillOutCount: 0, stillOutTotal: 0 },
        card: { count: 0, total: 0 },
    };
    for (const row of input.unmatchedTill || []) {
        book.till.unmatchedCount += 1;
        book.till.unmatchedTotal += Math.round(Number(row.amount) || 0);
    }
    for (const order of input.orders) {
        const method = bookPaymentMethod(order.paymentMethod);
        const total = Number(order.total) || 0;
        if (paidOnDay(order, input.day)) {
            if (method === 'stk') add(book.mpesaExpress, total);
            else if (method === 'till') add(book.till, total);
            else if (method === 'cod') add(book.cash, total);
            else if (method === 'card') add(book.card, total);
        }
        if (
            method === 'cod'
            && order.paymentStatus !== 'Paid'
            && order.paymentStatus !== 'Refunded'
            && PACKED_OR_OUT.has(String(order.status || ''))
        ) {
            book.cash.stillOutCount += 1;
            book.cash.stillOutTotal += Math.round(total);
        }
    }
    return book;
}
