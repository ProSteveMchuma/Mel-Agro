import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

const adminPhotos = [
  'src/app/dashboard/admin/products/page.tsx',
  'src/app/dashboard/admin/inventory/page.tsx',
  'src/app/dashboard/admin/fulfillment/page.tsx',
  'src/app/dashboard/admin/returns/page.tsx',
  'src/app/dashboard/admin/operations/page.tsx',
  'src/app/dashboard/admin/orders/[id]/page.tsx',
];

test('admin product, inventory, and order photos skip the image optimizer', () => {
  for (const path of adminPhotos) {
    const file = source(path);
    assert.match(file, /skipImageOptimizer/, `${path} still sends remote photos through /_next/image`);
    assert.doesNotMatch(file, /includes\('firebasestorage'\)/, `${path} still uses the narrower storage check`);
  }
});

test('product form gallery and variant previews stay off the optimizer', () => {
  const form = source('src/components/admin/ProductForm.tsx');
  const previews = form.match(/<Image\b[^>]*\/>/g) || [];
  assert.equal(previews.length, 3);
  for (const tag of previews) {
    assert.match(tag, /\bunoptimized\b/);
  }
});

test('hero and partner images are not retargeted by the admin photo fix', () => {
  const hero = source('src/components/Hero.tsx');
  const partners = source('src/components/Partners.tsx');
  assert.match(hero, /kenyan-farmer-banner\.png/);
  assert.doesNotMatch(hero, /skipImageOptimizer/);
  assert.match(partners, /unoptimized/);
  assert.doesNotMatch(partners, /skipImageOptimizer/);
});
