import test from 'node:test';
import assert from 'node:assert/strict';
import { rankProductsForUser, RECOMMENDATION_MODEL_VERSION } from '../src/lib/personalization.ts';
import type { Product } from '../src/types/index.ts';

const product = (id: string, category: string, rating = 4, stockQuantity = 10): Product => ({
    id, name: id, category, rating, reviews: 10, price: 100, image: '', inStock: stockQuantity > 0,
    stockQuantity, lowStockThreshold: 2,
});

test('affinity ranking prioritizes an available preferred category', () => {
    const ranked = rankProductsForUser([product('seed', 'Seeds', 4), product('tool', 'Tools', 5)], { Seeds: 20, Tools: 1 });
    assert.equal(ranked[0].product.id, 'seed');
    assert.match(ranked[0].reason, /interest in Seeds/);
});

test('personalization never recommends unavailable products', () => {
    const ranked = rankProductsForUser([product('sold-out', 'Seeds', 5, 0), product('available', 'Tools', 3)], { Seeds: 100 });
    assert.deepEqual(ranked.map(item => item.product.id), ['available']);
});

test('disabled personalization falls back to quality signals', () => {
    const ranked = rankProductsForUser([product('preferred', 'Seeds', 3), product('rated', 'Tools', 5)], { Seeds: 100 }, false);
    assert.equal(ranked[0].product.id, 'rated');
    assert.equal(RECOMMENDATION_MODEL_VERSION, 'affinity-v1');
});
