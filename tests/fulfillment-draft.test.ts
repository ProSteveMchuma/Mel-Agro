import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchLineLabel, lineBalances } from '../src/lib/order-admin.ts';
import {
    fulfillmentCue,
    fulfillmentSteps,
    orderAfterFulfillmentWrite,
    orderWithDraft,
    queueAfterSave,
    statsAfterStatusChange,
} from '../src/lib/fulfillment-draft.ts';

const courier = {
    id: 'ord-courier',
    status: 'Processing',
    shippingMethod: 'standard',
    shippingAddress: { county: 'Nairobi' },
    items: [{ id: 'dap', name: 'DAP 50kg', quantity: 4 }],
    deliveries: [] as Array<{ method?: 'courier' | 'pickup' | 'shortfall'; shortfall?: boolean; lines?: Array<{ productId: string; quantity: number; name?: string }> }>,
};

const blank = { quantities: {}, carrier: '', trackingNumber: '' };

test('a partial quantity previews on the way, with the line split, before save', () => {
    const next = orderWithDraft(courier, { ...blank, quantities: { 'dap::': '1' }, carrier: 'G4S', trackingNumber: 'KX1' });
    const cue = fulfillmentCue(next);
    const row = lineBalances(next).find((line) => line.productId === 'dap');
    assert.equal(next.status, 'Shipped');
    assert.equal(cue.label, 'Dispatched · courier on the way');
    assert.equal(cue.onTheWay, true);
    assert.equal(cue.delivered, false);
    assert.equal(cue.partSent, true);
    assert.equal(cue.stillToSend, 3);
    assert.equal(dispatchLineLabel(row!, false), '1 dispatched · 3 still to send');
    assert.equal(next.tracking?.carrier, 'G4S');
    assert.equal(next.tracking?.trackingNumber, 'KX1');
    const steps = fulfillmentSteps(next);
    assert.equal(steps.find((step) => step.step === 'Shipped')?.state, 'current');
    assert.equal(steps.find((step) => step.step === 'Shipped')?.label, 'On the way');
    assert.equal(steps.find((step) => step.step === 'Delivered')?.state, 'open');
});

test('a full send stays on the way and does not preview Delivered', () => {
    const next = orderWithDraft(courier, { ...blank, quantities: { 'dap::': '4' }, carrier: 'Fargo', trackingNumber: 'FULL' });
    const cue = fulfillmentCue(next);
    assert.equal(next.status, 'Shipped');
    assert.notEqual(next.status, 'Delivered');
    assert.equal(cue.onTheWay, true);
    assert.equal(cue.delivered, false);
    assert.equal(cue.onTheWay && cue.delivered, false);
    assert.equal(cue.partSent, false);
    assert.equal(cue.stillToSend, 0);
    assert.equal(dispatchLineLabel(lineBalances(next)[0], false), '4 dispatched');
    assert.equal(fulfillmentSteps(next).find((step) => step.step === 'Delivered')?.state, 'open');
});

test('carrier or tracking updates the dispatch line before save and does not mark Delivered', () => {
    const byCarrier = orderWithDraft(courier, { ...blank, carrier: 'G4S' });
    assert.equal(byCarrier.status, 'Shipped');
    assert.equal(byCarrier.tracking?.carrier, 'G4S');
    assert.equal(fulfillmentCue(byCarrier).onTheWay, true);
    assert.equal(fulfillmentCue(byCarrier).delivered, false);
    assert.equal(byCarrier.deliveries?.length || 0, 0);

    const shipped = { ...courier, status: 'Shipped', tracking: { carrier: 'G4S', trackingNumber: 'A' } };
    const byTracking = orderWithDraft(shipped, { quantities: {}, carrier: 'G4S', trackingNumber: 'B' });
    assert.equal(byTracking.status, 'Shipped');
    assert.equal(byTracking.tracking?.trackingNumber, 'B');
    assert.equal(fulfillmentCue(byTracking).delivered, false);
    assert.equal(orderWithDraft(shipped, { quantities: {}, carrier: 'G4S', trackingNumber: 'A' }), shipped);
});

