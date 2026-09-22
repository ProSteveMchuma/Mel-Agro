import { z } from 'zod';
import {
  DEFAULT_ABOUT_PAGE,
  DEFAULT_HELP_PAGE,
  aboutPageSchema,
  helpPageSchema,
} from './cms-pages.ts';

type AboutPageContent = z.infer<typeof aboutPageSchema>;
type HelpPageContent = z.infer<typeof helpPageSchema>;
type CmsPageSlug = 'about' | 'help';

const faqSchema = z.object({
  question: z.string().trim().min(1).max(240),
  answer: z.string().trim().min(1).max(2000),
});

const aboutStatSchema = z.object({
  value: z.string().trim().min(1).max(24),
  label: z.string().trim().min(1).max(80),
});

const aboutValueSchema = z.object({
  title: z.string().trim().min(1).max(80),
  desc: z.string().trim().min(1).max(400),
  color: z.string().trim().min(1).max(80),
});

export const ABOUT_BLOCK_TYPES = ['hero', 'who', 'missionVision', 'values', 'cta'] as const;
export type AboutBlockType = (typeof ABOUT_BLOCK_TYPES)[number];

export const HELP_BLOCK_TYPES = ['helpHeader', 'faqCategory'] as const;
export type HelpBlockType = (typeof HELP_BLOCK_TYPES)[number];

const aboutHeroDataSchema = z.object({
  heroEyebrow: z.string().trim().min(1).max(120),
  heroTitle: z.string().trim().min(1).max(240),
  heroTitleAccent: z.string().trim().max(80),
  heroTitleSuffix: z.string().trim().max(160),
  heroSubtitle: z.string().trim().min(1).max(800),
});

const aboutWhoDataSchema = z.object({
  whoTitle: z.string().trim().min(1).max(200),
  whoBody: z.string().trim().min(1).max(2000),
  quote: z.string().trim().min(1).max(400),
  stats: z.array(aboutStatSchema).min(1).max(6),
});

const aboutMissionVisionDataSchema = z.object({
  mission: z.string().trim().min(1).max(800),
  vision: z.string().trim().min(1).max(800),
});

const aboutValuesDataSchema = z.object({
  values: z.array(aboutValueSchema).min(1).max(8),
});

const aboutCtaDataSchema = z.object({
  ctaTitle: z.string().trim().min(1).max(160),
  ctaBody: z.string().trim().min(1).max(400),
  ctaHref: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((value) => value.startsWith('/') || value.startsWith('https://'), 'CTA link must be an internal path or HTTPS URL.'),
  ctaLabel: z.string().trim().min(1).max(80),
});

const helpHeaderDataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().min(1).max(400),
  supportBlurb: z.string().trim().min(1).max(400),
});

const faqCategoryDataSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(12),
  faqs: z.array(faqSchema).min(1).max(20),
});

export const aboutBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1).max(80), type: z.literal('hero'), data: aboutHeroDataSchema }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('who'), data: aboutWhoDataSchema }),
  z.object({
    id: z.string().min(1).max(80),
    type: z.literal('missionVision'),
    data: aboutMissionVisionDataSchema,
  }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('values'), data: aboutValuesDataSchema }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('cta'), data: aboutCtaDataSchema }),
]);

export const helpBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1).max(80), type: z.literal('helpHeader'), data: helpHeaderDataSchema }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('faqCategory'), data: faqCategoryDataSchema }),
]);

export type AboutBlock = z.infer<typeof aboutBlockSchema>;
export type HelpBlock = z.infer<typeof helpBlockSchema>;
export type CmsBlock = AboutBlock | HelpBlock;

export const aboutBlocksPageSchema = z.object({
  schemaVersion: z.literal(2),
  blocks: z.array(aboutBlockSchema).min(1).max(20),
});

export const helpBlocksPageSchema = z.object({
  schemaVersion: z.literal(2),
  blocks: z.array(helpBlockSchema).min(1).max(24),
});

