// Pure aggregation helpers for the admin Revenue Analytics dashboard.
// Operate on the orders[] array streamed by OrderContext (already admin-scoped).

import type { Order } from '@/types';

export type DateRange = '7d' | '30d' | '90d' | '12m' | 'all';
export type Granularity = 'day' | 'week' | 'month';

export function dateRangeCutoff(range: DateRange): Date | null {
    if (range === 'all') return null;
    const now = new Date();
    const d = new Date(now);
    if (range === '7d') d.setDate(d.getDate() - 7);
    else if (range === '30d') d.setDate(d.getDate() - 30);
    else if (range === '90d') d.setDate(d.getDate() - 90);
    else if (range === '12m') d.setFullYear(d.getFullYear() - 1);
    return d;
}

export function filterByRange(orders: Order[], range: DateRange): Order[] {
    const cutoff = dateRangeCutoff(range);
    if (!cutoff) return orders;
    return orders.filter(o => {
        const t = new Date(o.date).getTime();
        return Number.isFinite(t) && t >= cutoff.getTime();
    });
}

export function paidOnly(orders: Order[]): Order[] {
    return orders.filter(o => (o as any).paymentStatus === 'Paid');
}

export interface KPISet {
    revenue: number;
    orderCount: number;
    paidCount: number;
    aov: number;              // average order value (paid only)
    repeatRate: number;       // % of paid customers with >1 paid order in range
    conversionRate: number;   // paid / total (in range)
    refundedRevenue: number;
    cancelledCount: number;
    uniqueCustomers: number;
}

export function computeKPIs(orders: Order[]): KPISet {
    const paid = paidOnly(orders);
    const revenue = paid.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = orders.length;
    const paidCount = paid.length;
    const aov = paidCount > 0 ? revenue / paidCount : 0;
    const refundedRevenue = orders
        .filter(o => (o as any).refundStatus === 'Reversed' || (o as any).paymentStatus === 'Refunded')
        .reduce((s, o) => s + (Number((o as any).refundAmount || o.total) || 0), 0);
    const cancelledCount = orders.filter(o => o.status === 'Cancelled').length;

    const customerCounts = new Map<string, number>();
    for (const o of paid) {
        const uid = String((o as any).userId || (o as any).userEmail || 'anon');
        customerCounts.set(uid, (customerCounts.get(uid) || 0) + 1);
    }
    const uniqueCustomers = customerCounts.size;
    const repeats = Array.from(customerCounts.values()).filter(c => c > 1).length;
    const repeatRate = uniqueCustomers > 0 ? (repeats / uniqueCustomers) * 100 : 0;
    const conversionRate = orderCount > 0 ? (paidCount / orderCount) * 100 : 0;

    return { revenue, orderCount, paidCount, aov, repeatRate, conversionRate, refundedRevenue, cancelledCount, uniqueCustomers };
}

function bucketKey(date: Date, granularity: Granularity): string {
    if (granularity === 'day') {
        return date.toISOString().slice(0, 10);
    }
    if (granularity === 'week') {
        const d = new Date(date);
        const day = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() - day + 1); // Monday-anchored
        return d.toISOString().slice(0, 10);
    }
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface SeriesPoint {
    bucket: string;          // ISO date or YYYY-MM
    label: string;           // human-readable
    revenue: number;
    orders: number;
    aov: number;
}

export function revenueSeries(orders: Order[], granularity: Granularity): SeriesPoint[] {
    const paid = paidOnly(orders);
    const byBucket = new Map<string, { revenue: number; orders: number }>();
    for (const o of paid) {
        const d = new Date(o.date);
        if (!Number.isFinite(d.getTime())) continue;
        const k = bucketKey(d, granularity);
        const cur = byBucket.get(k) || { revenue: 0, orders: 0 };
        cur.revenue += Number(o.total) || 0;
        cur.orders += 1;
        byBucket.set(k, cur);
    }
    const sorted = Array.from(byBucket.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([bucket, v]) => {
        const label = humanBucketLabel(bucket, granularity);
        return { bucket, label, revenue: Math.round(v.revenue), orders: v.orders, aov: Math.round(v.revenue / Math.max(v.orders, 1)) };
    });
}

