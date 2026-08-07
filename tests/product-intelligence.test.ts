import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventoryRecommendations, findSearchDemandGaps } from '../src/lib/product-intelligence.ts';
import type { Order, Product } from '../src/types/index.ts';

const product: Product = { id: 'p1', name: 'Maize Seed', category: 'Seeds', price: 500, image: '', rating: 4, reviews: 2, inStock: true, stockQuantity: 5, lowStockThreshold: 2, supplierLeadTimeDays: 14, safetyStock: 3, incomingStock: 0, minimumOrderQuantity: 10 };
const order: Order = { id: 'o1', userId: 'u1', date: '2026-03-25', total: 500, shippingCost: 0, paymentMethod: 'mpesa', paymentStatus: 'Paid', status: 'Delivered', shippingAddress: { county: 'Nairobi', details: '' }, items: [{ id: 'p1', name: 'Maize Seed', quantity: 30, price: 500 }] };

test('inventory recommendation includes lead time, safety stock and MOQ', () => {
    const result = buildInventoryRecommendations([order], [product], new Date('2026-04-01'))[0];
    assert.equal(result.reorderNow, true);
    assert.ok(result.reorderPoint >= 17);
    assert.ok(result.recommendedOrderQuantity >= 10);
});

test('search demand gaps identify missing catalog demand', () => {
    const gaps = findSearchDemandGaps([{ term: 'drip irrigation kit', count: 9 }, { term: 'maize', count: 4 }], [product]);
    assert.deepEqual(gaps.map(gap => gap.term), ['drip irrigation kit']);
});
