import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPaymentHealth, deliveryEtaAccuracy } from '../src/lib/fulfillment-intelligence.ts';
import type { Order } from '../src/types/index.ts';

const base = (id: string): Order => ({ id, userId: 'u', date: '2026-04-01T10:00:00Z', total: 1000, shippingCost: 0, paymentMethod: 'mpesa', status: 'Processing', shippingAddress: { county: 'Nairobi', details: '' }, items: [] });

test('classifies clustered non-customer payment failures as provider incident', () => {
    const failures = ['1','2','3'].map(id => ({ ...base(id), paymentStatus: 'Failed' as const, paymentFailureCode: '500' } as Order));
    const result = classifyPaymentHealth(failures, new Date('2026-04-01T10:30:00Z'));
    assert.equal(result.kind, 'provider_incident');
});

test('measures delivery against configured county ETA', () => {
    const delivered = { ...base('d'), status: 'Delivered' as const, paymentStatus: 'Paid' as const, paidAt: '2026-04-01T10:00:00Z', deliveredAt: '2026-04-02T08:00:00Z' };
    const result = deliveryEtaAccuracy([delivered]);
    assert.equal(result.deliveredOrders, 1);
    assert.equal(result.onTimeOrders, 1);
});
