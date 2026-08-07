import type { Order, Product } from '@/types';
import { searchProducts } from './search.ts';

const DAY_MS = 86_400_000;

export interface SearchDemandGap {
    term: string;
    searches: number;
    opportunity: 'missing_product' | 'weak_match';
    closestProduct?: string;
}

export interface InventoryRecommendation {
    productId: string;
    name: string;
    stock: number;
    incomingStock: number;
    safetyStock: number;
    supplierLeadTimeDays: number;
    dailyVelocity: number;
    daysOfCover: number;
    reorderPoint: number;
    recommendedOrderQuantity: number;
    reorderNow: boolean;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

export function findSearchDemandGaps(searches: Array<{ term: string; count: number }>, products: Product[]): SearchDemandGap[] {
    const gaps: SearchDemandGap[] = [];
    for (const search of searches) {
        const matches = searchProducts(products, search.term);
        if (!matches.length) {
            gaps.push({ term: search.term, searches: search.count, opportunity: 'missing_product' });
            continue;
        }
        const best = matches[0];
        const exactish = [best.name, best.brand, best.category, ...(best.tags || [])].filter(Boolean).some(value => String(value).toLowerCase().includes(search.term.toLowerCase()));
        if (!exactish) gaps.push({ term: search.term, searches: search.count, opportunity: 'weak_match', closestProduct: best.name });
    }
    return gaps.sort((a, b) => b.searches - a.searches);
}

export function buildInventoryRecommendations(orders: Order[], products: Product[], now = new Date()): InventoryRecommendation[] {
    const paid = orders.filter(order => order.paymentStatus === 'Paid' && order.status !== 'Cancelled');
    return products.map(product => {
        const unitsWithin = (days: number) => paid.filter(order => {
            const date = new Date(order.date || order.createdAt || '').getTime();
            return Number.isFinite(date) && date >= now.getTime() - days * DAY_MS;
        }).reduce((sum, order) => sum + (order.items || []).filter(item => String(item.id) === String(product.id)).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0);
        const units30 = unitsWithin(30);
        const units90 = unitsWithin(90);
        const dailyVelocity = Math.max(units30 / 30, units90 / 90);
        const stock = Number(product.stockQuantity ?? product.stock ?? 0);
        const incomingStock = Number(product.incomingStock || 0);
        const safetyStock = Number(product.safetyStock ?? product.lowStockThreshold ?? 0);
        const supplierLeadTimeDays = Math.max(1, Number(product.supplierLeadTimeDays || 14));
        const minimumOrderQuantity = Math.max(1, Number(product.minimumOrderQuantity || 1));
        const projectedStock = stock + incomingStock;
        const reorderPoint = Math.ceil(dailyVelocity * supplierLeadTimeDays + safetyStock);
        const targetStock = Math.ceil(dailyVelocity * (supplierLeadTimeDays + 30) + safetyStock);
        const shortage = Math.max(0, targetStock - projectedStock);
        const recommendedOrderQuantity = shortage > 0 ? Math.max(minimumOrderQuantity, shortage) : 0;
        const daysOfCover = dailyVelocity > 0 ? projectedStock / dailyVelocity : Infinity;
        const confidence: InventoryRecommendation['confidence'] = units90 >= 10 ? 'high' : units90 >= 3 ? 'medium' : 'low';
        const reorderNow = projectedStock <= reorderPoint && dailyVelocity > 0;
        return {
            productId: String(product.id), name: product.name, stock, incomingStock, safetyStock, supplierLeadTimeDays,
            dailyVelocity: Math.round(dailyVelocity * 100) / 100,
            daysOfCover: Number.isFinite(daysOfCover) ? Math.round(daysOfCover * 10) / 10 : Infinity,
            reorderPoint, recommendedOrderQuantity, reorderNow, confidence,
            reason: reorderNow
                ? `Projected stock is at or below the ${reorderPoint}-unit lead-time reorder point`
                : dailyVelocity === 0 ? 'No paid sales in the 90-day evidence window' : `${Math.round(daysOfCover)} days of cover including incoming stock`,
        };
    }).sort((a, b) => Number(b.reorderNow) - Number(a.reorderNow) || a.daysOfCover - b.daysOfCover);
}
