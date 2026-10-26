import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    compareFulfillmentQueue,
    fulfillmentQueueFacts,
    hoursSincePackableLabel,
    promiseHours,
} from '../src/lib/fulfillment-age.ts';
import { PICKUP_STORE } from '../src/lib/pickup.ts';
import type { DeliveryZone } from '../src/lib/delivery.ts';

const HOUR = 60 * 60 * 1000;

const coast: DeliveryZone[] = [{
    name: 'Coast Region',
    price: 450,
    regions: ['Mombasa'],
    etaMinDays: 2,
    etaMaxDays: 3,
    etaText: '2–3 business days',
}];

test('a zone promise uses its upper bound', () => {
    assert.equal(promiseHours('1–2 business days'), 48);
    assert.equal(promiseHours('Same day or next day'), 48);
    assert.equal(promiseHours(PICKUP_STORE.etaText), 2);
    assert.equal(promiseHours('Ready for collection'), null);
    assert.equal(hoursSincePackableLabel(0), 'Under 1 hour since packable');
    assert.equal(hoursSincePackableLabel(1), '1 hour since packable');
    assert.equal(hoursSincePackableLabel(3), '3 hours since packable');
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
    assert.equal(latePickup.etaText, PICKUP_STORE.etaText);

    const waiting = fulfillmentQueueFacts({
        date: packedAt,
        processingAt: packedAt,
        shippingMethod: 'pickup',
        fulfillmentWait: { reason: 'Customer asked us to hold', by: 'packer@melagri.co.ke', at: packedAt },
    }, undefined, now);
    assert.equal(waiting.late, false);
    assert.equal(waiting.waiting?.reason, 'Customer asked us to hold');
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

    const coastOnTime = fulfillmentQueueFacts({
        date: packedAt,
        processingAt: packedAt,
        shippingMethod: 'standard',
        shippingAddress: { county: 'Mombasa' },
    }, coast, Date.parse(packedAt) + 50 * HOUR);
    assert.equal(coastOnTime.late, false);
    assert.equal(coastOnTime.etaText, '2–3 business days');

    const coastLate = fulfillmentQueueFacts({
        date: packedAt,
        processingAt: packedAt,
        shippingMethod: 'standard',
        shippingAddress: { county: 'Mombasa' },
    }, coast, Date.parse(packedAt) + 73 * HOUR);
    assert.equal(coastLate.late, true);
    assert.equal(coastLate.place, 'Mombasa');
});

test('the queue lists late orders before older waits', () => {
    const older = '2026-03-01T06:00:00.000Z';
    const newer = '2026-03-02T06:00:00.000Z';
    const rows = [
        { id: 'wait-old', queue: { late: false, packableAt: older } },
        { id: 'late-new', queue: { late: true, packableAt: newer } },
        { id: 'on-time', queue: { late: false, packableAt: newer } },
        { id: 'late-old', queue: { late: true, packableAt: older } },
    ].sort(compareFulfillmentQueue);
    assert.deepEqual(rows.map((row) => row.id), ['late-old', 'late-new', 'wait-old', 'on-time']);
});

test('the fulfillment screen can mark a wait and does not count it late', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/dashboard/admin/fulfillment/page.tsx'), 'utf8');
    const card = readFileSync(join(process.cwd(), 'src/components/admin/FulfillmentOrderCard.tsx'), 'utf8');
    const route = readFileSync(join(process.cwd(), 'src/app/api/admin/fulfillment/route.ts'), 'utf8');
    const screen = `${page}\n${card}`;
    assert.match(page, /Late/);
    assert.match(page, /Mark waiting/);
    assert.match(page, /Clear waiting/);
    assert.match(page, /A wait is not counted late/);
    assert.match(screen, /Record what went out/);
    assert.match(screen, /Confirm delivered/);
    assert.match(screen, /Confirm collected/);
    assert.match(screen, /Mark ready for collection/);
    assert.match(screen, /previewDispatch/);
    assert.match(route, /action: z\.literal\("wait"\)/);
    assert.match(route, /action: z\.literal\("clear-wait"\)/);
    assert.match(route, /compareFulfillmentQueue/);
    assert.match(route, /statusAfterRecordingDispatch/);
    assert.doesNotMatch(page, /shippingAddress\?\.details/);
    assert.doesNotMatch(card, /shippingAddress\?\.details/);
});
