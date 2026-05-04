// Customer Intelligence — RFM segmentation, LTV, churn risk.
// Operates on the orders[] streamed by OrderContext (admin already gets all orders).

import type { Order } from '@/types';

export interface CustomerProfile {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    firstOrderAt: string;
    lastOrderAt: string;
    daysSinceLastOrder: number;
    paidOrderCount: number;
    totalRevenue: number;          // monetary
    avgOrderValue: number;
    recency: number;                // 1..5 (5 = most recent)
    frequency: number;              // 1..5 (5 = most frequent)
    monetary: number;               // 1..5 (5 = highest spender)
    rfmScore: number;               // R*100 + F*10 + M
    segment: Segment;
    lifetimeDays: number;           // days between first and last order
    cancelledOrders: number;
    refundedRevenue: number;
}

export type Segment =
    | 'Champions'
    | 'Loyal'
    | 'Potential Loyalists'
    | 'New'
    | 'At Risk'
    | 'Big Spenders'
    | 'Hibernating'
    | 'Lost'
    | 'One-time';

const SEGMENT_COLORS: Record<Segment, string> = {
    Champions: '#16a34a',
    Loyal: '#22c55e',
    'Potential Loyalists': '#3b82f6',
    New: '#06b6d4',
    'At Risk': '#f59e0b',
    'Big Spenders': '#8b5cf6',
    Hibernating: '#9ca3af',
    Lost: '#ef4444',
    'One-time': '#a3a3a3',
};

const SEGMENT_DESCRIPTIONS: Record<Segment, string> = {
    Champions: 'High-value, recent, frequent buyers. Reward and protect.',
    Loyal: 'Steady repeat buyers. Cross-sell new categories.',
    'Potential Loyalists': 'Recent buyers with growing frequency. Nudge to repeat.',
    New: 'First purchase recently. Onboard with welcome offers.',
    'At Risk': 'Used to buy a lot, gone quiet. Win them back.',
    'Big Spenders': 'High spenders that have stopped — top recovery priority.',
    Hibernating: 'Old, low-frequency, low-spend. Re-engage with light promos.',
    Lost: 'Churned. Cheap reactivation campaigns only.',
    'One-time': 'Bought once a while ago and never came back.',
};

export function segmentColor(s: Segment): string { return SEGMENT_COLORS[s]; }
export function segmentDescription(s: Segment): string { return SEGMENT_DESCRIPTIONS[s]; }

function quintileScores(values: number[], higherIsBetter: boolean): Map<number, number> {
    // Returns a map from value → score 1..5. Uses quintile boundaries on the unique values.
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0) return new Map();
    const out = new Map<number, number>();
    const qs = [0.2, 0.4, 0.6, 0.8].map(q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
    for (const v of values) {
        let bucket = 1;
        if (v >= qs[0]) bucket = 2;
        if (v >= qs[1]) bucket = 3;
        if (v >= qs[2]) bucket = 4;
        if (v >= qs[3]) bucket = 5;
        out.set(v, higherIsBetter ? bucket : 6 - bucket);
    }
    return out;
}

function classify(p: { paidOrderCount: number; recency: number; frequency: number; monetary: number; daysSinceLastOrder: number }): Segment {
    const { paidOrderCount, recency, frequency, monetary, daysSinceLastOrder } = p;
    if (paidOrderCount === 1 && daysSinceLastOrder <= 30) return 'New';
    if (paidOrderCount === 1) return 'One-time';
    if (recency >= 4 && frequency >= 4 && monetary >= 4) return 'Champions';
    if (recency >= 4 && frequency >= 3) return 'Loyal';
    if (recency >= 4 && frequency <= 2) return 'Potential Loyalists';
    if (recency <= 2 && monetary >= 4) return 'Big Spenders';
    if (recency <= 2 && frequency >= 3) return 'At Risk';
    if (recency <= 2 && frequency <= 2 && monetary <= 2) return 'Lost';
    if (recency === 3) return 'Hibernating';
    return 'Hibernating';
}

