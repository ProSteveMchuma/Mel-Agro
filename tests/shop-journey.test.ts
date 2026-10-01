import test from 'node:test';
import assert from 'node:assert/strict';
import {
    appendShopPath,
    checkoutSessionReplaces,
    checkoutStepLabel,
    latestCheckoutStep,
    entryPathForDay,
    landingPageForOrder,
    pagesLosingBeforeSale,
    productsLosingBeforeSale,
    profileAccountId,
    salePathForDay,
    salesByLandingPage,
    shopPathTrail,
    todayShopReadout,
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

test('sale path keeps the last listing page of the day', () => {
    assert.equal(salePathForDay({
        today: '2026-10-01',
        storedDay: '2026-09-30',
        storedPath: '/products/old--1',
        path: '/',
    }), null);
    assert.equal(salePathForDay({
        today: '2026-10-01',
        storedDay: '2026-10-01',
        storedPath: '/categories/seeds',
        path: '/cart',
    }), '/categories/seeds');
    assert.equal(salePathForDay({
        today: '2026-10-01',
        storedDay: '2026-10-01',
        storedPath: '/categories/seeds',
        path: '/products/maize--abc?pack=50kg',
    }), '/products/maize--abc');
});

test('a partial landing uses the listing page, then the single product on the order', () => {
    assert.deepEqual(landingPageForOrder({
        entryPath: '/',
        salePath: '/products/maize--abc',
    }), { path: '/products/maize--abc', kind: 'listing page' });
    assert.deepEqual(landingPageForOrder({
        entryPath: '/products/seed--1',
        salePath: '/categories/seeds',
    }), { path: '/products/seed--1', kind: 'opened first' });
    assert.equal(landingPageForOrder({
        items: [{ id: 'abc', name: 'Maize Seed' }],
    }).kind, 'product on the order');
    assert.equal(landingPageForOrder({
        items: [{ id: 'abc', name: 'Maize Seed' }],
    }).path, '/products/maize-seed--abc');
    assert.deepEqual(landingPageForOrder({
        items: [{ id: 'abc', name: 'Maize Seed' }, { id: 'def', name: 'DAP' }],
    }), { path: 'Not recorded', kind: 'not recorded' });
    assert.deepEqual(landingPageForOrder({ entryPath: '/' }), { path: '/', kind: 'opened first' });
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
    const filled = salesByLandingPage([
        { paymentStatus: 'Paid', total: 800, items: [{ id: 'abc', name: 'Maize Seed' }] },
        { paymentStatus: 'Paid', total: 100, entryPath: '/', salePath: '/brands/osho' },
    ]);
    assert.equal(filled.find(row => row.path === '/products/maize-seed--abc')?.fromOrderProduct, 1);
    assert.equal(filled.find(row => row.path === '/brands/osho')?.recorded, 1);
});

test('pages and products that lose people are ranked ahead of pass-through steps', () => {
    const pages = pagesLosingBeforeSale([
        { key: '/', views: 40 },
        { key: '/cart', views: 30 },
        { key: '/products/quiet--1', views: 12 },
        { key: '/categories/seeds', views: 9 },
        { key: '/guides/planting', views: 2 },
    ], [
        { path: '/categories/seeds', orders: 2 },
    ], { minViews: 5 });
    assert.deepEqual(pages.map(page => page.path), ['/products/quiet--1']);

    const homeOnly = pagesLosingBeforeSale([{ key: '/', views: 20 }], [], { minViews: 5 });
    assert.equal(homeOnly[0]?.path, '/');

    const products = productsLosingBeforeSale([
        { productId: 'quiet', name: 'Quiet Seed', views: 8, addToCartCount: 0, purchases: 0, inStock: true, stockQuantity: 4 },
        { productId: 'shelf', name: 'Empty Shelf', views: 6, addToCartCount: 2, purchases: 1, inStock: false, stockQuantity: 0 },
        { productId: 'carted', name: 'Left in Cart', views: 10, addToCartCount: 4, purchases: 0, inStock: true, stockQuantity: 3 },
        { productId: 'fine', name: 'Selling', views: 20, addToCartCount: 5, purchases: 2, inStock: true, stockQuantity: 9 },
    ]);
    assert.equal(products[0]?.name, 'Empty Shelf');
    assert.equal(products[0]?.reason, 'out of stock');
    assert.equal(products.find(product => product.name === 'Left in Cart')?.reason, 'added, not bought');
    assert.equal(products.find(product => product.name === 'Quiet Seed')?.reason, 'looked, not added');
    assert.equal(products.some(product => product.name === 'Selling'), false);
});

test('today readout picks one next action', () => {
    const text = todayShopReadout({
        visits: 12,
        paidOrders: 1,
        checkoutStarted: 6,
        checkoutCompleted: 2,
        textableCarts: 2,
        pages: [{ key: '/products/quiet--1', views: 8 }],
        products: [{ productId: 'shelf', name: 'Empty Shelf', views: 6, addToCartCount: 1, purchases: 0, inStock: false, stockQuantity: 0 }],
    });
    assert.equal(text.checkoutLeft, 4);
    assert.equal(text.action, 'text the cart');
    assert.equal(text.href, '/dashboard/admin/intelligence/abandoned-carts');

    const restock = todayShopReadout({
        visits: 4,
        paidOrders: 0,
        textableCarts: 0,
        products: [{ productId: 'shelf', name: 'Empty Shelf', views: 6, addToCartCount: 1, purchases: 0, inStock: false, stockQuantity: 0 }],
    });
    assert.equal(restock.action, 'restock');
    assert.equal(restock.href, '/dashboard/admin/products/edit/shelf');

    const fix = todayShopReadout({
        visits: 9,
        paidOrders: 0,
        textableCarts: 0,
        pages: [{ key: '/products/quiet--1', views: 8 }],
        landingSales: [],
        products: [],
    });
    assert.equal(fix.action, 'fix the page');
    assert.equal(fix.pageLoss?.path, '/products/quiet--1');

    const quiet = todayShopReadout({ visits: 2, paidOrders: 1, checkoutStarted: 1, checkoutCompleted: 1, textableCarts: 0 });
    assert.equal(quiet.action, null);

    const checkout = todayShopReadout({ visits: 10, paidOrders: 0, checkoutStarted: 8, checkoutCompleted: 2, textableCarts: 0 });
    assert.equal(checkout.action, 'fix the page');
    assert.equal(checkout.href, '/dashboard/admin/analytics#shop-checkout');
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