function humanBucketLabel(bucket: string, granularity: Granularity): string {
    if (granularity === 'month') {
        const [y, m] = bucket.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
    }
    const d = new Date(bucket);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export interface TopItem {
    key: string;
    label: string;
    revenue: number;
    units: number;
}

export function topProducts(orders: Order[], limit = 8): TopItem[] {
    const paid = paidOnly(orders);
    const byProduct = new Map<string, TopItem>();
    for (const o of paid) {
        for (const item of (o.items || []) as any[]) {
            const k = String(item.id);
            const cur = byProduct.get(k) || { key: k, label: item.name || k, revenue: 0, units: 0 };
            cur.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
            cur.units += Number(item.quantity) || 0;
            byProduct.set(k, cur);
        }
    }
    return Array.from(byProduct.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)
        .map(p => ({ ...p, revenue: Math.round(p.revenue) }));
}

export function revenueByCategory(orders: Order[]): TopItem[] {
    const paid = paidOnly(orders);
    const byCat = new Map<string, TopItem>();
    for (const o of paid) {
        for (const item of (o.items || []) as any[]) {
            const k = String((item as any).category || 'Uncategorised');
            const cur = byCat.get(k) || { key: k, label: k, revenue: 0, units: 0 };
            cur.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
            cur.units += Number(item.quantity) || 0;
            byCat.set(k, cur);
        }
    }
    return Array.from(byCat.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => ({ ...p, revenue: Math.round(p.revenue) }));
}

export function revenueByCounty(orders: Order[]): TopItem[] {
    const paid = paidOnly(orders);
    const byCounty = new Map<string, TopItem>();
    for (const o of paid) {
        const county = String(((o as any).shippingAddress?.county || 'Unknown')).trim() || 'Unknown';
        const cur = byCounty.get(county) || { key: county, label: county, revenue: 0, units: 0 };
        cur.revenue += Number(o.total) || 0;
        cur.units += 1;
        byCounty.set(county, cur);
    }
    return Array.from(byCounty.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => ({ ...p, revenue: Math.round(p.revenue) }));
}

export interface SegmentSlice { label: string; orders: number; revenue: number }

export function newVsRepeat(orders: Order[]): SegmentSlice[] {
    const paid = paidOnly(orders);
    const seen = new Set<string>();
    let newOrders = 0;
    let newRevenue = 0;
    let repeatOrders = 0;
    let repeatRevenue = 0;
    const sorted = [...paid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const o of sorted) {
        const uid = String((o as any).userId || (o as any).userEmail || `anon-${o.id}`);
        if (seen.has(uid)) {
            repeatOrders += 1;
            repeatRevenue += Number(o.total) || 0;
        } else {
            seen.add(uid);
            newOrders += 1;
            newRevenue += Number(o.total) || 0;
        }
    }
    return [
        { label: 'New customers', orders: newOrders, revenue: Math.round(newRevenue) },
        { label: 'Repeat customers', orders: repeatOrders, revenue: Math.round(repeatRevenue) },
    ];
}

export interface PatternBucket { label: string; orders: number; revenue: number }

export function ordersByDayOfWeek(orders: Order[]): PatternBucket[] {
    const paid = paidOnly(orders);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets: PatternBucket[] = days.map(d => ({ label: d, orders: 0, revenue: 0 }));
    for (const o of paid) {
        const d = new Date(o.date);
        if (!Number.isFinite(d.getTime())) continue;
        const idx = d.getDay();
        buckets[idx].orders += 1;
        buckets[idx].revenue += Number(o.total) || 0;
    }
    return buckets.map(b => ({ ...b, revenue: Math.round(b.revenue) }));
}

export function ordersByHourOfDay(orders: Order[]): PatternBucket[] {
    const paid = paidOnly(orders);
    const buckets: PatternBucket[] = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, '0')}:00`,
        orders: 0,
        revenue: 0,
    }));
    for (const o of paid) {
        const d = new Date(o.date);
        if (!Number.isFinite(d.getTime())) continue;
        const h = d.getHours();
        buckets[h].orders += 1;
        buckets[h].revenue += Number(o.total) || 0;
    }
    return buckets.map(b => ({ ...b, revenue: Math.round(b.revenue) }));
}

export interface PaymentMixSlice { label: string; orders: number; revenue: number }

export function paymentMethodMix(orders: Order[]): PaymentMixSlice[] {
    const paid = paidOnly(orders);
    const norm = (m: any) => {
        const s = String(m || 'Unknown').toLowerCase();
        if (s.includes('m-pesa') || s.includes('mpesa')) return 'M-Pesa';
        if (s.includes('cash')) return 'Cash on Delivery';
        if (s.includes('card') || s.includes('paystack')) return 'Card';
        if (s.includes('whatsapp')) return 'WhatsApp';
        return String(m || 'Unknown');
    };
    const map = new Map<string, PaymentMixSlice>();
    for (const o of paid) {
        const k = norm((o as any).paymentMethod);
        const cur = map.get(k) || { label: k, orders: 0, revenue: 0 };
        cur.orders += 1;
        cur.revenue += Number(o.total) || 0;
        map.set(k, cur);
    }
    return Array.from(map.values())
        .map(s => ({ ...s, revenue: Math.round(s.revenue) }))
        .sort((a, b) => b.revenue - a.revenue);
}
