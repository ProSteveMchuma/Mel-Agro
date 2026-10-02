import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ordersByDayOfWeek, ordersByHourOfDay } from '../src/lib/analytics-aggregations.ts';
import { nairobiClock, sumVisitClock } from '../src/lib/nairobi-clock.ts';
import { nairobiPlacedLabel } from '../src/lib/order-admin.ts';
import type { Order } from '../src/types/index.ts';

function order(date: string, paymentStatus: Order['paymentStatus'] = 'Paid', total = 100): Order {
    return {
        id: 'order-1',
        userId: 'user-1',
        date,
        total,
        shippingCost: 0,
        paymentMethod: 'M-Pesa',
        shippingAddress: { county: 'Machakos', details: 'Shop' },
        paymentStatus,
        status: 'Processing',
        items: [],
    };
}

test('paid-order hour and weekday use Africa/Nairobi, matching the placed-time label', () => {
    const afterMidnight = '2026-10-01T21:30:00.000Z';
    const beforeMidnight = '2026-10-01T20:59:00.000Z';
    assert.equal(nairobiPlacedLabel(afterMidnight), '2 Oct 2026, 00:30');
    assert.equal(nairobiClock(afterMidnight)?.hour, 0);
    assert.equal(nairobiClock(afterMidnight)?.weekday, 'Fri');
    assert.equal(nairobiClock(beforeMidnight)?.hour, 23);
    assert.equal(nairobiClock(beforeMidnight)?.weekday, 'Thu');

    const days = ordersByDayOfWeek([
        order(afterMidnight, 'Paid', 250),
        order(beforeMidnight, 'Paid', 40),
        order(afterMidnight, 'Unpaid', 999),
        order('not-a-date', 'Paid', 80),
    ]);
    const hours = ordersByHourOfDay([
        order(afterMidnight, 'Paid', 250),
        order(beforeMidnight, 'Paid', 40),
        order(afterMidnight, 'Unpaid', 999),
    ]);
    assert.equal(days.find((bucket) => bucket.label === 'Fri')?.orders, 1);
    assert.equal(days.find((bucket) => bucket.label === 'Fri')?.revenue, 250);
    assert.equal(days.find((bucket) => bucket.label === 'Thu')?.orders, 1);
    assert.equal(hours.find((bucket) => bucket.label === '00:00')?.orders, 1);
    assert.equal(hours.find((bucket) => bucket.label === '00:00')?.revenue, 250);
    assert.equal(hours.find((bucket) => bucket.label === '23:00')?.orders, 1);
    assert.equal(hours.find((bucket) => bucket.label === '21:00')?.orders, 0);
    assert.equal(hours.reduce((sum, bucket) => sum + bucket.orders, 0), 2);
});

test('visit hour totals are only the counters stored at record time', () => {
    const thursdayWithADailyTotal = { date: '2026-10-01', weekday: 'Thu', hours: { '23': 1 }, visits: 40, totalVisits: 100 };
    const wednesdayDailyOnly = { date: '2026-09-30', weekday: 'Wed', visits: 80, totalVisits: 80 };
    const counted = sumVisitClock([
        { date: '2026-10-02', weekday: 'Fri', hours: { '00': 2, '14': 5 } },
        thursdayWithADailyTotal,
        wednesdayDailyOnly,
    ], '2026-10-01');
    assert.equal(counted.hours.find((bucket) => bucket.label === '00:00')?.visits, 2);
    assert.equal(counted.hours.find((bucket) => bucket.label === '14:00')?.visits, 5);
    assert.equal(counted.hours.find((bucket) => bucket.label === '23:00')?.visits, 1);
    assert.equal(counted.hours.reduce((sum, bucket) => sum + bucket.visits, 0), 8);
    assert.equal(counted.weekdays.find((bucket) => bucket.label === 'Fri')?.visits, 7);
    assert.equal(counted.weekdays.find((bucket) => bucket.label === 'Thu')?.visits, 1);
    assert.equal(counted.weekdays.find((bucket) => bucket.label === 'Wed')?.visits, 0);
});

test('revenue analytics says Africa/Nairobi and records visit hour counters', () => {
    const root = process.cwd();
    const page = readFileSync(join(root, 'src/app/dashboard/admin/analytics/page.tsx'), 'utf8');
    const route = readFileSync(join(root, 'src/app/api/analytics/route.ts'), 'utf8');
    const aggregations = readFileSync(join(root, 'src/lib/analytics-aggregations.ts'), 'utf8');
    assert.match(page, /When customers buy · Africa\/Nairobi/);
    assert.match(page, /Peak ordering hours · Africa\/Nairobi/);
    assert.equal(page.includes('local time'), false);
    assert.match(page, /Visits by hour/);
    assert.match(page, /Older daily totals are not split into hours/);
    assert.match(route, /analytics_visit_clock/);
    assert.match(route, /hours\.\$\{clock\.hourKey\}/);
    assert.equal(aggregations.includes('.getHours('), false);
    assert.equal(aggregations.includes('.getDay('), false);
});
