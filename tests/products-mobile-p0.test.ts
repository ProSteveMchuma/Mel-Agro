import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

test('products page no longer redirects lone category/brand filters away from catalogue', () => {
    const source = readFileSync(join(root, 'src/app/products/page.tsx'), 'utf8');
    assert.equal(source.includes('permanentRedirect'), false);
    assert.match(source, /Keep category\/brand\/search on \/products/);
});

test('globals define mobile nav clearance utilities', () => {
    const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
    assert.match(css, /\.pb-mobile-nav\s*\{/);
    assert.match(css, /\.pb-safe\s*\{/);
    assert.match(css, /safe-area-inset-bottom/);
});

test('products client does not pin breadcrumb under header with magic sticky offsets', () => {
    const source = readFileSync(join(root, 'src/app/products/ProductsClient.tsx'), 'utf8');
    assert.equal(source.includes('top-[124px]'), false);
    assert.equal(source.includes('sticky top-['), false);
});

test('MobileNav in-flow spacer replaces per-page pb-mobile-nav on catalogue', () => {
    const nav = readFileSync(join(root, 'src/components/MobileNav.tsx'), 'utf8');
    const products = readFileSync(join(root, 'src/app/products/ProductsClient.tsx'), 'utf8');
    assert.match(nav, /h-\[calc\(5\.75rem\+env\(safe-area-inset-bottom/);
    assert.equal(products.includes('pb-mobile-nav'), false);
});
