import test from 'node:test';
import assert from 'node:assert/strict';
import {
    bottleneckInsight,
    demandInsight,
    previousUtcDateKey,
    purchaseAnalyticsPayload,
    sessionReached,
    summariseFunnels,
    trafficDelta,
    utcDateKey,
    visitorToPaidRate,
} from '../src/lib/storefront-analytics.ts';

test('sessionReached treats later lastStep as having passed earlier steps', () => {
    assert.equal(sessionReached({ lastStep: 'review' }, 'start'), true);
    assert.equal(sessionReached({ lastStep: 'review' }, 'payment'), true);
    assert.equal(sessionReached({ lastStep: 'review' }, 'review'), true);
    assert.equal(sessionReached({ lastStep: 'review' }, 'complete'), false);
});

test('sessionReached prefers explicit step timestamps over lastStep', () => {
    assert.equal(sessionReached({ lastStep: 'start', steps: { complete: '2026-09-11T00:00:00.000Z' } }, 'complete'), true);
    assert.equal(sessionReached({ lastStep: 'account_prompt_shown', steps: { start: true } }, 'start'), true);
    assert.equal(sessionReached({ lastStep: 'account_prompt_shown' }, 'payment'), false);
});

test('summariseFunnels reports the largest real drop-off and hides thin samples', () => {
    const thin = summariseFunnels([
        { lastStep: 'start' },
        { lastStep: 'start' },
        { lastStep: 'payment' },
    ]);
    assert.equal(thin.counts.start, 3);
    assert.equal(thin.bottleneck, null);

    const docs = Array.from({ length: 10 }, (_, index) => (
        index < 2 ? { lastStep: 'complete' } : { lastStep: 'start' }
    ));
    const funnel = summariseFunnels(docs);
    assert.equal(funnel.counts.start, 10);
    assert.equal(funnel.counts.complete, 2);
    assert.ok(funnel.bottleneck);
    assert.equal(funnel.bottleneck?.from, 'Checkout started');
    assert.equal(funnel.bottleneck?.lost, 8);
    const insight = bottleneckInsight(funnel);
    assert.equal(insight?.headline, 'Drop-off after Checkout started');
    assert.match(insight?.detail || '', /8 of 10 checkout sessions \(80%\)/);
});

test('trafficDelta is honest when yesterday had no visits', () => {
    const delta = trafficDelta({ totalVisits: 12, uniqueVisitors: 7 }, { totalVisits: 0, uniqueVisitors: 0 });
    assert.equal(delta.todayVisits, 12);
    assert.equal(delta.visitDeltaPct, null);
    assert.equal(trafficDelta({ totalVisits: 15 }, { totalVisits: 10 }).visitDeltaPct, 50);
    assert.equal(trafficDelta({ totalVisits: 8 }, { totalVisits: 10 }).visitDeltaPct, -20);
});

test('demandInsight uses recorded search counts instead of invented percentages', () => {
    assert.equal(demandInsight(null), null);
    const insight = demandInsight({ term: 'super rio tomato', count: 41 });
    assert.equal(insight?.headline, 'Top search: super rio tomato');
    assert.match(insight?.detail || '', /41 recorded searches/);
    assert.doesNotMatch(insight?.detail || '', /40%/);
});

test('visitorToPaidRate is null without unique visitors', () => {
    assert.equal(visitorToPaidRate(3, 0), null);
    assert.equal(visitorToPaidRate(2, 10), 20);
});

test('utc date keys stay on the UTC calendar used by visit ingest', () => {
    assert.equal(utcDateKey(new Date('2026-09-11T23:30:00.000Z')), '2026-09-11');
    assert.equal(previousUtcDateKey(new Date('2026-09-11T00:10:00.000Z')), '2026-09-10');
});

test('purchaseAnalyticsPayload keeps a stable paid-order document shape', () => {
    const payload = purchaseAnalyticsPayload('order-1', {
        userId: 'farmer-9',
        total: 1500,
        amountPaid: 1500,
        items: [{ id: 'seed-1', quantity: 2 }, { id: 'bad/id' }, { id: 'seed-1' }],
    });
    assert.deepEqual(payload, {
        schemaVersion: 1,
        orderId: 'order-1',
        userId: 'farmer-9',
        amount: 1500,
        itemCount: 3,
        productIds: ['seed-1', 'seed-1'],
        source: 'payment-confirmation',
    });
});
