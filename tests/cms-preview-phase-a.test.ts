import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

test('preview routes exist for home, about, and help', () => {
  assert.match(read('src/app/preview/home/page.tsx'), /getDraftHomepage|getLiveHomepage/);
  assert.match(read('src/app/preview/about/page.tsx'), /getDraftCmsPage|getLiveCmsPage/);
  assert.match(read('src/app/preview/help/page.tsx'), /getDraftCmsPage|getLiveCmsPage/);
});

test('preview layout gates with marketing.manage via session cookie', () => {
  const layout = read('src/app/preview/layout.tsx');
  assert.match(layout, /requirePermissionFromSessionCookie/);
  assert.match(layout, /marketing\.manage/);
  assert.match(layout, /robots:\s*\{\s*index:\s*false/);
});

test('auth-server exposes session-cookie permission helper', () => {
  const auth = read('src/lib/auth-server.ts');
  assert.match(auth, /export async function requirePermissionFromSessionCookie/);
  assert.match(auth, /verifySessionCookie/);
});

test('CmsPreviewFrame supports draft/live toggle and refresh', () => {
  const frame = read('src/components/cms/CmsPreviewFrame.tsx');
  assert.match(frame, /mode.*draft.*live|Draft/);
  assert.match(frame, /\/preview\/\$\{target\}/);
  assert.match(frame, /Refresh/);
  assert.match(frame, /<iframe/);
});

test('CMS editors embed CmsPreviewFrame split preview', () => {
  const banners = read('src/app/dashboard/admin/cms/page.tsx');
  const pages = read('src/app/dashboard/admin/cms/pages/page.tsx');
  assert.match(banners, /CmsPreviewFrame/);
  assert.match(banners, /target="home"/);
  assert.match(pages, /CmsPreviewFrame/);
  assert.match(pages, /target=\{slug/);
});

test('About storefront reuses AboutPageView', () => {
  assert.match(read('src/app/about/page.tsx'), /AboutPageView/);
  assert.match(read('src/components/cms/AboutPageView.tsx'), /export default function AboutPageView/);
});

test('proxy and robots protect /preview', () => {
  assert.match(read('src/proxy.ts'), /\/preview\/:path\*/);
  assert.match(read('src/app/robots.ts'), /\/preview\//);
});
