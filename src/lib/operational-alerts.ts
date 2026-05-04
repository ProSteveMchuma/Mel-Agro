// Operational alerts — stock-out forecasts, demand spikes, payment-failure
// clusters, refund-rate watch, fulfillment SLA breaches. Pure helpers operating
// on the orders[] streamed by OrderContext and the products[] from ProductContext.

import type { Order, Product, OrderItem } from '@/types';

const DAY = 24 * 60 * 60 * 1000;

function paid(orders: Order[]): Order[] {
    return orders.filter(o => (o as any).paymentStatus === 'Paid');
}

function withinDays(orders: Order[], days: number, anchor = Date.now()): Order[] {
    const cutoff = anchor - days * DAY;
    return orders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= cutoff;
    });
}

function unitsForProduct(orders: Order[], productId: string | number): number {
    let total = 0;
    for (const o of orders) {
        for (const item of (o.items || []) as OrderItem[]) {
            if (String(item.id) === String(productId)) total += Number(item.quantity) || 0;
        }
    }
    return total;
}

// ───── Stock-out forecast ─────────────────────────────────────────────────

export interface StockAlert {
    productId: string | number;
    name: string;
    image?: string;
    category?: string;
    stockQuantity: number;
    lowStockThreshold: number;
    dailyVelocity: number;        // avg units sold per day over the window
    daysOfCover: number;          // stockQuantity / dailyVelocity (Infinity if velocity 0)
    severity: 'out' | 'critical' | 'low' | 'ok';
    last30dUnits: number;
}

export function stockOutForecast(orders: Order[], products: Product[], windowDays = 30): StockAlert[] {
    const recent = paid(withinDays(orders, windowDays));
    return products.map(p => {
        const last30dUnits = unitsForProduct(recent, p.id);
        const dailyVelocity = last30dUnits / windowDays;
        const daysOfCover = dailyVelocity > 0 ? p.stockQuantity / dailyVelocity : Infinity;

        let severity: StockAlert['severity'] = 'ok';
        if (p.stockQuantity <= 0) severity = 'out';
        else if (daysOfCover <= 3) severity = 'critical';
        else if (daysOfCover <= 7 || p.stockQuantity <= (p.lowStockThreshold || 0)) severity = 'low';

        return {
            productId: p.id,
            name: p.name,
            image: p.image,
            category: p.category,
            stockQuantity: p.stockQuantity,
            lowStockThreshold: p.lowStockThreshold || 0,
            dailyVelocity: Math.round(dailyVelocity * 100) / 100,
            daysOfCover: Number.isFinite(daysOfCover) ? Math.round(daysOfCover * 10) / 10 : Infinity,
            severity,
            last30dUnits,
        };
    });
}

// ───── Demand spikes ──────────────────────────────────────────────────────

export interface DemandSpike {
    productId: string | number;
    name: string;
    image?: string;
    recentUnits: number;          // last 3 days
    baselineDailyVelocity: number; // prior 14 days
    recentDailyVelocity: number;
    multiplier: number;            // recentDailyVelocity / baselineDailyVelocity
    stockQuantity: number;
    daysOfCoverAtRecentVelocity: number;
}

export function demandSpikes(orders: Order[], products: Product[]): DemandSpike[] {
    const now = Date.now();
    const recentWindow = paid(withinDays(orders, 3, now));
    // Baseline excludes the last 3 days but covers the 14 days before that
    const baselineWindow = paid(orders).filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= now - 17 * DAY && t < now - 3 * DAY;
    });

    const out: DemandSpike[] = [];
    for (const p of products) {
        const recentUnits = unitsForProduct(recentWindow, p.id);
        const baselineUnits = unitsForProduct(baselineWindow, p.id);
        const recentVel = recentUnits / 3;
        const baselineVel = baselineUnits / 14;
        if (recentUnits < 3) continue;        // ignore noise
        const multiplier = baselineVel > 0 ? recentVel / baselineVel : (recentVel > 0 ? Infinity : 0);
        if (multiplier < 2) continue;          // require ≥2× baseline

        const daysOfCover = recentVel > 0 ? p.stockQuantity / recentVel : Infinity;
        out.push({
            productId: p.id,
            name: p.name,
            image: p.image,
            recentUnits,
            baselineDailyVelocity: Math.round(baselineVel * 100) / 100,
            recentDailyVelocity: Math.round(recentVel * 100) / 100,
            multiplier: Number.isFinite(multiplier) ? Math.round(multiplier * 10) / 10 : Infinity,
            stockQuantity: p.stockQuantity,
            daysOfCoverAtRecentVelocity: Number.isFinite(daysOfCover) ? Math.round(daysOfCover * 10) / 10 : Infinity,
        });
    }
    return out.sort((a, b) => b.multiplier - a.multiplier);
}

