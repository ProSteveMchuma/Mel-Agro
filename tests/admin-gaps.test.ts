import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPackAdjustment } from '../src/lib/inventory-stock.ts';
import { nairobiRangeUtc } from '../src/lib/nairobi-range.ts';
import { applyOrderConfirmationSms } from '../src/lib/communication-templates.ts';
import { sumPaidSpend } from '../src/lib/customer-spend.ts';
import type { Order } from '../src/types/index.ts';

test('pack adjustment updates that pack and sets the parent to the sum', () => {
    const result = applyPackAdjustment([
        { id: 'bag', name: '50kg', stockQuantity: 0 },
        { id: 'sachet', name: '1kg', stockQuantity: 4 },
    ], 'bag', 10);
    assert.equal(result.packs[0].stockQuantity, 10);
    assert.equal(result.packs[1].stockQuantity, 4);
    assert.equal(result.parentStock, 14);
    assert.throws(() => applyPackAdjustment(result.packs, 'bag', -11), /NEGATIVE_STOCK/);
    assert.throws(() => applyPackAdjustment(result.packs, 'missing', 1), /VARIANT_NOT_FOUND/);
});

test('sales report dates are Africa/Nairobi days', () => {
    const range = nairobiRangeUtc('2026-10-01', '2026-10-01');
    assert.equal(range.start.toISOString(), '2026-09-30T21:00:00.000Z');
    assert.equal(range.endExclusive.toISOString(), '2026-10-01T21:00:00.000Z');
    const evening = Date.parse('2026-10-01T20:30:00.000Z');
    const nextMorning = Date.parse('2026-10-01T21:30:00.000Z');
    assert.equal(evening >= range.start.getTime() && evening < range.endExclusive.getTime(), true);
    assert.equal(nextMorning >= range.start.getTime() && nextMorning < range.endExclusive.getTime(), false);
});

test('confirmation SMS uses a saved template only when it contains the order id', () => {
    const order = { id: 'abcde12345', userName: 'Wanjiku', total: 1500, items: [] } as unknown as Order;
    const saved = applyOrderConfirmationSms(order, 'Thank you {customerName}, order {orderId} is KES {total}.');
    assert.equal(saved, 'Thank you Wanjiku, order ABCDE is KES 1,500.');
    const fallback = applyOrderConfirmationSms(order, '   ');
    assert.match(fallback, /Habari Wanjiku/);
    assert.match(fallback, /#ABCDE/);
});

test('paid spend sums every paid order and ignores unpaid ones', () => {
    assert.equal(sumPaidSpend([
        { paymentStatus: 'Paid', total: 100 },
        { paymentStatus: 'Unpaid', total: 40 },
        { paymentStatus: 'Paid', total: 25 },
    ]), 125);
});
