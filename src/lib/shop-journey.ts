import { normalizeAnalyticsPath } from './commerce-ops.ts';

export const SHOP_ENTRY_STORAGE_KEY = 'Mel-Agri_entry_path';
export const SHOP_VISIT_DAY_KEY = 'Mel-Agri_last_visit';
export const SHOP_PATH_TRAIL_LIMIT = 8;

const CHECKOUT_STEP_LABELS: Record<string, string> = {
    start: 'Checkout started',
    payment: 'Payment',
    review: 'Order review',
    complete: 'Order placed',
};

/** First shop page of the UTC day. A later page the same day does not replace it. */
export function entryPathForDay(input: {
    today: string;
    storedDay: string | null;
    storedPath: string | null;
    path: string;
}): string {
    const current = normalizeAnalyticsPath(input.path) || '/';
    const stored = normalizeAnalyticsPath(input.storedPath);
    if (input.storedDay === input.today && stored) return stored;
    return current;
}

export function readStoredEntryPath(): string | null {
    if (typeof window === 'undefined') return null;
    return normalizeAnalyticsPath(window.localStorage.getItem(SHOP_ENTRY_STORAGE_KEY));
}

export interface LandingSale {
    path: string;
    orders: number;
    revenue: number;
}

/** Paid orders grouped by the first shop page stored on the order. Missing paths stay in one bucket. */
export function salesByLandingPage(
    orders: Array<{ paymentStatus?: string | null; total?: number | null; entryPath?: string | null }>,
    limit = 12,
): LandingSale[] {
    const totals = new Map<string, LandingSale>();
    for (const order of orders) {
        if (order.paymentStatus !== 'Paid') continue;
        const path = normalizeAnalyticsPath(order.entryPath) || 'Not recorded';
        const row = totals.get(path) || { path, orders: 0, revenue: 0 };
        row.orders += 1;
        row.revenue += Math.max(0, Number(order.total) || 0);
        totals.set(path, row);
    }
    return [...totals.values()]
        .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || a.path.localeCompare(b.path))
        .slice(0, limit);
}

/** Keep the last few shop paths. Staff pages, query strings, and repeated reloads are dropped. */
export function appendShopPath(trail: string[], path: string, limit = SHOP_PATH_TRAIL_LIMIT): string[] {
    const capped = trail.slice(-limit);
    const next = normalizeAnalyticsPath(path);
    if (!next || capped[capped.length - 1] === next) return capped.length === trail.length ? trail : capped;
    return [...capped, next].slice(-limit);
}

export function shopPathTrail(value: unknown, limit = SHOP_PATH_TRAIL_LIMIT): string[] {
    if (!Array.isArray(value)) return [];
    const paths: string[] = [];
    for (const entry of value) {
        const path = normalizeAnalyticsPath(entry);
        if (!path || paths[paths.length - 1] === path) continue;
        paths.push(path);
        if (paths.length > limit) paths.shift();
    }
    return paths;
}

export function checkoutStepLabel(step: string | null | undefined): string | null {
    const key = String(step || '').trim();
    return CHECKOUT_STEP_LABELS[key] || null;
}

/** Furthest checkout step on this session. Account prompts and other notes do not count. */
export function latestCheckoutStep(doc: { lastStep?: unknown; steps?: unknown } | null | undefined): string | null {
    const steps = doc?.steps && typeof doc.steps === 'object' ? doc.steps as Record<string, unknown> : {};
    for (const step of ['complete', 'review', 'payment', 'start'] as const) {
        const recorded = steps[step];
        if (recorded !== undefined && recorded !== null && recorded !== false) return step;
    }
    const last = typeof doc?.lastStep === 'string' ? doc.lastStep : '';
    return checkoutStepLabel(last) ? last : null;
}

/** A new checkout replaces the previous session. Later steps only add to this visit. */
export function checkoutSessionReplaces(step: string): boolean {
    return step === 'start';
}

/** Firestore user docs use the account id as the document id and often omit a uid field. */
export function profileAccountId(user: { id?: string | null; uid?: string | null }): string {
    const id = String(user.id || '').trim();
    const uid = String(user.uid || '').trim();
    const chosen = id && id !== 'undefined' ? id : uid;
    if (!chosen || chosen === 'undefined' || chosen.includes('/') || chosen.includes(':')) return '';
    return chosen;
}
