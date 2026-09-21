import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildThermalReceiptLines,
    estimateThermalHeightMm,
    thermalMaxChars,
} from '../src/lib/thermal-receipt.ts';

const order = {
    id: 'abcde12345xyz',
    date: '2026-09-21T10:00:00.000Z',
    total: 3500,
    shippingCost: 250,
    paymentMethod: 'M-Pesa',
    paymentStatus: 'Paid' as const,
    mpesaReceiptNumber: 'TJK7H8K9L0',
    items: [
        { id: '1', name: 'Hybrid Maize Seed 2kg Pack', price: 1625, quantity: 2 },
        { id: '2', name: 'NPK Fertilizer', price: 0, quantity: 1 },
    ],
};

test('thermal char budget is tighter on 58mm than 80mm', () => {
    assert.equal(thermalMaxChars(80), 40);
    assert.equal(thermalMaxChars(58), 28);
    assert.ok(thermalMaxChars(58) < thermalMaxChars(80));
});

test('buildThermalReceiptLines includes brand, items, total, and M-Pesa code', () => {
    const lines = buildThermalReceiptLines(order, {
        companyName: 'Mel-Agri Kenya',
        supportPhone: '0788 970757',
    }, 80);
    const text = lines.map((line) => {
        if (line.type === 'center') return line.text;
        if (line.type === 'row') return `${line.left} ${line.right}`;
        return line.type;
    }).join('\n');

    assert.match(text, /MEL-AGRI KENYA/);
    assert.match(text, /#ABCDE123/);
    assert.match(text, /2 x Hybrid Maize/);
    assert.match(text, /TOTAL/);
    assert.match(text, /KES 3,?500/);
    assert.match(text, /TJK7H8K9L0/);
    assert.match(text, /0788 970757/);
});

test('long product names wrap on narrow 58mm rolls', () => {
    const lines = buildThermalReceiptLines({
        ...order,
        items: [{
            id: '1',
            name: 'Very Long Premium Hybrid Maize Seed Variety Pack For Upland Farms',
            price: 1000,
            quantity: 1,
        }],
    }, {}, 58);
    const rows = lines.filter((line) => line.type === 'row');
    assert.ok(rows.length >= 3);
});

test('estimated PDF height grows with line count', () => {
    const short = estimateThermalHeightMm(10, 80);
    const tall = estimateThermalHeightMm(40, 80);
    assert.ok(tall > short);
    assert.ok(short >= 100);
});
