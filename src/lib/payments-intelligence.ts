// Payments hub helpers — pure aggregations over the orders[] stream and the
// c2bPayments / refunds Firestore docs streamed live by the page.
//
// Mirrors the operational-alerts.ts pattern: aggregate, sort, classify; no
// Firestore calls in here so each function stays trivially testable.

import type { Order } from '@/types';
import { getMpesaErrorMessage } from '@/lib/mpesa';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ──────── C2B records (admin reads /c2bPayments) ─────────────────────────

export interface C2bRecord {
    id: string;
    transID?: string;
    amount?: number;
    billRefNumber?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    transTime?: string;
    matchedOrderId?: string;
    matchReason?: string;
    status?: 'Matched' | 'Unmatched' | 'Ignored';
    recordedAt?: string;
}

export interface UnmatchedC2BSummary {
    rows: C2bRecord[];
    count: number;
    totalKes: number;
}

export function unmatchedC2BSummary(c2bDocs: C2bRecord[]): UnmatchedC2BSummary {
    const rows = c2bDocs
        .filter(d => d.status === 'Unmatched')
        .sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime());
    const totalKes = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { rows, count: rows.length, totalKes: Math.round(totalKes) };
}

export function customerLabel(r: C2bRecord): string {
    const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
    return name || r.phone || 'Unknown';
}

export function ageHours(iso?: string): number {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / HOUR));
}

// ──────── Refund audit (admin reads /refunds) ────────────────────────────

export interface RefundRecord {
    id: string;
    orderId?: string;
    userId?: string;
    amount?: number;
    originalReceipt?: string;
    status?: 'Pending' | 'Reversed' | 'Failed' | 'Timeout';
    initiatedBy?: string;
    initiatedByEmail?: string;
    initiatedAt?: string;
    conversationId?: string;
    originatorConversationId?: string;
    completedAt?: string;
    failureReason?: string;
}

export type RefundFilter = 'all' | 'pending' | 'reversed' | 'failed' | 'stuck';

export interface RefundAuditOut {
    rows: Array<RefundRecord & { isStuck: boolean; ageHours: number }>;
    pendingCount: number;
    stuckCount: number;
    reversedCount: number;
    failedCount: number;
    totalRefundedKes: number;
}

export function refundAudit(refundDocs: RefundRecord[], stuckHours = 48): RefundAuditOut {
    const rows = [...refundDocs]
        .sort((a, b) => new Date(b.initiatedAt || 0).getTime() - new Date(a.initiatedAt || 0).getTime())
        .map(r => {
            const age = ageHours(r.initiatedAt);
            const isStuck = r.status === 'Pending' && age > stuckHours;
            return { ...r, ageHours: age, isStuck };
        });
    const pendingCount = rows.filter(r => r.status === 'Pending').length;
    const stuckCount = rows.filter(r => r.isStuck).length;
    const reversedCount = rows.filter(r => r.status === 'Reversed').length;
    const failedCount = rows.filter(r => r.status === 'Failed' || r.status === 'Timeout').length;
    const totalRefundedKes = rows
        .filter(r => r.status === 'Reversed')
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { rows, pendingCount, stuckCount, reversedCount, failedCount, totalRefundedKes: Math.round(totalRefundedKes) };
}

export function applyRefundFilter(rows: RefundAuditOut['rows'], f: RefundFilter): RefundAuditOut['rows'] {
    if (f === 'all') return rows;
    if (f === 'stuck') return rows.filter(r => r.isStuck);
    if (f === 'pending') return rows.filter(r => r.status === 'Pending');
    if (f === 'reversed') return rows.filter(r => r.status === 'Reversed');
    if (f === 'failed') return rows.filter(r => r.status === 'Failed' || r.status === 'Timeout');
    return rows;
}

// ──────── Stuck STK sessions (computed from orders[]) ────────────────────

export interface StuckStkSession {
    orderId: string;
    userName?: string;
    userEmail?: string;
    phone?: string;
    total: number;
    hoursSinceOrder: number;
    paymentStatus?: string;
    checkoutRequestId?: string;
}