export function buildCustomerProfiles(orders: Order[]): CustomerProfile[] {
    // Group paid orders by user.
    const paid = orders.filter(o => (o as any).paymentStatus === 'Paid');
    const groups = new Map<string, Order[]>();
    for (const o of paid) {
        const k = String((o as any).userId || (o as any).userEmail || `anon-${o.id}`);
        const list = groups.get(k);
        if (list) list.push(o);
        else groups.set(k, [o]);
    }

    const now = Date.now();
    const baseProfiles: Array<Omit<CustomerProfile, 'recency' | 'frequency' | 'monetary' | 'rfmScore' | 'segment'>> = [];
    const recencyVals: number[] = [];
    const frequencyVals: number[] = [];
    const monetaryVals: number[] = [];

    for (const [uid, list] of groups.entries()) {
        const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalRevenue = sorted.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const lastOrderTs = new Date(last.date).getTime();
        const daysSinceLast = Math.max(0, Math.floor((now - lastOrderTs) / (1000 * 60 * 60 * 24)));
        const lifetimeDays = Math.max(0, Math.floor((lastOrderTs - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)));

        // Pull contact info from the most recent order (most up-to-date).
        const lastAny = last as any;

        const cancelled = orders.filter(o => {
            const ouid = String((o as any).userId || (o as any).userEmail || '');
            return ouid === uid && o.status === 'Cancelled';
        }).length;
        const refundedRevenue = orders
            .filter(o => {
                const ouid = String((o as any).userId || (o as any).userEmail || '');
                return ouid === uid && ((o as any).refundStatus === 'Reversed' || (o as any).paymentStatus === 'Refunded');
            })
            .reduce((s, o) => s + (Number((o as any).refundAmount || o.total) || 0), 0);

        baseProfiles.push({
            userId: uid,
            name: lastAny.userName,
            email: lastAny.userEmail,
            phone: lastAny.phone,
            firstOrderAt: first.date,
            lastOrderAt: last.date,
            daysSinceLastOrder: daysSinceLast,
            paidOrderCount: sorted.length,
            totalRevenue,
            avgOrderValue: totalRevenue / sorted.length,
            lifetimeDays,
            cancelledOrders: cancelled,
            refundedRevenue,
        });

        recencyVals.push(daysSinceLast);
        frequencyVals.push(sorted.length);
        monetaryVals.push(totalRevenue);
    }

    // Lower recency days = better, so higherIsBetter=false
    const rScores = quintileScores(recencyVals, false);
    const fScores = quintileScores(frequencyVals, true);
    const mScores = quintileScores(monetaryVals, true);

    const profiles: CustomerProfile[] = baseProfiles.map(p => {
        const r = rScores.get(p.daysSinceLastOrder) ?? 3;
        const f = fScores.get(p.paidOrderCount) ?? 3;
        const m = mScores.get(p.totalRevenue) ?? 3;
        const segment = classify({
            paidOrderCount: p.paidOrderCount,
            recency: r,
            frequency: f,
            monetary: m,
            daysSinceLastOrder: p.daysSinceLastOrder,
        });
        return {
            ...p,
            recency: r,
            frequency: f,
            monetary: m,
            rfmScore: r * 100 + f * 10 + m,
            segment,
        };
    });

    return profiles.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export interface SegmentSummary {
    segment: Segment;
    count: number;
    revenue: number;
    avgLtv: number;
    color: string;
    description: string;
}

export function summariseSegments(profiles: CustomerProfile[]): SegmentSummary[] {
    const map = new Map<Segment, { count: number; revenue: number }>();
    for (const p of profiles) {
        const cur = map.get(p.segment) || { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += p.totalRevenue;
        map.set(p.segment, cur);
    }
    const order: Segment[] = ['Champions', 'Loyal', 'Big Spenders', 'Potential Loyalists', 'New', 'At Risk', 'Hibernating', 'Lost', 'One-time'];
    return order
        .filter(s => map.has(s))
        .map(s => {
            const v = map.get(s)!;
            return {
                segment: s,
                count: v.count,
                revenue: Math.round(v.revenue),
                avgLtv: v.count > 0 ? Math.round(v.revenue / v.count) : 0,
                color: SEGMENT_COLORS[s],
                description: SEGMENT_DESCRIPTIONS[s],
            };
        });
}

export interface IntelKPIs {
    totalCustomers: number;
    avgLtv: number;
    medianLtv: number;
    repeatRate: number;          // % of customers with >1 paid order
    churnRiskCount: number;      // At Risk + Big Spenders + Hibernating
    newCustomers30d: number;
    avgOrdersPerCustomer: number;
}

export function computeIntelKPIs(profiles: CustomerProfile[]): IntelKPIs {
    if (profiles.length === 0) {
        return { totalCustomers: 0, avgLtv: 0, medianLtv: 0, repeatRate: 0, churnRiskCount: 0, newCustomers30d: 0, avgOrdersPerCustomer: 0 };
    }
    const totalRev = profiles.reduce((s, p) => s + p.totalRevenue, 0);
    const sorted = [...profiles].map(p => p.totalRevenue).sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const repeats = profiles.filter(p => p.paidOrderCount > 1).length;
    const churnRisk = profiles.filter(p => p.segment === 'At Risk' || p.segment === 'Big Spenders' || p.segment === 'Hibernating').length;
    const newCustomers30d = profiles.filter(p => {
        const days = (Date.now() - new Date(p.firstOrderAt).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 30;
    }).length;
    const totalOrders = profiles.reduce((s, p) => s + p.paidOrderCount, 0);
    return {
        totalCustomers: profiles.length,
        avgLtv: Math.round(totalRev / profiles.length),
        medianLtv: Math.round(median),
        repeatRate: (repeats / profiles.length) * 100,
        churnRiskCount: churnRisk,
        newCustomers30d,
        avgOrdersPerCustomer: totalOrders / profiles.length,
    };
}
