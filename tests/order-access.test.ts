import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createOrderAccessToken,
    createReturnSessionToken,
    customerOrderUrl,
    isReturnEligible,
    phoneAccessKey,
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

test('isReturnEligible enforces delivered + 7-day window', () => {
    assert.equal(isReturnEligible({ status: 'Delivered' }).ok, true);
    assert.equal(isReturnEligible({ status: 'Shipped' }).ok, false);
    assert.equal(isReturnEligible({ status: 'Delivered', returnStatus: 'Requested' }).ok, false);
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isReturnEligible({ status: 'Delivered', deliveredAt: eightDaysAgo }).ok, false);
});