export function stuckStkSessions(orders: Order[], hoursOld = 24): StuckStkSession[] {
    const cutoff = Date.now() - hoursOld * HOUR;
    return orders
        .filter(o => {
            const a = o as any;
            if (!a.checkoutRequestId) return false;
            if (a.paymentStatus === 'Paid') return false;
            const t = new Date(o.date).getTime();
            return Number.isFinite(t) && t < cutoff;
        })
        .map(o => {
            const a = o as any;
            return {
                orderId: o.id,
                userName: a.userName,
                userEmail: a.userEmail,
                phone: a.phone,
                total: Number(o.total) || 0,
                hoursSinceOrder: Math.floor((Date.now() - new Date(o.date).getTime()) / HOUR),
                paymentStatus: a.paymentStatus,
                checkoutRequestId: a.checkoutRequestId,
            };
        })
        .sort((a, b) => b.hoursSinceOrder - a.hoursSinceOrder);
}

// ──────── Failure breakdown by Daraja result code ────────────────────────

export interface FailureBucket {
    code: string;
    label: string;       // human-readable from getMpesaErrorMessage
    count: number;
    recentOrders: Array<{ id: string; date: string; total: number; userName?: string }>;
}

export function failureBreakdown(orders: Order[], days = 30): FailureBucket[] {
    const cutoff = Date.now() - days * DAY;
    const failures = orders.filter(o => {
        const a = o as any;
        if (a.paymentStatus !== 'Failed' && !a.paymentFailureCode) return false;
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= cutoff;
    });

    const map = new Map<string, FailureBucket>();
    for (const o of failures) {
        const a = o as any;
        const code = String(a.paymentFailureCode ?? a.paymentFailureReason ?? 'Unknown');
        const cur = map.get(code) || {
            code,
            label: getMpesaErrorMessage(code),
            count: 0,
            recentOrders: [],
        };
        cur.count += 1;
        if (cur.recentOrders.length < 3) {
            cur.recentOrders.push({
                id: o.id,
                date: o.date,
                total: Number(o.total) || 0,
                userName: a.userName,
            });
        }
        map.set(code, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ──────── Headline KPIs ──────────────────────────────────────────────────

export interface PaymentKpis {
    revenuePeriod: number;
    paidCountPeriod: number;
    failedPaymentsPeriod: number;
    refundRate7d: number;       // %
    unmatchedC2BCount: number;
    unmatchedC2BTotal: number;  // KES
    stuckStkCount: number;
    stuckRefundsCount: number;
}

export function paymentKpis(args: {
    rangedOrders: Order[];        // orders already filtered by the page-level period filter
    allOrders: Order[];            // unfiltered, for current-state checks
    c2b: C2bRecord[];
    refunds: RefundRecord[];
    stuckHours?: number;
}): PaymentKpis {
    const { rangedOrders, allOrders, c2b, refunds, stuckHours = 48 } = args;

    const paid = rangedOrders.filter(o => (o as any).paymentStatus === 'Paid');
    const revenuePeriod = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const paidCountPeriod = paid.length;
    const failedPaymentsPeriod = rangedOrders.filter(o => (o as any).paymentStatus === 'Failed').length;

    // 7-day refund rate (always relative to last 7 days, regardless of period)
    const sevenDayCutoff = Date.now() - 7 * DAY;
    const last7d = allOrders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= sevenDayCutoff;
    });
    const last7dPaidOrRefunded = last7d.filter(o => {
        const a = o as any;
        return a.paymentStatus === 'Paid' || a.paymentStatus === 'Refunded' || a.refundStatus === 'Reversed';
    });
    const last7dRevenue = last7dPaidOrRefunded.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const last7dRefunded = last7d
        .filter(o => (o as any).refundStatus === 'Reversed' || (o as any).paymentStatus === 'Refunded')
        .reduce((s, o) => s + (Number((o as any).refundAmount || o.total) || 0), 0);
    const refundRate7d = last7dRevenue > 0 ? (last7dRefunded / last7dRevenue) * 100 : 0;

    const unmatchedRows = c2b.filter(d => d.status === 'Unmatched');
    const unmatchedC2BCount = unmatchedRows.length;
    const unmatchedC2BTotal = Math.round(unmatchedRows.reduce((s, r) => s + (Number(r.amount) || 0), 0));

    const stuckStkCount = stuckStkSessions(allOrders, 24).length;
    const stuckRefundsCount = refunds.filter(r => {
        if (r.status !== 'Pending') return false;
        return ageHours(r.initiatedAt) > stuckHours;
    }).length;

    return {
        revenuePeriod: Math.round(revenuePeriod),
        paidCountPeriod,
        failedPaymentsPeriod,
        refundRate7d,
        unmatchedC2BCount,
        unmatchedC2BTotal,
        stuckStkCount,
        stuckRefundsCount,
    };
}
