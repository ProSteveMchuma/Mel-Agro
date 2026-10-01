import test from 'node:test';
import assert from 'node:assert/strict';
import {
    alertIsOpen,
    alertWorkHref,
    canPackOrder,
    cashSettlementOnFinish,
    isCashOnDelivery,
    normalizeAnalyticsPath,
    paymentReminderBlockReason,
    rollupVisitBreakdown,
    shouldReleaseUnpaidReservation,
    shouldSendScheduledPaymentReminder,
    supplyFieldsMissing,
    visitRegionLabel,
} from '../src/lib/commerce-ops.ts';

const NOW = Date.parse('2026-10-02T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

test('unpaid M-Pesa stock is released after 24 hours, not after 30 minutes', () => {
    const base = {
        stockReservationStatus: 'active',
        status: 'Pending Payment',
        paymentStatus: 'Unpaid',
        paymentMethod: 'M-Pesa',
        date: new Date(NOW - DAY - 1000).toISOString(),
    };
    assert.equal(shouldReleaseUnpaidReservation(base, NOW), true);
    assert.equal(shouldReleaseUnpaidReservation({ ...base, date: new Date(NOW - 60 * 60 * 1000).toISOString() }, NOW), false);
    assert.equal(shouldReleaseUnpaidReservation({ ...base, paymentInitiatedAt: new Date(NOW - 10 * 60 * 1000).toISOString() }, NOW), false);
    assert.equal(shouldReleaseUnpaidReservation({ ...base, paymentMethod: 'Cash on Delivery' }, NOW), false);
    assert.equal(shouldReleaseUnpaidReservation({ ...base, paymentStatus: 'Paid' }, NOW), false);
    assert.equal(shouldReleaseUnpaidReservation({ ...base, stockReservationStatus: 'committed' }, NOW), false);
});

test('one payment reminder is only for unpaid M-Pesa with a phone', () => {
    const due = {
        paymentStatus: 'Unpaid',
        paymentMethod: 'M-Pesa',
        status: 'Pending Payment',
        reminderCount: 0,
        phone: '+254700000000',
        date: new Date(NOW - 3 * 60 * 60 * 1000).toISOString(),
    };
    assert.equal(shouldSendScheduledPaymentReminder(due, NOW), true);
    assert.equal(shouldSendScheduledPaymentReminder({ ...due, reminderCount: 1 }, NOW), false);
    assert.equal(shouldSendScheduledPaymentReminder({ ...due, paymentMethod: 'Cash on Delivery' }, NOW), false);
    assert.equal(shouldSendScheduledPaymentReminder({ ...due, date: new Date(NOW - 30 * 60 * 1000).toISOString() }, NOW), false);
    assert.equal(paymentReminderBlockReason({ paymentMethod: 'Cash on Delivery', paymentStatus: 'Unpaid' }), 'Cash on delivery is collected when the order is delivered or collected');
});

test('cash on delivery can be packed while unpaid and is settled when finished', () => {
    assert.equal(isCashOnDelivery('Cash on Delivery'), true);
    assert.equal(canPackOrder({ status: 'Processing', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery' }), true);
    assert.equal(canPackOrder({ status: 'Processing', paymentStatus: 'Unpaid', paymentMethod: 'M-Pesa' }), false);
    assert.equal(canPackOrder({ status: 'Processing', paymentStatus: 'Paid', paymentMethod: 'M-Pesa' }), true);
    assert.equal(cashSettlementOnFinish({ paymentMethod: 'Cash on Delivery', paymentStatus: 'Unpaid' }, 'Delivered'), true);
    assert.equal(cashSettlementOnFinish({ paymentMethod: 'Cash on Delivery', paymentStatus: 'Unpaid' }, 'Shipped'), false);
    assert.equal(cashSettlementOnFinish({ paymentMethod: 'Cash on Delivery', paymentStatus: 'Paid' }, 'Delivered'), false);
});

test('action centre links and snooze hide resolved work', () => {
    assert.equal(alertWorkHref({ type: 'payment_recovery', entityId: 'abc' }), '/dashboard/admin/orders/abc');
    assert.equal(alertWorkHref({ type: 'stock', entityId: 'sku' }), '/dashboard/admin/products/edit/sku');
    assert.equal(alertWorkHref({ type: 'fulfillment', entityId: 'ord' }), '/dashboard/admin/orders/ord');
    assert.equal(alertIsOpen({ status: 'resolved' }), false);
    assert.equal(alertIsOpen({ status: 'snoozed', snoozedUntil: new Date(NOW + DAY).toISOString() }, NOW), false);
    assert.equal(alertIsOpen({ status: 'snoozed', snoozedUntil: new Date(NOW - 1000).toISOString() }, NOW), true);
    assert.equal(supplyFieldsMissing({ supplierLeadTimeDays: 14, safetyStock: 2, minimumOrderQuantity: 1 }), false);
    assert.equal(supplyFieldsMissing({ safetyStock: 2, minimumOrderQuantity: 1 }), true);
});

test('visit paths and regions stay anonymous and shop-only', () => {
    assert.equal(normalizeAnalyticsPath('/products/agral-90'), '/products/agral-90');
    assert.equal(normalizeAnalyticsPath('/dashboard/admin'), null);
    assert.equal(normalizeAnalyticsPath('https://evil.example/products'), null);
    const headers = { get: (name: string) => name === 'x-vercel-ip-city' ? 'Nairobi' : name === 'x-vercel-ip-country' ? 'KE' : null };
    assert.equal(visitRegionLabel(headers), 'Nairobi, Kenya');
    assert.deepEqual(rollupVisitBreakdown([
        { key: '/products', views: 2, uniques: 1 },
        { key: '/products', views: 3, uniques: 2 },
        { key: '/', views: 1, uniques: 1 },
    ]), [
        { key: '/products', views: 5, uniques: 3 },
        { key: '/', views: 1, uniques: 1 },
    ]);
});
