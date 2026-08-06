import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRateLimit, getClientAddress, resetRateLimitsForTests } from '../src/lib/rate-limit.ts';

test.beforeEach(() => resetRateLimitsForTests());

test('blocks requests beyond the configured limit', () => {
    const options = { limit: 2, windowMs: 60_000, now: 1_000 };
    assert.equal(checkRateLimit('checkout:127.0.0.1', options).allowed, true);
    assert.equal(checkRateLimit('checkout:127.0.0.1', options).allowed, true);
    const blocked = checkRateLimit('checkout:127.0.0.1', options);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.retryAfterSeconds, 60);
});

test('resets a bucket after its window expires', () => {
    checkRateLimit('session:127.0.0.1', { limit: 1, windowMs: 1_000, now: 1_000 });
    assert.equal(checkRateLimit('session:127.0.0.1', { limit: 1, windowMs: 1_000, now: 1_500 }).allowed, false);
    assert.equal(checkRateLimit('session:127.0.0.1', { limit: 1, windowMs: 1_000, now: 2_000 }).allowed, true);
});

test('uses the first trusted proxy address', () => {
    const request = new Request('https://www.melagri.com', {
        headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    assert.equal(getClientAddress(request), '203.0.113.5');
});
