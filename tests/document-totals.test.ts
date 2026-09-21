import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOrderDocumentTotals } from '../src/lib/document-totals.ts';

test('document totals mirror checkout math (subtotal + shipping - discount)', () => {
    const totals = computeOrderDocumentTotals({
        items: [
            { price: 1000, quantity: 2 },
            { price: 500, quantity: 1 },
        ],
        shippingCost: 200,
        discountAmount: 100,
        total: 2600,
    }, { enabled: false, taxRate: 16 });

    assert.equal(totals.itemsSubtotal, 2500);
    assert.equal(totals.discount, 100);
    assert.equal(totals.shipping, 200);
    assert.equal(totals.total, 2600);
    assert.equal(totals.taxAmount, 0);
    assert.equal(totals.taxNote, null);
});

test('prefers stored subtotal over recomputing items', () => {
    const totals = computeOrderDocumentTotals({
        subtotal: 3000,
        items: [{ price: 1, quantity: 1 }],
        shippingCost: 0,
        discountAmount: 0,
        total: 3000,
    });
    assert.equal(totals.itemsSubtotal, 3000);
});

test('enabled tax shows inclusive VAT estimate without changing total', () => {
    const totals = computeOrderDocumentTotals({
        subtotal: 1160,
        shippingCost: 0,
        discountAmount: 0,
        total: 1160,
    }, { enabled: true, taxRate: 16 });

    assert.equal(totals.total, 1160);
    assert.equal(totals.taxAmount, 160);
    assert.match(totals.taxLabel, /VAT/);
    assert.ok(totals.taxNote);
});
