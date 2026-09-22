import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

test('dnd-kit is a project dependency', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.dependencies['@dnd-kit/core']);
  assert.ok(pkg.dependencies['@dnd-kit/sortable']);
});

test('CMS pages editor uses SortableBlockList and blocks schema', () => {
  const pages = read('src/app/dashboard/admin/cms/pages/page.tsx');
  assert.match(pages, /SortableBlockList/);
  assert.match(pages, /schemaVersion:\s*2/);
  assert.match(pages, /createDefaultAboutBlock|createDefaultHelpBlock/);
});

test('homepage banners editor supports drag reorder', () => {
  const banners = read('src/app/dashboard/admin/cms/page.tsx');
  assert.match(banners, /SortableBlockList/);
  assert.match(banners, /onReorder=\{setBanners\}/);
});

test('About storefront renders block list', () => {
  const view = read('src/components/cms/AboutPageView.tsx');
  assert.match(view, /page\.blocks\.map/);
  assert.match(view, /AboutBlocksPage/);
});

test('admin pages API validates and stores blocks', () => {
  const api = read('src/app/api/admin/pages/route.ts');
  assert.match(api, /validateBlocksPage/);
  assert.match(api, /schemaVersion:\s*2/);
  assert.match(api, /blocks:\s*content\.blocks/);
});