export type AboutBlocksPage = z.infer<typeof aboutBlocksPageSchema>;
export type HelpBlocksPage = z.infer<typeof helpBlocksPageSchema>;
export type CmsBlocksPage = AboutBlocksPage | HelpBlocksPage;

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function aboutFlatToBlocks(flat: AboutPageContent): AboutBlock[] {
  return [
    {
      id: newId('hero'),
      type: 'hero',
      data: {
        heroEyebrow: flat.heroEyebrow,
        heroTitle: flat.heroTitle,
        heroTitleAccent: flat.heroTitleAccent,
        heroTitleSuffix: flat.heroTitleSuffix,
        heroSubtitle: flat.heroSubtitle,
      },
    },
    {
      id: newId('who'),
      type: 'who',
      data: {
        whoTitle: flat.whoTitle,
        whoBody: flat.whoBody,
        quote: flat.quote,
        stats: flat.stats,
      },
    },
    {
      id: newId('mission'),
      type: 'missionVision',
      data: { mission: flat.mission, vision: flat.vision },
    },
    {
      id: newId('values'),
      type: 'values',
      data: { values: flat.values },
    },
    {
      id: newId('cta'),
      type: 'cta',
      data: {
        ctaTitle: flat.ctaTitle,
        ctaBody: flat.ctaBody,
        ctaHref: flat.ctaHref,
        ctaLabel: flat.ctaLabel,
      },
    },
  ];
}

export function helpFlatToBlocks(flat: HelpPageContent): HelpBlock[] {
  return [
    {
      id: newId('header'),
      type: 'helpHeader',
      data: {
        title: flat.title,
        subtitle: flat.subtitle,
        supportBlurb: flat.supportBlurb,
      },
    },
    ...flat.categories.map((category) => ({
      id: newId(`faq-${category.id}`),
      type: 'faqCategory' as const,
      data: { ...category },
    })),
  ];
}

export function aboutBlocksToFlat(blocks: AboutBlock[]): AboutPageContent {
  const flat = { ...DEFAULT_ABOUT_PAGE };
  for (const block of blocks) {
    if (block.type === 'hero') Object.assign(flat, block.data);
    if (block.type === 'who') Object.assign(flat, block.data);
    if (block.type === 'missionVision') Object.assign(flat, block.data);
    if (block.type === 'values') flat.values = block.data.values;
    if (block.type === 'cta') Object.assign(flat, block.data);
  }
  return aboutPageSchema.parse(flat);
}

export function helpBlocksToFlat(blocks: HelpBlock[]): HelpPageContent {
  const header = blocks.find((b) => b.type === 'helpHeader');
  const categories = blocks.filter((b) => b.type === 'faqCategory').map((b) => b.data);
  const flat: HelpPageContent = {
    title: header?.type === 'helpHeader' ? header.data.title : DEFAULT_HELP_PAGE.title,
    subtitle: header?.type === 'helpHeader' ? header.data.subtitle : DEFAULT_HELP_PAGE.subtitle,
    supportBlurb: header?.type === 'helpHeader' ? header.data.supportBlurb : DEFAULT_HELP_PAGE.supportBlurb,
    categories: categories.length > 0 ? categories : DEFAULT_HELP_PAGE.categories,
  };
  return helpPageSchema.parse(flat);
}

export function defaultBlocksPage(slug: CmsPageSlug): CmsBlocksPage {
  if (slug === 'about') {
    return { schemaVersion: 2, blocks: aboutFlatToBlocks(DEFAULT_ABOUT_PAGE) };
  }
  return { schemaVersion: 2, blocks: helpFlatToBlocks(DEFAULT_HELP_PAGE) };
}

