import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerProfiles, customerIdentityKey } from '../src/lib/customer-intelligence.ts';
import type { Order } from '../src/types/index.ts';

const makeOrder = (id: string, userId: string, phone: string): Order => ({ id, userId, phone, userName: 'Farmer', date: `2026-01-0${id}`, total: 100, shippingCost: 0, paymentMethod: 'mpesa', paymentStatus: 'Paid', status: 'Delivered', shippingAddress: { county: 'Nairobi', details: '' }, items: [{ id: 'p', name: 'Seed', price: 100, quantity: 1 }] });

test('guest and registered orders unify through normalized phone identity', () => {
    const guest = makeOrder('1', 'guest-uid', '0712345678');
    const account = makeOrder('2', 'account-uid', '+254 712 345 678');
    assert.equal(customerIdentityKey(guest), customerIdentityKey(account));
    const profiles = buildCustomerProfiles([guest, account]);
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].paidOrderCount, 2);
    assert.equal(profiles[0].userId, 'account-uid');
});