// ───── Payment failure clusters ───────────────────────────────────────────

export interface PaymentFailureCluster {
    method: string;
    failed24h: number;
    failed7d: number;
    paid24h: number;
    paid7d: number;
    failureRate24h: number; // %
    failureRate7d: number;  // %
}

const normMethod = (m: any) => {
    const s = String(m || 'Unknown').toLowerCase();
    if (s.includes('m-pesa') || s.includes('mpesa')) return 'M-Pesa';
    if (s.includes('cash')) return 'Cash on Delivery';
    if (s.includes('card') || s.includes('paystack')) return 'Card';
    if (s.includes('whatsapp')) return 'WhatsApp';
    return String(m || 'Unknown');
};

export function paymentFailureClusters(orders: Order[]): PaymentFailureCluster[] {
    const now = Date.now();
    const last24h = orders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= now - DAY;
    });
    const last7d = orders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= now - 7 * DAY;
    });

    const methods = new Set<string>();
    for (const o of last7d) methods.add(normMethod((o as any).paymentMethod));

    return Array.from(methods).map(method => {
        const inMethod24h = last24h.filter(o => normMethod((o as any).paymentMethod) === method);
        const inMethod7d = last7d.filter(o => normMethod((o as any).paymentMethod) === method);
        const failed24h = inMethod24h.filter(o => (o as any).paymentStatus === 'Failed').length;
        const failed7d = inMethod7d.filter(o => (o as any).paymentStatus === 'Failed').length;
        const paid24h = inMethod24h.filter(o => (o as any).paymentStatus === 'Paid').length;
        const paid7d = inMethod7d.filter(o => (o as any).paymentStatus === 'Paid').length;
        const total24h = failed24h + paid24h;
        const total7d = failed7d + paid7d;
        return {
            method,
            failed24h,
            failed7d,
            paid24h,
            paid7d,
            failureRate24h: total24h > 0 ? (failed24h / total24h) * 100 : 0,
            failureRate7d: total7d > 0 ? (failed7d / total7d) * 100 : 0,
        };
    }).sort((a, b) => b.failed7d - a.failed7d);
}

// ───── Refund rate watch ──────────────────────────────────────────────────

export interface RefundWatch {
    refundedRevenue30d: number;
    totalRevenue30d: number;
    refundRate30d: number;          // %
    refundedRevenue7d: number;
    totalRevenue7d: number;
    refundRate7d: number;           // %
    topRefundedProducts: Array<{ productId: string | number; name: string; image?: string; refundCount: number; refundRevenue: number }>;
}

function isRefunded(o: Order): boolean {
    return (o as any).refundStatus === 'Reversed' || (o as any).paymentStatus === 'Refunded';
}

