import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ABOUT_PAGE,
  DEFAULT_HELP_PAGE,
  aboutPageSchema,
  helpPageSchema,
  isCmsPageSlug,
  parsePageContent,
} from '../src/lib/cms-pages.ts';

test('cms page slugs are allowlisted', () => {
  assert.equal(isCmsPageSlug('about'), true);
  assert.equal(isCmsPageSlug('help'), true);
  assert.equal(isCmsPageSlug('homepage'), false);
});

test('default about and help content validate', () => {
  assert.equal(aboutPageSchema.safeParse(DEFAULT_ABOUT_PAGE).success, true);
  assert.equal(helpPageSchema.safeParse(DEFAULT_HELP_PAGE).success, true);
});

test('parsePageContent falls back to defaults for invalid payloads', () => {
  const about = parsePageContent('about', { heroTitle: '' });
  assert.equal(about, DEFAULT_ABOUT_PAGE);
  const help = parsePageContent('help', { categories: [] });
  assert.equal(help, DEFAULT_HELP_PAGE);
});

test('parsePageContent accepts valid overrides', () => {
  const about = parsePageContent('about', {
    ...DEFAULT_ABOUT_PAGE,
    heroEyebrow: 'Makamithi Online',
  });
  assert.equal((about as typeof DEFAULT_ABOUT_PAGE).heroEyebrow, 'Makamithi Online');
});
