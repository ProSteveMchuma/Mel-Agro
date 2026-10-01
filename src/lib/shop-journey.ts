import { normalizeAnalyticsPath } from './commerce-ops.ts';
import { productSeoPath } from './seo.ts';

export const SHOP_ENTRY_STORAGE_KEY = 'Mel-Agri_entry_path';
export const SHOP_SALE_STORAGE_KEY = 'Mel-Agri_sale_path';
export const SHOP_VISIT_DAY_KEY = 'Mel-Agri_last_visit';
export const SHOP_PATH_TRAIL_LIMIT = 8;

const LISTING_PATH = /^\/(products|categories|brands)\/[^/]+$/;

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

/** A product, category, or brand page. Home, cart, and checkout are not specific enough to name a sale. */
export function isListingPath(path: string | null | undefined): boolean {
    return Boolean(path && LISTING_PATH.test(path));
}

/**
 * Last product, category, or brand page of this UTC day.
 * One path, replaced when they open another listing. Not a trail.
 */
export function salePathForDay(input: {
    today: string;
    storedDay: string | null;
    storedPath: string | null;
    path: string;
}): string | null {
    const current = normalizeAnalyticsPath(input.path);
    const stored = input.storedDay === input.today ? normalizeAnalyticsPath(input.storedPath) : null;
    if (isListingPath(current)) return current;
    return isListingPath(stored) ? stored : null;
}

export function readStoredSalePath(): string | null {
    if (typeof window === 'undefined') return null;
    const path = normalizeAnalyticsPath(window.localStorage.getItem(SHOP_SALE_STORAGE_KEY));
    return isListingPath(path) ? path : null;
}

export type LandingKind = 'opened first' | 'listing page' | 'product on the order' | 'not recorded';

export interface ResolvedLanding {
    path: string;
    kind: LandingKind;
}

function singleProductPath(items: Array<{ id?: string | number | null; name?: string | null }> | null | undefined): string | null {
    if (!Array.isArray(items)) return null;
    const ids = new Set<string>();
    let chosen: { id: string; name: string } | null = null;
    for (const item of items) {
        const id = String(item?.id ?? '').trim();
        const name = String(item?.name ?? '').trim();
        if (!id || id.length > 128 || id.includes('/') || id.includes(':') || !name) continue;
        ids.add(id);
        if (!chosen) chosen = { id, name };
    }
    if (!chosen || ids.size !== 1) return null;
    return normalizeAnalyticsPath(productSeoPath(chosen));
}

/**
 * The page a paid order can be named by.
 * A stored listing page wins. Home-only or missing landings use the single product on the order.
 * Mixed orders with no stored page stay unrecorded. Nothing here is an address or a visitor hash.
 */
export function landingPageForOrder(order: {
    entryPath?: string | null;
    salePath?: string | null;
    items?: Array<{ id?: string | number | null; name?: string | null }> | null;
}): ResolvedLanding {
    const entry = normalizeAnalyticsPath(order.entryPath);
    const sale = normalizeAnalyticsPath(order.salePath);
    if (isListingPath(entry)) return { path: entry as string, kind: 'opened first' };
    if (isListingPath(sale)) return { path: sale as string, kind: 'listing page' };
    const fromItem = singleProductPath(order.items);
    if (fromItem && (!entry || !isListingPath(entry))) return { path: fromItem, kind: 'product on the order' };
    if (entry) return { path: entry, kind: 'opened first' };
    return { path: 'Not recorded', kind: 'not recorded' };
}

export interface LandingSale {
    path: string;
    orders: number;
    revenue: number;
    recorded: number;
    fromOrderProduct: number;
}

/** Paid orders grouped by the page we can name. Missing paths stay in one bucket. */
export function salesByLandingPage(
    orders: Array<{
        paymentStatus?: string | null;
        total?: number | null;
        entryPath?: string | null;
        salePath?: string | null;
        items?: Array<{ id?: string | number | null; name?: string | null }> | null;
    }>,
    limit = 12,
): LandingSale[] {
    const totals = new Map<string, LandingSale>();
    for (const order of orders) {
        if (order.paymentStatus !== 'Paid') continue;
        const landing = landingPageForOrder(order);
        const row = totals.get(landing.path) || { path: landing.path, orders: 0, revenue: 0, recorded: 0, fromOrderProduct: 0 };
        row.orders += 1;
        row.revenue += Math.max(0, Number(order.total) || 0);
        if (landing.kind === 'product on the order') row.fromOrderProduct += 1;
        else if (landing.kind !== 'not recorded') row.recorded += 1;
        totals.set(landing.path, row);
    }
    return [...totals.values()]
        .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || a.path.localeCompare(b.path))
        .slice(0, limit);
}

