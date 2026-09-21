import test from 'node:test';
import assert from 'node:assert/strict';
import { LOYALTY_EARN_KES_PER_POINT, pointsEarnedForOrderTotal, redeemableKes } from '../src/lib/loyalty.ts';
import { recordRecentlyViewed, recentlyViewedIds, RECENTLY_VIEWED_LIMIT } from '../src/lib/recently-viewed.ts';

test('loyalty earn is 1 point per KES 100', () => {
    assert.equal(LOYALTY_EARN_KES_PER_POINT, 100);
    assert.equal(pointsEarnedForOrderTotal(0), 0);
    assert.equal(pointsEarnedForOrderTotal(99), 0);
    assert.equal(pointsEarnedForOrderTotal(100), 1);
    assert.equal(pointsEarnedForOrderTotal(2599), 25);
});

test('redeemableKes caps at cart total and available points', () => {
    assert.equal(redeemableKes(500, 200), 200);
    assert.equal(redeemableKes(50, 200), 50);
    assert.equal(redeemableKes(-1, 200), 0);
});

test('recordRecentlyViewed keeps newest first and de-duplicates', () => {
    // jsdom-less: stub localStorage for node tests
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
    };
    (globalThis as any).window = globalThis;

    store.clear();
    recordRecentlyViewed('a', 1);
    recordRecentlyViewed('b', 2);
    recordRecentlyViewed('a', 3);
    assert.deepEqual(recentlyViewedIds(), ['a', 'b']);

    for (let i = 0; i < RECENTLY_VIEWED_LIMIT + 5; i += 1) {
        recordRecentlyViewed(`p${i}`, i + 10);
    }
    assert.equal(recentlyViewedIds().length, RECENTLY_VIEWED_LIMIT);
    assert.equal(recentlyViewedIds()[0], `p${RECENTLY_VIEWED_LIMIT + 4}`);
});
