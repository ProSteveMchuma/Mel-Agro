import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestCatalogue } from '../src/lib/catalogue-search.ts';
import { needsCustomerOrders, needsLiveProductStream, needsNotificationStream } from '../src/lib/shop-listeners.ts';
import type { Product } from '../src/types/index.ts';

const maize = {
    id: 'p1',
    name: 'Hybrid Maize 10kg',
    price: 4500,
    category: 'Seeds',
    brand: 'SeedCo',
    image: 'https://example.com/maize.jpg',
    inStock: true,
    stockQuantity: 12,
    description: 'A very long description that should not be sent to the search box.',
} as Product;

test('search suggestions stay short and match the name', () => {
    const result = suggestCatalogue([maize], 'maize', 5);
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].name, 'Hybrid Maize 10kg');
    assert.equal('description' in result.suggestions[0], false);
    assert.deepEqual(result.intents, ['Seeds']);
});

test('the public shop does not stream the catalogue, orders, or alerts', () => {
    assert.equal(needsLiveProductStream('/'), false);
    assert.equal(needsLiveProductStream('/products'), false);
    assert.equal(needsLiveProductStream('/checkout'), false);
    assert.equal(needsLiveProductStream('/dashboard/admin'), true);
    assert.equal(needsLiveProductStream('/dashboard/admin/products/edit/abc'), true);
    assert.equal(needsCustomerOrders('/'), false);
    assert.equal(needsCustomerOrders('/dashboard/user'), true);
    assert.equal(needsCustomerOrders('/checkout/success'), true);
    assert.equal(needsNotificationStream('/'), false);
    assert.equal(needsNotificationStream('/dashboard/admin/orders'), true);
});
