import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  matchesBrandFilter,
  matchesPriceFilter,
  parsePriceBound,
} from '../src/lib/admin-catalogue-filters.ts';

const root = process.cwd();

test('parsePriceBound accepts non-negative numbers and rejects junk', () => {
  assert.equal(parsePriceBound('0'), 0);
  assert.equal(parsePriceBound('1500.5'), 1500.5);
  assert.equal(parsePriceBound(''), null);
  assert.equal(parsePriceBound('-10'), null);
  assert.equal(parsePriceBound('abc'), null);
});

test('matchesBrandFilter uses brandKey and display name', () => {
  assert.equal(matchesBrandFilter({ brand: 'Yara', brandKey: 'yara' }, 'Yara'), true);
  assert.equal(matchesBrandFilter({ brand: 'Yara Fertilizers', brandKey: 'yarafertilizers' }, 'yara fertilizers'), true);
  assert.equal(matchesBrandFilter({ brand: 'Yara', brandKey: 'yara' }, 'Simlaw'), false);
  assert.equal(matchesBrandFilter({ brand: 'Yara' }, ''), true);
});

test('matchesPriceFilter applies inclusive min/max bounds', () => {
  assert.equal(matchesPriceFilter({ price: 500 }, 100, 1000), true);
  assert.equal(matchesPriceFilter({ price: 50 }, 100, null), false);
  assert.equal(matchesPriceFilter({ price: 1500 }, null, 1000), false);
  assert.equal(matchesPriceFilter({ price: 0 }, null, null), true);
});

test('inventory and products APIs accept brand and price query params', () => {
  const inventory = readFileSync(join(root, 'src/app/api/admin/inventory/route.ts'), 'utf8');
  const products = readFileSync(join(root, 'src/app/api/admin/products/route.ts'), 'utf8');
  assert.match(inventory, /matchesBrandFilter/);
  assert.match(inventory, /matchesPriceFilter/);
  assert.match(inventory, /minPrice/);
  assert.match(products, /matchesBrandFilter/);
  assert.match(products, /params\.get\("brand"\)/);
});

test('admin inventory and products pages expose brand and price filters', () => {
  const inventory = readFileSync(join(root, 'src/app/dashboard/admin/inventory/page.tsx'), 'utf8');
  const products = readFileSync(join(root, 'src/app/dashboard/admin/products/page.tsx'), 'utf8');
  assert.match(inventory, /All brands/);
  assert.match(inventory, /Min price \(KES\)/);
  assert.match(inventory, /params\.set\("brand"/);
  assert.match(products, /All brands/);
  assert.match(products, /params\.set\("minPrice"/);
});
