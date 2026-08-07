import test from 'node:test';
import assert from 'node:assert/strict';
import { actionableReorders, buildReorderPredictions } from '../src/lib/reorder-intelligence.ts';
import type { Order } from '../src/types/index.ts';

const order = (id: string, date: string): Order => ({
    id, userId: 'u1', date, total: 100, shippingCost: 0, paymentMethod: 'mpesa', paymentStatus: 'Paid', status: 'Delivered',
    shippingAddress: { county: 'Nairobi', details: '' }, items: [{ id: 'p1', name: 'Seed', price: 100, quantity: 2 }],
});

test('predicts reorder interval from paid repeat purchases', () => {
    const predictions = buildReorderPredictions([order('1', '2026-01-01'), order('2', '2026-01-31'), order('3', '2026-03-02')], new Date('2026-03-20'));
    assert.equal(predictions[0].intervalDays, 30);
    assert.equal(predictions[0].confidence, 'high');
    assert.equal(predictions[0].daysUntilExpected, 12);
    assert.equal(actionableReorders(predictions).length, 1);
});

test('ignores unpaid purchasing activity', () => {
    const unpaid = { ...order('1', '2026-01-01'), paymentStatus: 'Unpaid' as const };
    assert.equal(buildReorderPredictions([unpaid]).length, 0);
});
