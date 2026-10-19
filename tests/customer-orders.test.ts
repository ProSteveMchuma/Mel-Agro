import assert from 'node:assert/strict';
import test from 'node:test';
import {
    accountHomeOrder,
    customerCanOpenOrder,
    isRetryableMpesaOrder,
    mergeCustomerOrders,
    ordersWithReturn,
    readRememberedOrder,
    rememberOpenableOrder,
    storedPaymentLabel,
} from '../src/lib/customer-orders.ts';

const uid = 'farmer-1';

test('cart stays until the saved order belongs to this customer', () => {
    assert.equal(customerCanOpenOrder({ id: 'order-1', userId: uid }, uid), true);
    assert.equal(customerCanOpenOrder({ id: 'order-1', userId: 'someone-else' }, uid), false);
    assert.equal(customerCanOpenOrder({ id: '', userId: uid }, uid), false);
    assert.equal(customerCanOpenOrder({ id: 'order-1', userId: uid }, null), false);
});

test('payment labels stay on values the order document stores', () => {
    assert.equal(storedPaymentLabel('Failed'), 'Failed');
    assert.equal(storedPaymentLabel('Pending Verification'), 'Pending Verification');
    assert.equal(storedPaymentLabel('Refunded'), 'Refunded');
    assert.equal(storedPaymentLabel('Pending'), 'Unpaid');
    assert.equal(storedPaymentLabel(''), 'Unpaid');
});

test('a failed M-Pesa order stays retryable and a till order does not look like an STK prompt', () => {
    assert.equal(isRetryableMpesaOrder({
        paymentMethod: 'M-Pesa',
        paymentStatus: 'Failed',
        status: 'Pending Payment',
    }), true);
    assert.equal(isRetryableMpesaOrder({
        paymentMethod: 'M-Pesa Till (ABC123)',
        paymentStatus: 'Pending Verification',
        status: 'Pending Payment',
    }), false);
    assert.equal(isRetryableMpesaOrder({
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Unpaid',
        status: 'Processing',
    }), false);
});

test('returns only include a return the backend stored', () => {
    const orders = [
        { id: 'cancelled', status: 'Cancelled', returnStatus: null },
        { id: 'asked', returnStatus: 'Requested' },
        { id: 'invented', returnStatus: 'Processing' },
    ];
    assert.deepEqual(ordersWithReturn(orders).map((order) => order.id), ['asked']);
});

test('account home keeps an unpaid order visible', () => {
    const home = accountHomeOrder([
        { id: 'delivered', status: 'Delivered', date: '2026-10-02' },
        { id: 'failed', status: 'Pending Payment', date: '2026-10-01' },
    ]);
    assert.equal(home?.id, 'failed');
});

test('merge keeps a failed order the live listener missed', () => {
    const merged = mergeCustomerOrders(
        [],
        [{
            id: 'order-9',
            userId: uid,
            date: '2026-10-19T10:00:00.000Z',
            paymentStatus: 'Failed',
            status: 'Pending Payment',
        }],
        null,
        uid,
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].paymentStatus, 'Failed');
});

test('merge drops an order saved on another account', () => {
    const merged = mergeCustomerOrders(
        [{ id: 'mine', userId: uid, date: '2026-10-19' }],
        [{ id: 'theirs', userId: 'other', date: '2026-10-19' }],
        { id: 'guest', userId: 'guest', date: '2026-10-19' },
        uid,
    );
    assert.deepEqual(merged.map((order) => order.id), ['mine']);
});

test('a checkout snapshot is readable only by the customer who placed it', () => {
    const storage = new Map<string, string>();
    const memory = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value); },
        removeItem: (key: string) => { storage.delete(key); },
    };
    rememberOpenableOrder({
        id: 'order-9',
        userId: uid,
        paymentStatus: 'Failed',
        status: 'Pending Payment',
        total: 500,
        items: [{ id: 'seed', name: 'Maize', price: 500, quantity: 1 }],
    }, memory);
    assert.equal(readRememberedOrder(uid, memory)?.id, 'order-9');
    assert.equal(readRememberedOrder('other', memory), null);
});
