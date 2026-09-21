import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createOrderAccessToken,
    createReturnSessionToken,
    customerOrderUrl,
    isCustomerCancellable,
    isReturnEligible,
    phoneAccessKey,
    publicOrderSummary,
    verifyOrderAccessToken,
    verifyReturnSessionToken,
} from '../src/lib/order-access.ts';

const order = { id: 'abcde12345', phone: '0712345678' };

test('phoneAccessKey keeps the last 9 national digits', () => {
    assert.equal(phoneAccessKey('0712345678'), '712345678');
    assert.equal(phoneAccessKey('+254712345678'), '712345678');
    assert.equal(phoneAccessKey('254712345678'), '712345678');
});

test('pay tokens verify for matching order/phone/action and expire', () => {
    const now = 1_700_000_000_000;
    const token = createOrderAccessToken({
        orderId: order.id,
        phone: order.phone,
        action: 'pay',
        ttlMs: 60_000,
        now,
    });
    const ok = verifyOrderAccessToken(token, {
        orderId: order.id,
        phone: order.phone,
        action: 'pay',
        now: now + 30_000,
    });
    assert.equal(ok.ok, true);

    const wrongAction = verifyOrderAccessToken(token, {
        orderId: order.id,
        phone: order.phone,
        action: 'return',
        now: now + 30_000,
    });
    assert.equal(wrongAction.ok, false);

    const expired = verifyOrderAccessToken(token, {
        orderId: order.id,
        phone: order.phone,
        action: 'pay',
        now: now + 120_000,
    });
    assert.equal(expired.ok, false);
});

test('return session tokens are short-lived and action-scoped', () => {
    const now = 1_700_000_000_000;
    const token = createReturnSessionToken({ orderId: order.id, phone: order.phone, now });
    assert.equal(verifyReturnSessionToken(token, { orderId: order.id, phone: order.phone, now: now + 60_000 }).ok, true);
    assert.equal(verifyReturnSessionToken(token, { orderId: order.id, phone: order.phone, now: now + 20 * 60_000 }).ok, false);
});

test('customerOrderUrl builds action deep links with signed tokens', () => {
    const pay = customerOrderUrl(order, 'pay');
    const view = customerOrderUrl(order, 'view');
    const ret = customerOrderUrl(order, 'return');
    assert.match(pay, /\/orders\/abcde12345\/pay\?t=/);
    assert.match(view, /\/orders\/abcde12345\?t=/);
    assert.match(ret, /\/orders\/abcde12345\/return\?t=/);
    assert.equal(pay.includes('dashboard/user'), false);
});

test('isReturnEligible enforces delivered/collected + 7-day window', () => {
    assert.equal(isReturnEligible({ status: 'Delivered' }).ok, true);
    assert.equal(isReturnEligible({ status: 'Collected' }).ok, true);
    assert.equal(isReturnEligible({ status: 'Shipped' }).ok, false);
    assert.equal(isReturnEligible({ status: 'Ready for Collection' }).ok, false);
    assert.equal(isReturnEligible({ status: 'Delivered', returnStatus: 'Requested' }).ok, false);
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isReturnEligible({ status: 'Delivered', deliveredAt: eightDaysAgo }).ok, false);
    assert.equal(isReturnEligible({ status: 'Collected', collectedAt: eightDaysAgo }).ok, false);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isReturnEligible({ status: 'Collected', collectedAt: yesterday }).ok, true);
});

test('isCustomerCancellable allows unpaid early orders only', () => {
    assert.equal(isCustomerCancellable({ status: 'Pending Payment', paymentStatus: 'Unpaid' }).ok, true);
    assert.equal(isCustomerCancellable({ status: 'Processing', paymentStatus: 'Failed' }).ok, true);
    assert.equal(isCustomerCancellable({ status: 'Pending Payment', paymentStatus: 'Paid' }).ok, false);
    assert.equal(isCustomerCancellable({ status: 'Shipped', paymentStatus: 'Unpaid' }).ok, false);
    assert.equal(isCustomerCancellable({ status: 'Cancelled', paymentStatus: 'Unpaid' }).ok, false);
});

test('publicOrderSummary exposes tracking and canCancel', () => {
    const summary = publicOrderSummary({
        userName: 'Ann',
        phone: '0712345678',
        status: 'Shipped',
        paymentStatus: 'Paid',
        shippingMethod: 'standard',
        tracking: { carrier: 'G4S', trackingNumber: 'TRK-99' },
        items: [{ id: '1', name: 'Seed', quantity: 2, price: 100 }],
        total: 200,
    }, 'orderxyz1');
    assert.equal(summary.canCancel, false);
    assert.deepEqual(summary.tracking, { carrier: 'G4S', trackingNumber: 'TRK-99' });
    assert.equal(summary.shortId, 'ORDERXYZ');
});