export function refundWatch(orders: Order[]): RefundWatch {
    const now = Date.now();
    const last30 = orders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= now - 30 * DAY;
    });
    const last7 = orders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= now - 7 * DAY;
    });

    const sumPaid = (xs: Order[]) => xs.filter(o => (o as any).paymentStatus === 'Paid' || isRefunded(o))
        .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const sumRefunded = (xs: Order[]) => xs.filter(isRefunded)
        .reduce((s, o) => s + (Number((o as any).refundAmount || o.total) || 0), 0);

    const totalRevenue30d = sumPaid(last30);
    const refundedRevenue30d = sumRefunded(last30);
    const totalRevenue7d = sumPaid(last7);
    const refundedRevenue7d = sumRefunded(last7);

    // Top refunded products in last 30d
    const productMap = new Map<string, { productId: string | number; name: string; image?: string; refundCount: number; refundRevenue: number }>();
    for (const o of last30.filter(isRefunded)) {
        for (const item of (o.items || []) as OrderItem[]) {
            const k = String(item.id);
            const cur = productMap.get(k) || { productId: item.id, name: item.name, image: item.image, refundCount: 0, refundRevenue: 0 };
            cur.refundCount += Number(item.quantity) || 0;
            cur.refundRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
            productMap.set(k, cur);
        }
    }
    const topRefundedProducts = Array.from(productMap.values())
        .sort((a, b) => b.refundRevenue - a.refundRevenue)
        .slice(0, 5)
        .map(p => ({ ...p, refundRevenue: Math.round(p.refundRevenue) }));

    return {
        refundedRevenue30d: Math.round(refundedRevenue30d),
        totalRevenue30d: Math.round(totalRevenue30d),
        refundRate30d: totalRevenue30d > 0 ? (refundedRevenue30d / totalRevenue30d) * 100 : 0,
        refundedRevenue7d: Math.round(refundedRevenue7d),
        totalRevenue7d: Math.round(totalRevenue7d),
        refundRate7d: totalRevenue7d > 0 ? (refundedRevenue7d / totalRevenue7d) * 100 : 0,
        topRefundedProducts,
    };
}

// ───── Fulfillment SLA breach ─────────────────────────────────────────────

export interface SlaBreach {
    orderId: string;
    userName?: string;
    userEmail?: string;
    phone?: string;
    total: number;
    hoursSinceOrder: number;
    paymentStatus?: string;
    status: string;
    county?: string;
}

export function slaBreaches(orders: Order[], slaHours = 48): SlaBreach[] {
    const now = Date.now();
    const cutoff = now - slaHours * 60 * 60 * 1000;
    return orders
        .filter(o => {
            if ((o as any).paymentStatus !== 'Paid' || o.status !== 'Processing') return false;
            const t = new Date(o.date).getTime();
            return Number.isFinite(t) && t < cutoff;
        })
        .map(o => ({
            orderId: o.id,
            userName: (o as any).userName,
            userEmail: (o as any).userEmail,
            phone: (o as any).phone,
            total: Number(o.total) || 0,
            hoursSinceOrder: Math.floor((now - new Date(o.date).getTime()) / (60 * 60 * 1000)),
            paymentStatus: (o as any).paymentStatus,
            status: o.status,
            county: (o as any).shippingAddress?.county,
        }))
        .sort((a, b) => b.hoursSinceOrder - a.hoursSinceOrder);
}

// ───── Headline KPIs for the alerts page ──────────────────────────────────

export interface AlertKPIs {
    outOfStock: number;
    criticalStock: number;       // ≤3 days cover
    lowStock: number;             // ≤7 days cover or ≤lowStockThreshold
    spikingProducts: number;
    failedPayments24h: number;
    refundRate7d: number;
    slaBreaches: number;
    totalOpenAlerts: number;
}

export function computeAlertKPIs(stock: StockAlert[], spikes: DemandSpike[], failures: PaymentFailureCluster[], refund: RefundWatch, sla: SlaBreach[]): AlertKPIs {
    const outOfStock = stock.filter(s => s.severity === 'out').length;
    const criticalStock = stock.filter(s => s.severity === 'critical').length;
    const lowStock = stock.filter(s => s.severity === 'low').length;
    const failedPayments24h = failures.reduce((s, f) => s + f.failed24h, 0);
    const totalOpenAlerts = outOfStock + criticalStock + spikes.length + failedPayments24h + sla.length + (refund.refundRate7d > 5 ? 1 : 0);
    return {
        outOfStock,
        criticalStock,
        lowStock,
        spikingProducts: spikes.length,
        failedPayments24h,
        refundRate7d: refund.refundRate7d,
        slaBreaches: sla.length,
        totalOpenAlerts,
    };
}