/** Normalize Firestore payload: v2 blocks, or legacy flat → blocks. */
export function parseBlocksPage(slug: CmsPageSlug, raw: unknown): CmsBlocksPage {
  if (raw && typeof raw === 'object' && Array.isArray((raw as { blocks?: unknown }).blocks)) {
    const schema = slug === 'about' ? aboutBlocksPageSchema : helpBlocksPageSchema;
    const parsed = schema.safeParse({
      schemaVersion: 2,
      blocks: (raw as { blocks: unknown }).blocks,
    });
    if (parsed.success) return parsed.data as CmsBlocksPage;
  }

  if (slug === 'about') {
    const flat = aboutPageSchema.safeParse(raw);
    if (flat.success) return { schemaVersion: 2, blocks: aboutFlatToBlocks(flat.data) };
    return defaultBlocksPage('about');
  }

  const flat = helpPageSchema.safeParse(raw);
  if (flat.success) return { schemaVersion: 2, blocks: helpFlatToBlocks(flat.data) };
  return defaultBlocksPage('help');
}

export function validateBlocksPage(slug: CmsPageSlug, content: unknown) {
  const schema = slug === 'about' ? aboutBlocksPageSchema : helpBlocksPageSchema;
  const parsed = schema.safeParse(content);
  if (!parsed.success) return parsed;

  if (slug === 'about') {
    const types = new Set(parsed.data.blocks.map((b) => b.type));
    for (const required of ABOUT_BLOCK_TYPES) {
      if (!types.has(required)) {
        return {
          success: false as const,
          error: { issues: [{ message: `About pages require a “${required}” section.` }] },
        };
      }
    }
    for (const type of ABOUT_BLOCK_TYPES) {
      if (parsed.data.blocks.filter((b) => b.type === type).length > 1) {
        return {
          success: false as const,
          error: { issues: [{ message: `Only one “${type}” section is allowed on About.` }] },
        };
      }
    }
  } else {
    const headers = parsed.data.blocks.filter((b) => b.type === 'helpHeader');
    const faqs = parsed.data.blocks.filter((b) => b.type === 'faqCategory');
    if (headers.length !== 1) {
      return {
        success: false as const,
        error: { issues: [{ message: 'Help pages require exactly one header section.' }] },
      };
    }
    if (faqs.length < 1) {
      return {
        success: false as const,
        error: { issues: [{ message: 'Help pages need at least one FAQ category.' }] },
      };
    }
  }

  return parsed;
}

export function blockLabel(type: AboutBlockType | HelpBlockType): string {
  switch (type) {
    case 'hero':
      return 'Hero';
    case 'who':
      return 'Who we are';
    case 'missionVision':
      return 'Mission & vision';
    case 'values':
      return 'Values';
    case 'cta':
      return 'Call to action';
    case 'helpHeader':
      return 'Help header';
    case 'faqCategory':
      return 'FAQ category';
    default:
      return type;
  }
}

export function createDefaultAboutBlock(type: AboutBlockType): AboutBlock {
  const defaults = aboutFlatToBlocks(DEFAULT_ABOUT_PAGE);
  const match = defaults.find((b) => b.type === type);
  if (!match) throw new Error(`Unknown about block ${type}`);
  return { ...match, id: newId(type), data: structuredClone(match.data) } as AboutBlock;
}

export function createDefaultHelpBlock(type: HelpBlockType): HelpBlock {
  if (type === 'helpHeader') {
    const header = helpFlatToBlocks(DEFAULT_HELP_PAGE).find((b) => b.type === 'helpHeader')!;
    return { ...header, id: newId('header'), data: structuredClone(header.data) };
  }
  return {
    id: newId('faq'),
    type: 'faqCategory',
    data: {
      id: `category-${Math.random().toString(36).slice(2, 8)}`,
      label: 'New category',
      icon: '❓',
      faqs: [{ question: 'New question', answer: 'New answer' }],
    },
  };
}

export function blocksContentEqual(a: CmsBlocksPage, b: CmsBlocksPage): boolean {
  return JSON.stringify(a.blocks) === JSON.stringify(b.blocks);
}
