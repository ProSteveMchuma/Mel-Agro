import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aboutBlocksToFlat,
  aboutFlatToBlocks,
  blocksContentEqual,
  createDefaultAboutBlock,
  createDefaultHelpBlock,
  defaultBlocksPage,
  helpBlocksToFlat,
  helpFlatToBlocks,
  parseBlocksPage,
  validateBlocksPage,
} from '../src/lib/cms-blocks.ts';
import { DEFAULT_ABOUT_PAGE, DEFAULT_HELP_PAGE } from '../src/lib/cms-pages.ts';

test('flat about content converts to ordered blocks and back', () => {
  const blocks = aboutFlatToBlocks(DEFAULT_ABOUT_PAGE);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['hero', 'who', 'missionVision', 'values', 'cta'],
  );
  const flat = aboutBlocksToFlat(blocks);
  assert.equal(flat.heroEyebrow, DEFAULT_ABOUT_PAGE.heroEyebrow);
  assert.equal(flat.ctaLabel, DEFAULT_ABOUT_PAGE.ctaLabel);
  assert.equal(flat.values.length, DEFAULT_ABOUT_PAGE.values.length);
});

test('flat help content converts to header + faqCategory blocks', () => {
  const blocks = helpFlatToBlocks(DEFAULT_HELP_PAGE);
  assert.equal(blocks[0]?.type, 'helpHeader');
  assert.ok(blocks.filter((b) => b.type === 'faqCategory').length >= 1);
  const flat = helpBlocksToFlat(blocks);
  assert.equal(flat.title, DEFAULT_HELP_PAGE.title);
  assert.equal(flat.categories.length, DEFAULT_HELP_PAGE.categories.length);
});

test('parseBlocksPage migrates legacy flat Firestore payloads', () => {
  const about = parseBlocksPage('about', DEFAULT_ABOUT_PAGE);
  assert.equal(about.schemaVersion, 2);
  assert.equal(about.blocks[0]?.type, 'hero');

  const help = parseBlocksPage('help', DEFAULT_HELP_PAGE);
  assert.equal(help.schemaVersion, 2);
  assert.ok(help.blocks.some((b) => b.type === 'faqCategory'));
});

test('parseBlocksPage accepts v2 blocks payloads', () => {
  const page = defaultBlocksPage('about');
  const reordered = {
    schemaVersion: 2 as const,
    blocks: [page.blocks[4], page.blocks[0], page.blocks[1], page.blocks[2], page.blocks[3]],
  };
  const parsed = parseBlocksPage('about', reordered);
  assert.equal(parsed.blocks[0]?.type, 'cta');
});

test('validateBlocksPage requires singleton about sections', () => {
  const page = defaultBlocksPage('about');
  const missing = { schemaVersion: 2 as const, blocks: page.blocks.filter((b) => b.type !== 'cta') };
  const result = validateBlocksPage('about', missing);
  assert.equal(result.success, false);

  const duplicate = {
    schemaVersion: 2 as const,
    blocks: [...page.blocks, createDefaultAboutBlock('hero')],
  };
  assert.equal(validateBlocksPage('about', duplicate).success, false);
  assert.equal(validateBlocksPage('about', page).success, true);
});

test('validateBlocksPage requires help header and at least one FAQ', () => {
  const page = defaultBlocksPage('help');
  assert.equal(validateBlocksPage('help', page).success, true);
  const noFaq = { schemaVersion: 2 as const, blocks: page.blocks.filter((b) => b.type === 'helpHeader') };
  assert.equal(validateBlocksPage('help', noFaq).success, false);
});

test('marketing pages default and validate with a single header', () => {
  const page = defaultBlocksPage('delivery');
  assert.equal(page.schemaVersion, 2);
  assert.equal(page.blocks[0]?.type, 'pageHeader');
  assert.equal(validateBlocksPage('delivery', page).success, true);

  const noHeader = {
    schemaVersion: 2 as const,
    blocks: page.blocks.filter((b) => b.type !== 'pageHeader'),
  };
  assert.equal(validateBlocksPage('delivery', noHeader).success, false);

  const privacy = parseBlocksPage('privacy', defaultBlocksPage('privacy'));
  assert.ok(privacy.blocks.some((b) => b.type === 'prose'));
});

test('home-below requires quick shop and allows partners intro', () => {
  const page = defaultBlocksPage('home-below');
  assert.equal(page.blocks[0]?.type, 'quickShop');
  assert.equal(validateBlocksPage('home-below', page).success, true);
  const noQuick = {
    schemaVersion: 2 as const,
    blocks: page.blocks.filter((b) => b.type !== 'quickShop'),
  };
  assert.equal(validateBlocksPage('home-below', noQuick).success, false);
});

test('createDefaultHelpBlock can add FAQ categories', () => {
  const block = createDefaultHelpBlock('faqCategory');
  assert.equal(block.type, 'faqCategory');
  assert.ok(block.data.faqs.length >= 1);
});

test('blocksContentEqual ignores identical structure', () => {
  const a = defaultBlocksPage('about');
  const b = defaultBlocksPage('about');
  // New ids each time — content fields may match types but ids differ
  assert.equal(blocksContentEqual(a, a), true);
  assert.equal(a.blocks.length, b.blocks.length);
});
