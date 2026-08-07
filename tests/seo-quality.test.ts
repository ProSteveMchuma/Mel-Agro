import assert from 'node:assert/strict';
import test from 'node:test';
import { assessProductSeo, catalogueSeoSummary } from '../src/lib/seo-quality.ts';
import { productIdFromRouteParam, productSeoSlug, resolveSeoValue, slugifySeoValue } from '../src/lib/seo.ts';
import type { Product } from '../src/types/index.ts';

const complete: Product = { id: 'p1', name: 'H614D Hybrid Maize Seed 2kg', price: 1200, category: 'Seeds', brand: 'Verified Seed Co', productCode: 'H614D-2KG', image: 'https://example.com/h614d.jpg', images: ['https://example.com/h614d.jpg'], rating: 0, reviews: 0, inStock: true, stockQuantity: 8, lowStockThreshold: 2, description: 'A clearly described hybrid maize seed pack with factual maturity, pack-size, storage, and manufacturer information for comparison.', features: ['Sealed 2kg pack', 'Manufacturer-labelled variety'] };

test('complete product earns a strong SEO grade', () => {
    const result = assessProductSeo(complete);
    assert.equal(result.grade, 'strong');
    assert.ok(result.score >= 85);
});

test('placeholder and thin catalogue records are prioritized', () => {
    const thin = { ...complete, id: 'p2', name: 'X', description: '', brand: '', productCode: '', image: 'https://placehold.co/no-image', features: [] };
    const summary = catalogueSeoSummary([complete, thin]);
    assert.equal(summary.products[0].productId, 'p2');
    assert.ok(summary.critical >= 1);
});

test('SEO paths are readable, collision-safe, and reversible', () => {
    assert.equal(slugifySeoValue('Tools & Equipments'), 'tools-and-equipments');
    assert.equal(resolveSeoValue('animal-health', ['Seeds', 'Animal Health']), 'Animal Health');
    const slug = productSeoSlug({ id: '03bdJwXSf6KPYT1zl3qR', name: 'Agral 90' });
    assert.equal(slug, 'agral-90--03bdJwXSf6KPYT1zl3qR');
    assert.equal(productIdFromRouteParam(slug), '03bdJwXSf6KPYT1zl3qR');
});
