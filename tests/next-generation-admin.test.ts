import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAFF_PROFILES, canAccessAdminPath, canAdjustInventory } from '../src/lib/admin-permissions.ts';
import { fulfillmentQueueFacts, promiseHours } from '../src/lib/fulfillment-age.ts';
import { bookPaymentMethod, nairobiDayBook, nairobiDayKey } from '../src/lib/day-book.ts';
import { buildSalesBook, salesBookCsv } from '../src/lib/sales-book.ts';
import { movementPackName, movementReason } from '../src/lib/inventory-movements.ts';
import { returnedPacks } from '../src/lib/returns-summary.ts';
import { PICKUP_STORE } from '../src/lib/pickup.ts';

const HOUR = 60 * 60 * 1000;

test('a zone promise uses its upper bound', () => {
    assert.equal(promiseHours('1–2 business days'), 48);
    assert.equal(promiseHours('Same day or next day'), 48);
    assert.equal(promiseHours(PICKUP_STORE.etaText), 2);
    assert.equal(promiseHours('Ready for collection'), null);
});

test('late orders are past the promise, and a wait is not late', () => {
    const packedAt = '2026-03-02T06:00:00.000Z';
    const now = Date.parse(packedAt) + 3 * HOUR;
    const latePickup = fulfillmentQueueFacts({
        date: packedAt,
        processingAt: packedAt,
        shippingMethod: 'pickup',
    }, undefined, now);
    assert.equal(latePickup.late, true);
    assert.equal(latePickup.methodLabel, 'Machakos pickup');
    assert.equal(latePickup.place, 'Machakos pickup');
    assert.equal(latePickup.hours, 3);

    const waiting = fulfillmentQueueFacts({
        date: packedAt,
        processingAt: packedAt,
        shippingMethod: 'pickup',
        fulfillmentWait: { reason: 'Customer asked us to hold', by: 'packer@melagri.co.ke', at: packedAt },
    }, undefined, now);
    assert.equal(waiting.late, false);
    assert.equal(waiting.waiting?.by, 'packer@melagri.co.ke');

    const onTime = fulfillmentQueueFacts({
        date: packedAt,
        processingAt: packedAt,
        shippingMethod: 'standard',
        shippingAddress: { county: 'Nairobi' },
    }, undefined, now);
    assert.equal(onTime.late, false);
    assert.equal(onTime.place, 'Nairobi');
    assert.equal(onTime.etaText, 'Same day or next day');
});

