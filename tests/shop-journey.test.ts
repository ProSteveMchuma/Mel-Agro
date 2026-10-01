import test from 'node:test';
import assert from 'node:assert/strict';
import {
    appendShopPath,
    checkoutSessionReplaces,
    checkoutStepLabel,
    latestCheckoutStep,
    entryPathForDay,
    profileAccountId,
    salesByLandingPage,
    shopPathTrail,
} from '../src/lib/shop-journey.ts';

test('entry path stays on the first shop page of the day', () => {
    assert.equal(entryPathForDay({
        today: '2026-10-01',
        storedDay: '2026-09-30',
        storedPath: '/products/old',
        path: '/categories/seeds',
    }), '/categories/seeds');
    assert.equal(entryPathForDay({
        today: '2026-10-01',
        storedDay: '2026-10-01',
        storedPath: '/',
        path: '/products/maize',
    }), '/');
    assert.equal(entryPathForDay({
        today: '2026-10-01',
        storedDay: '2026-10-01',
        storedPath: '/dashboard/admin',
        path: '/cart',
    }), '/cart');
});

test('sales by landing page count paid orders only and keep a path', () => {
    const rows = salesByLandingPage([
        { paymentStatus: 'Paid', total: 1000, entryPath: '/' },
        { paymentStatus: 'Paid', total: 500, entryPath: '/?q=secret' },
        { paymentStatus: 'Unpaid', total: 9000, entryPath: '/products/a' },
        { paymentStatus: 'Paid', total: 250, entryPath: '' },
        { paymentStatus: 'Paid', total: 250, entryPath: '/products/a' },
    ]);
    assert.deepEqual(rows.map(row => row.path), ['/', '/products/a', 'Not recorded']);
    assert.equal(rows[0].orders, 2);
    assert.equal(rows[0].revenue, 1500);
    assert.equal(rows.find(row => row.path === 'Not recorded')?.orders, 1);
});

test('shop path trail drops staff pages, query strings, and repeats', () => {
    let trail = appendShopPath([], '/?utm=1');
    trail = appendShopPath(trail, '/');
    trail = appendShopPath(trail, '/dashboard/admin');
    trail = appendShopPath(trail, '/products/seed?pack=50kg');
    trail = appendShopPath(trail, '/checkout');
    assert.deepEqual(trail, ['/', '/products/seed', '/checkout']);
    assert.deepEqual(shopPathTrail(['/cart?coupon=SECRET', 'not a path', '/cart']), ['/cart']);
});

test('a new checkout start replaces the previous session', () => {
    assert.equal(checkoutSessionReplaces('start'), true);
    assert.equal(checkoutSessionReplaces('payment'), false);
    assert.equal(checkoutStepLabel('payment'), 'Payment');
    assert.equal(checkoutStepLabel('account_prompt_shown'), null);
    assert.equal(checkoutStepLabel(''), null);
    assert.equal(latestCheckoutStep({ lastStep: 'account_prompt_shown', steps: { start: true, payment: true } }), 'payment');
    assert.equal(latestCheckoutStep({ lastStep: 'start', steps: { start: true } }), 'start');
    assert.equal(latestCheckoutStep(null), null);
});

test('customer profile links use the document id when uid was never stored', () => {
    assert.equal(profileAccountId({ id: 'farmer-1' }), 'farmer-1');
    assert.equal(profileAccountId({ id: '', uid: 'farmer-2' }), 'farmer-2');
    assert.equal(profileAccountId({ uid: 'undefined' }), '');
    assert.equal(profileAccountId({ id: 'phone:712345678' }), '');
    assert.equal(profileAccountId({}), '');
});