const PASS_THROUGH_PAGE = (path: string) => path === '/cart'
    || path === '/checkout'
    || path === '/wishlist'
    || path === '/contact'
    || path.startsWith('/checkout/')
    || path.startsWith('/auth/')
    || path.startsWith('/orders/');

export interface PageLoss {
    path: string;
    views: number;
    paidOrders: number;
}

/** Pages people open that no paid order names. Cart and checkout are steps, not landings. */
export function pagesLosingBeforeSale(
    pages: Array<{ key?: string | null; views?: number | null }>,
    sales: Array<{ path: string; orders: number }>,
    options?: { minViews?: number; limit?: number },
): PageLoss[] {
    const minViews = options?.minViews ?? 5;
    const limit = options?.limit ?? 5;
    const paidByPath = new Map<string, number>();
    for (const sale of sales) {
        if (!sale.path || sale.path === 'Not recorded') continue;
        paidByPath.set(sale.path, (paidByPath.get(sale.path) || 0) + Math.max(0, Number(sale.orders) || 0));
    }
    const namedSales = [...paidByPath.values()].some((orders) => orders > 0);
    return pages
        .map((page) => {
            const path = normalizeAnalyticsPath(page.key) || '';
            return {
                path,
                views: Math.max(0, Number(page.views) || 0),
                paidOrders: path ? paidByPath.get(path) || 0 : 0,
            };
        })
        .filter((page) => {
            if (!page.path || page.views < minViews || page.paidOrders > 0 || PASS_THROUGH_PAGE(page.path)) return false;
            if (page.path === '/' && namedSales) return false;
            return true;
        })
        .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
        .slice(0, limit);
}

export interface ProductCounter {
    productId: string;
    name?: string | null;
    views?: number | null;
    addToCartCount?: number | null;
    purchases?: number | null;
    stockQuantity?: number | null;
    inStock?: boolean | null;
}

export interface ProductLoss {
    productId: string;
    name: string;
    views: number;
    adds: number;
    purchases: number;
    reason: 'out of stock' | 'looked, not added' | 'added, not bought';
}

/** Lifetime product counters. Out of stock wins, then looked-at and never added, then added and never bought. */
export function productsLosingBeforeSale(products: ProductCounter[], options?: { minViews?: number; minAdds?: number; limit?: number }): ProductLoss[] {
    const minViews = options?.minViews ?? 5;
    const minAdds = options?.minAdds ?? 3;
    const limit = options?.limit ?? 5;
    const ranked: Array<ProductLoss & { weight: number }> = [];
    for (const product of products) {
        const productId = String(product.productId || '').trim();
        if (!productId || productId.includes('/') || productId.includes(':')) continue;
        const views = Math.max(0, Number(product.views) || 0);
        const adds = Math.max(0, Number(product.addToCartCount) || 0);
        const purchases = Math.max(0, Number(product.purchases) || 0);
        const name = String(product.name || productId).trim() || productId;
        const qty = product.stockQuantity == null ? null : Number(product.stockQuantity);
        const stockKnown = product.inStock === true || product.inStock === false || (qty != null && Number.isFinite(qty));
        const out = stockKnown && (product.inStock === false || (qty != null && Number.isFinite(qty) && qty <= 0));
        if (out && (views >= minViews || adds >= 1)) {
            ranked.push({ productId, name, views, adds, purchases, reason: 'out of stock', weight: 10_000 + views + adds * 3 });
            continue;
        }
        if (views >= minViews && adds === 0 && purchases === 0) {
            ranked.push({ productId, name, views, adds, purchases, reason: 'looked, not added', weight: views });
            continue;
        }
        if (adds >= minAdds && purchases === 0) {
            ranked.push({ productId, name, views, adds, purchases, reason: 'added, not bought', weight: 1_000 + adds });
        }
    }
    return ranked
        .sort((a, b) => b.weight - a.weight || b.views - a.views || a.name.localeCompare(b.name))
        .slice(0, limit)
        .map(({ weight: _weight, ...row }) => row);
}