test('confirming delivery clears on the way and leaves the queue', () => {
    const shipped = orderWithDraft(courier, { ...blank, quantities: { 'dap::': '4' }, carrier: 'G4S', trackingNumber: 'FULL' });
    const delivered = orderAfterFulfillmentWrite(shipped, { type: 'status', status: 'Delivered' });
    const cue = fulfillmentCue(delivered);
    assert.equal(delivered.status, 'Delivered');
    assert.equal(cue.delivered, true);
    assert.equal(cue.onTheWay, false);
    assert.equal(cue.label, 'Delivered');
    assert.equal(fulfillmentSteps(delivered).find((step) => step.step === 'Shipped')?.label, 'Dispatched');
    assert.notEqual(fulfillmentSteps(delivered).find((step) => step.step === 'Shipped')?.label, 'On the way');
    const other = { ...courier, id: 'other' };
    const queue = queueAfterSave(
        [{ ...shipped, id: 'ord-courier' }, other],
        { ...delivered, id: 'ord-courier' },
        { status: 'all', method: 'all' },
    );
    assert.deepEqual(queue.map((order) => order.id), ['other']);
    assert.equal(queue.some((order) => fulfillmentCue(order).onTheWay && fulfillmentCue(order).delivered), false);
});

test('saving a dispatch updates the queue in place', () => {
    const other = { ...courier, id: 'other', items: [{ id: 'seed', name: 'Seed', quantity: 1 }] };
    const next = orderAfterFulfillmentWrite(courier, {
        type: 'partial',
        quantities: { 'dap::': '1' },
        carrier: 'G4S',
        trackingNumber: 'KX1',
    });
    const queue = queueAfterSave([courier, other], { ...next, id: courier.id }, { status: 'all', method: 'all' });
    assert.deepEqual(queue.map((order) => order.id), ['ord-courier', 'other']);
    assert.equal(queue[0].status, 'Shipped');
    assert.equal(fulfillmentCue(queue[0]).onTheWay, true);
    assert.equal(fulfillmentCue(queue[0]).delivered, false);
    const hidden = queueAfterSave([courier], { ...next, id: courier.id }, { status: 'Processing', method: 'all' });
    assert.equal(hidden.length, 0);
    assert.deepEqual(
        statsAfterStatusChange({ processing: 4, shipped: 2, readyPickup: 1, stockAlerts: 3, late: 2 }, 'Processing', 'Shipped', false),
        { processing: 3, shipped: 3, readyPickup: 1, stockAlerts: 3, late: 2 },
    );
    assert.deepEqual(
        statsAfterStatusChange({ processing: 3, shipped: 3, readyPickup: 1, stockAlerts: 3, late: 2 }, 'Shipped', 'Delivered', true),
        { processing: 3, shipped: 2, readyPickup: 1, stockAlerts: 3, late: 1 },
    );
});

test('pickup recording stays ready for collection', () => {
    const pickup = { ...courier, id: 'pick', shippingMethod: 'pickup' };
    const partial = orderWithDraft(pickup, { ...blank, quantities: { 'dap::': '1' } });
    assert.equal(partial.status, 'Ready for Collection');
    assert.equal(fulfillmentCue(partial).ready, true);
    assert.equal(fulfillmentCue(partial).collected, false);
    assert.equal(fulfillmentCue(partial).partSent, true);
    const full = orderWithDraft(pickup, { ...blank, quantities: { 'dap::': '4' } });
    assert.equal(full.status, 'Ready for Collection');
    assert.notEqual(full.status, 'Collected');
    assert.equal(fulfillmentCue(full).collected, false);
    const closed = orderAfterFulfillmentWrite(partial, { type: 'shortfall' });
    assert.equal(closed.status, 'Ready for Collection');
    assert.notEqual(closed.status, 'Collected');
    assert.equal(fulfillmentCue(closed).stillToSend, 0);
});