test('the Nairobi day book splits the four collection methods', () => {
    const day = '2026-03-10';
    assert.equal(nairobiDayKey('2026-03-10T10:00:00.000Z'), day);
    const book = nairobiDayBook({
        day,
        unmatchedTill: [{ amount: 500 }, { amount: 250 }],
        orders: [
            { date: '2026-03-10T08:00:00.000Z', paidAt: '2026-03-10T08:05:00.000Z', paymentStatus: 'Paid', paymentMethod: 'M-Pesa', total: 1000 },
            { date: '2026-03-10T09:00:00.000Z', paidAt: '2026-03-10T09:10:00.000Z', paymentStatus: 'Paid', paymentMethod: 'M-Pesa Till (C2B)', total: 2000 },
            { date: '2026-03-09T09:00:00.000Z', paidAt: '2026-03-10T18:00:00.000Z', paymentStatus: 'Paid', paymentMethod: 'Cash on Delivery', total: 400, status: 'Delivered' },
            { date: '2026-03-10T10:00:00.000Z', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', total: 700, status: 'Shipped' },
            { date: '2026-03-10T11:00:00.000Z', paymentStatus: 'Unpaid', paymentMethod: 'Cash on Delivery', total: 50, status: 'Processing' },
            { date: '2026-03-10T12:00:00.000Z', paidAt: '2026-03-10T12:02:00.000Z', paymentStatus: 'Paid', paymentMethod: 'Card (Paystack)', total: 3000 },
        ],
    });
    assert.deepEqual(book.mpesaExpress, { count: 1, total: 1000 });
    assert.equal(book.till.count, 1);
    assert.equal(book.till.total, 2000);
    assert.equal(book.till.unmatchedCount, 2);
    assert.equal(book.till.unmatchedTotal, 750);
    assert.equal(book.cash.total, 400);
    assert.equal(book.cash.stillOutCount, 1);
    assert.equal(book.cash.stillOutTotal, 700);
    assert.deepEqual(book.card, { count: 1, total: 3000 });
    assert.equal(bookPaymentMethod('manual_mpesa'), 'till');
});

test('the sales book keeps refunds on the order and labels VAT as an estimate', () => {
    const book = buildSalesBook([
        {
            id: 'paid-1',
            paymentStatus: 'Paid',
            paymentMethod: 'M-Pesa',
            subtotal: 1160,
            shippingCost: 200,
            discountAmount: 160,
            couponCode: 'SEED10',
            couponDiscount: 160,
            total: 1200,
            shippingAddress: { county: 'Nairobi' },
            items: [
                { name: 'Maize seed', price: 580, quantity: 2, selectedVariant: { name: '2kg' } },
            ],
        },
        {
            id: 'refunded',
            paymentStatus: 'Paid',
            paymentMethod: 'Card',
            refundStatus: 'Reversed',
            refundAmount: 300,
            subtotal: 500,
            shippingCost: 0,
            discountAmount: 0,
            total: 500,
            shippingMethod: 'pickup',
            items: [
                { name: 'Maize seed', price: 250, quantity: 1, selectedVariant: { name: '2kg' } },
                { name: 'Fertilizer', price: 250, quantity: 1, selectedVariant: { name: '1kg' } },
            ],
        },
    ], { enabled: true, taxRate: 16 });

    assert.equal(book.goodsAfterDiscount, 1000 + 500);
    assert.equal(book.deliveryFees, 200);
    assert.equal(book.discountsGiven, 160);
    assert.equal(book.refunds, 300);
    assert.equal(book.net, 1000 + 500 + 200 - 300);
    assert.ok(book.vatEstimate > 0);
    const maize = book.products.find((row) => row.name === 'Maize seed' && row.pack === '2kg');
    assert.equal(maize?.units, 3);
    assert.equal(maize?.amount, 1160 + 250);
    assert.equal(book.codes[0]?.code, 'SEED10');
    assert.equal(book.codes[0]?.times, 1);
    assert.equal(book.codes[0]?.amount, 160);
    assert.equal(book.zones.find((row) => row.zone === 'Machakos pickup')?.amount, 0);
    assert.equal(book.zones.find((row) => row.zone === 'Nairobi Region')?.amount, 200);
    assert.deepEqual(book.methods.stk, { count: 1, total: 1200 });
    assert.equal(book.methods.card.count, 1);

    const csv = salesBookCsv([], book);
    assert.match(csv, /Goods after discount/);
    assert.match(csv, /VAT estimate/);
    assert.match(csv, /M-Pesa Express/);
    assert.match(csv, /Till 3130847/);
    assert.match(csv, /Machakos pickup/);
    assert.doesNotMatch(csv, /Street|card number|taxId/i);
});

test('stock movements name the reason a person can read', () => {
    assert.equal(movementReason({ change: -2, updatedBy: 'System (Secure Checkout)' }), 'sale');
    assert.equal(movementReason({ type: 'admin_adjustment', reason: 'counted' }), 'counted');
    assert.equal(movementReason({ type: 'admin_adjustment', reason: 'damaged (pack-1)' }), 'damaged');
    assert.equal(movementReason({ type: 'goods_arrived', reason: 'Goods arrived' }), 'goods arrived');
    assert.equal(movementReason({ type: 'return' }), 'return');
    assert.equal(movementReason({ type: 'cancellation' }), 'cancel');
    assert.equal(movementPackName({ variantId: 'pack-1' }, [{ id: 'pack-1', name: '2kg' }]), '2kg');
});

test('approved returns sum units, and mixed orders omit the refund', () => {
    const rows = returnedPacks([
        {
            returnStatus: 'Approved',
            returnReason: 'Wrong pack',
            refundAmount: 800,
            items: [{ id: 'seed', name: 'Maize seed', quantity: 2, selectedVariant: { name: '2kg' } }],
        },
        {
            returnStatus: 'Approved',
            returnReason: 'Wrong pack',
            refundAmount: 1500,
            total: 1500,
            items: [
                { id: 'seed', name: 'Maize seed', quantity: 1, selectedVariant: { name: '2kg' } },
                { id: 'feed', name: 'Dairy meal', quantity: 1, selectedVariant: { name: '10kg' } },
            ],
        },
        { returnStatus: 'Requested', returnReason: 'Ignored', items: [{ id: 'seed', name: 'Maize seed', quantity: 9 }] },
    ]);
    const maize = rows.find((row) => row.product === 'Maize seed');
    const meal = rows.find((row) => row.product === 'Dairy meal');
    assert.equal(maize?.units, 3);
    assert.equal(maize?.refundAmount, null);
    assert.equal(meal?.units, 1);
    assert.equal(meal?.refundAmount, null);
    assert.equal(rows.some((row) => row.units === 9), false);

    const alone = returnedPacks([{
        returnStatus: 'Approved',
        returnReason: 'Damaged',
        refundAmount: 400,
        items: [{ id: 'seed', name: 'Maize seed', quantity: 1, selectedVariant: { name: '2kg' } }],
    }]);
    assert.equal(alone[0]?.refundAmount, 400);
});

test('operations can adjust inventory and still cannot edit the catalogue', () => {
    const operations = STAFF_PROFILES.operations.permissions;
    const support = STAFF_PROFILES.support.permissions;
    const catalogue = STAFF_PROFILES.catalogue.permissions;
    assert.equal(canAdjustInventory('admin', operations), true);
    assert.equal(canAccessAdminPath('admin', operations, '/dashboard/admin/inventory'), true);
    assert.equal(canAccessAdminPath('admin', operations, '/dashboard/admin/products'), false);
    assert.equal(canAccessAdminPath('admin', operations, '/dashboard/admin/products/edit/abc'), false);
    assert.equal(canAccessAdminPath('admin', operations, '/dashboard/admin/discounts'), false);
    assert.equal(canAdjustInventory('admin', support), false);
    assert.equal(canAccessAdminPath('admin', catalogue, '/dashboard/admin/inventory'), true);
    assert.equal(canAccessAdminPath('admin', catalogue, '/dashboard/admin/discounts'), true);
    const layout = readFileSync(join(process.cwd(), 'src/app/dashboard/admin/layout.tsx'), 'utf8');
    assert.match(layout, /canAdjustInventory/);
    assert.match(layout, /inventory[\s\S]*Operations/);
});