export type ShopAction = 'text the cart' | 'restock' | 'fix the page';

export interface TodayShopReadout {
    visits: number;
    paidOrders: number;
    checkoutLeft: number;
    action: ShopAction | null;
    detail: string;
    href: string;
    linkLabel: string;
    pageLoss: PageLoss | null;
    productLoss: ProductLoss | null;
}

export function productEditHref(productId: string): string {
    const id = String(productId || '').trim();
    if (!id || id.includes('/') || id.includes(':') || id.length > 128) return '/dashboard/admin/inventory';
    return `/dashboard/admin/products/edit/${id}`;
}

/** Today’s visits and paid orders, against the latest checkout sessions, and one next action. */
export function todayShopReadout(input: {
    visits?: number | null;
    paidOrders?: number | null;
    checkoutStarted?: number | null;
    checkoutCompleted?: number | null;
    textableCarts?: number | null;
    pages?: Array<{ key?: string | null; views?: number | null }>;
    landingSales?: Array<{ path: string; orders: number }>;
    products?: ProductCounter[];
    pageMinViews?: number;
}): TodayShopReadout {
    const visits = Math.max(0, Number(input.visits) || 0);
    const paidOrders = Math.max(0, Number(input.paidOrders) || 0);
    const checkoutStarted = Math.max(0, Number(input.checkoutStarted) || 0);
    const checkoutCompleted = Math.max(0, Number(input.checkoutCompleted) || 0);
    const checkoutLeft = Math.max(0, checkoutStarted - checkoutCompleted);
    const textableCarts = Math.max(0, Number(input.textableCarts) || 0);
    const pageLoss = pagesLosingBeforeSale(input.pages || [], input.landingSales || [], { minViews: input.pageMinViews ?? 3, limit: 1 })[0] || null;
    const productLoss = productsLosingBeforeSale(input.products || [], { limit: 1 })[0] || null;

    let action: ShopAction | null = null;
    let detail = 'No cart is ready to text, no watched product is out of stock, and no busy page is without a paid order.';
    let href = '';
    let linkLabel = '';

    if (textableCarts > 0) {
        action = 'text the cart';
        detail = `${textableCarts} cart${textableCarts === 1 ? '' : 's'} can be texted. They consented, still have items, and have not already paid.`;
        href = '/dashboard/admin/intelligence/abandoned-carts';
        linkLabel = 'Text the cart';
    } else if (productLoss?.reason === 'out of stock') {
        action = 'restock';
        detail = `${productLoss.name} is out of stock after ${productLoss.views} views and ${productLoss.adds} adds. Those counts are lifetime, not only today.`;
        href = productEditHref(productLoss.productId);
        linkLabel = 'Restock';
    } else if (pageLoss) {
        action = 'fix the page';
        detail = `${pageLoss.path} has ${pageLoss.views} views today and no paid order names that page.`;
        href = pageLoss.path;
        linkLabel = 'Fix the page';
    } else if (productLoss) {
        action = 'fix the page';
        detail = productLoss.reason === 'looked, not added'
            ? `${productLoss.name} has ${productLoss.views} views and was never added. Those counts are lifetime, not only today.`
            : `${productLoss.name} was added ${productLoss.adds} times and not bought. Those counts are lifetime, not only today.`;
        href = productEditHref(productLoss.productId);
        linkLabel = 'Fix the page';
    } else if (checkoutStarted >= 5 && checkoutLeft / checkoutStarted >= 0.25) {
        action = 'fix the page';
        detail = `${checkoutLeft} of ${checkoutStarted} signed-in checkouts did not place an order. That is the latest visit per account, not only today.`;
        href = '/dashboard/admin/analytics#shop-checkout';
        linkLabel = 'Fix the page';
    }

    return { visits, paidOrders, checkoutLeft, action, detail, href, linkLabel, pageLoss, productLoss };
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
