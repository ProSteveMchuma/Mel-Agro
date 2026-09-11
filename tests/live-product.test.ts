import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLiveCatalogueProduct } from '../src/lib/live-product.ts';

test('keeps seeded catalogue data until a live product with the same id arrives', () => {
    const seed = { id: 'seed-1', name: 'Hybrid Maize', stockQuantity: 0, inStock: false, price: 500 };
    assert.deepEqual(applyLiveCatalogueProduct(seed, null), seed);
    assert.equal(applyLiveCatalogueProduct(seed, { id: 'other', stockQuantity: 12, inStock: true } as any).stockQuantity, 0);
});

test('overlays live stock onto a cached catalogue card', () => {
    const seed = { id: 'seed-1', name: 'Hybrid Maize', stockQuantity: 0, inStock: false, price: 500 };
    const live = { id: 'seed-1', name: 'Hybrid Maize', stockQuantity: 40, inStock: true, price: 500, category: 'Seeds' } as any;
    const next = applyLiveCatalogueProduct(seed, live);
    assert.equal(next.stockQuantity, 40);
    assert.equal(next.inStock, true);
    assert.equal(next.id, 'seed-1');
});
