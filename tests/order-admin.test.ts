import test from 'node:test';
import assert from 'node:assert/strict';
import { CommunicationTemplates } from '../src/lib/communication-templates.ts';
import {
    lineBalances,
    nairobiPlacedLabel,
    orderTimeline,
    outstandingQuantity,
    partSent,
    partialBlocksCompletion,
    partialSmsSummary,
} from '../src/lib/order-admin.ts';

test('placed time is shown in Nairobi, not a second stored field', () => {
    assert.equal(nairobiPlacedLabel('2026-10-01T09:46:00.000Z'), '1 Oct 2026, 12:46');
    assert.equal(nairobiPlacedLabel(''), '—');
});

test('timeline uses the timestamps already on the order', () => {
    const rows = orderTimeline({
        date: '2026-10-01T09:46:00.000Z',
        paidAt: '2026-10-01T09:50:00.000Z',
        processingAt: '2026-10-01T09:50:00.000Z',
        shippedAt: '2026-10-01T11:00:00.000Z',
        statusHistory: [
            { status: 'Pending Payment', at: '2026-10-01T09:46:00.000Z', by: 'checkout' },
            { status: 'Shipped', at: '2026-10-01T11:00:00.000Z', by: 'ops@melagri.com' },
        ],
    });
    assert.deepEqual(rows.map((row) => row.label), ['Placed', 'Paid', 'Packing', 'Out for delivery']);
    assert.equal(rows[0].by, 'checkout');
    assert.equal(rows[3].by, 'ops@melagri.com');
});

test('partial lines cannot exceed what is still outstanding', () => {
    const order = {
        items: [
            { id: 'dap', name: 'DAP 50kg', quantity: 4, selectedVariant: { id: '50kg' } },
            { id: 'seed', name: 'Seed', quantity: 2 },
        ],
        deliveries: [
            { method: 'courier' as const, lines: [{ productId: 'dap', variantId: '50kg', quantity: 1 }] },
        ],
    };
    const dap = lineBalances(order).find((row) => row.productId === 'dap');
    assert.equal(dap?.remaining, 3);
    assert.equal(outstandingQuantity(order), 5);
    assert.equal(partialBlocksCompletion(order), true);
    assert.equal(partSent({ ...order, status: 'Processing' }), true);
    assert.equal(partialBlocksCompletion({ items: order.items, deliveries: [] }), false);
});

test('a shortfall reduces what is still outstanding', () => {
    const order = {
        items: [{ id: 'dap', name: 'DAP 50kg', quantity: 4 }],
        deliveries: [
            { method: 'courier' as const, lines: [{ productId: 'dap', quantity: 2 }] },
            { method: 'shortfall' as const, shortfall: true, lines: [{ productId: 'dap', quantity: 2 }] },
        ],
    };
    assert.equal(outstandingQuantity(order), 0);
    assert.equal(partialBlocksCompletion(order), false);
});

test('partial SMS does not say the order is delivered', () => {
    const summary = partialSmsSummary([{ name: 'DAP 50kg', quantity: 2 }]);
    assert.equal(summary, '2 of DAP 50kg');
    const sms = CommunicationTemplates.getPartialDispatch(
        { id: 'abcde12345', userName: 'Amina', total: 1000 } as any,
        summary,
    ).smsBody;
    assert.match(sms, /we sent 2 of DAP 50kg/);
    assert.match(sms, /still being packed/);
    assert.doesNotMatch(sms, /delivered/i);
});
