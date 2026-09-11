export const ANALYTICS_SCHEMA_VERSION = 1;

export const FUNNEL_STEPS = [
    { key: 'start', label: 'Checkout started' },
    { key: 'payment', label: 'Payment step' },
    { key: 'review', label: 'Order review' },
    { key: 'complete', label: 'Order placed' },
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEPS)[number]['key'];

export interface FunnelDoc {
    lastStep?: string;
    steps?: Record<string, unknown>;
}

const STEP_ORDER: FunnelStepKey[] = FUNNEL_STEPS.map(step => step.key);

export function utcDateKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

export function previousUtcDateKey(date = new Date()): string {
    const prior = new Date(date);
    prior.setUTCDate(prior.getUTCDate() - 1);
    return prior.toISOString().slice(0, 10);
}

export function sessionReached(doc: FunnelDoc, step: FunnelStepKey): boolean {
    const recorded = doc.steps?.[step];
    if (recorded !== undefined && recorded !== null && recorded !== false) return true;
    const lastIdx = STEP_ORDER.indexOf(doc.lastStep as FunnelStepKey);
    const stepIdx = STEP_ORDER.indexOf(step);
    return lastIdx >= 0 && stepIdx >= 0 && lastIdx >= stepIdx;
}

export interface FunnelStepSummary {
    key: FunnelStepKey;
    label: string;
    count: number;
    conversionFromStart: number;
    conversionFromPrevious: number;
    dropOff: number;
}

export interface FunnelBottleneck {
    step: FunnelStepKey;
    label: string;
    from: string;
    fromCount: number;
    lost: number;
    dropOffRate: number;
}

export interface FunnelSummary {
    sampled: number;
    counts: Record<FunnelStepKey, number>;
    steps: FunnelStepSummary[];
    bottleneck: FunnelBottleneck | null;
}

export function summariseFunnels(docs: FunnelDoc[], minSessions = 5): FunnelSummary {
    const counts = { start: 0, payment: 0, review: 0, complete: 0 } satisfies Record<FunnelStepKey, number>;
    for (const doc of docs) {
        for (const step of FUNNEL_STEPS) {
            if (sessionReached(doc, step.key)) counts[step.key] += 1;
        }
    }

    const steps: FunnelStepSummary[] = FUNNEL_STEPS.map((step, index) => {
        const count = counts[step.key];
        const previous = index === 0 ? count : counts[FUNNEL_STEPS[index - 1].key];
        return {
            key: step.key,
            label: step.label,
            count,
            conversionFromStart: counts.start > 0 ? count / counts.start : 0,
            conversionFromPrevious: previous > 0 ? count / previous : 0,
            dropOff: Math.max(0, previous - count),
        };
    });

    let bottleneck: FunnelBottleneck | null = null;
    for (let index = 1; index < steps.length; index += 1) {
        const previous = steps[index - 1];
        const current = steps[index];
        const lost = previous.count - current.count;
        const dropOffRate = previous.count > 0 ? lost / previous.count : 0;
        if (lost <= 0) continue;
        if (!bottleneck || lost > bottleneck.lost || (lost === bottleneck.lost && dropOffRate > bottleneck.dropOffRate)) {
            bottleneck = {
                step: current.key,
                label: current.label,
                from: previous.label,
                fromCount: previous.count,
                lost,
                dropOffRate,
            };
        }
    }

    const meaningful = counts.start >= minSessions
        && bottleneck
        && bottleneck.lost >= 2
        && bottleneck.dropOffRate >= 0.25;

    return { sampled: docs.length, counts, steps, bottleneck: meaningful ? bottleneck : null };
}

export interface TrafficSnapshot {
    totalVisits?: number;
    uniqueVisitors?: number;
}

export interface TrafficDelta {
    todayVisits: number;
    yesterdayVisits: number;
    todayUnique: number;
    yesterdayUnique: number;
    visitDeltaPct: number | null;
    uniqueDeltaPct: number | null;
}

function percentChange(current: number, previous: number): number | null {
    if (previous > 0) return ((current - previous) / previous) * 100;
    if (current > 0) return null;
    return 0;
}

export function trafficDelta(today?: TrafficSnapshot | null, yesterday?: TrafficSnapshot | null): TrafficDelta {
    const todayVisits = Number(today?.totalVisits || 0);
    const yesterdayVisits = Number(yesterday?.totalVisits || 0);
    const todayUnique = Number(today?.uniqueVisitors || 0);
    const yesterdayUnique = Number(yesterday?.uniqueVisitors || 0);
    return {
        todayVisits,
        yesterdayVisits,
        todayUnique,
        yesterdayUnique,
        visitDeltaPct: percentChange(todayVisits, yesterdayVisits),
        uniqueDeltaPct: percentChange(todayUnique, yesterdayUnique),
    };
}

export interface DemandInsight {
    term: string;
    count: number;
    headline: string;
    detail: string;
}

export function demandInsight(topSearch: { term: string; count: number } | null | undefined): DemandInsight | null {
    const term = topSearch?.term?.trim();
    const count = Number(topSearch?.count || 0);
    if (!term || count < 1) return null;
    return {
        term,
        count,
        headline: `Top search: ${term}`,
        detail: `${count.toLocaleString()} recorded searches. This is lifetime demand, not a 24-hour forecast.`,
    };
}

export interface BottleneckInsight {
    headline: string;
    detail: string;
    step: FunnelStepKey;
    from: string;
    lost: number;
    dropOffRate: number;
}

export function bottleneckInsight(funnel: FunnelSummary): BottleneckInsight | null {
    if (!funnel.bottleneck) return null;
    const pct = Math.round(funnel.bottleneck.dropOffRate * 100);
    return {
        headline: `Drop-off after ${funnel.bottleneck.from}`,
        detail: `${funnel.bottleneck.lost} of ${funnel.bottleneck.fromCount} checkout sessions (${pct}%) did not reach ${funnel.bottleneck.label.toLowerCase()}.`,
        step: funnel.bottleneck.step,
        from: funnel.bottleneck.from,
        lost: funnel.bottleneck.lost,
        dropOffRate: funnel.bottleneck.dropOffRate,
    };
}

export function visitorToPaidRate(paidToday: number, uniqueVisitors: number): number | null {
    if (uniqueVisitors <= 0) return null;
    return (Math.max(0, paidToday) / uniqueVisitors) * 100;
}

export function purchaseAnalyticsPayload(orderId: string, order: Record<string, unknown>) {
    const items = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : [];
    const productIds = items
        .map(item => String(item.id || '').trim())
        .filter(id => id && id.length <= 128 && !id.includes('/'))
        .slice(0, 40);
    return {
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        orderId,
        userId: String(order.userId || ''),
        amount: Number(order.amountPaid || order.total || 0) || 0,
        itemCount: items.length,
        productIds,
        source: 'payment-confirmation',
    };
}
