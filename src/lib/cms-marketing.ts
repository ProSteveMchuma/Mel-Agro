import { z } from 'zod';

export const MARKETING_PAGE_SLUGS = [
  'delivery',
  'returns',
  'privacy',
  'terms',
  'contact',
  'bulk',
] as const;

export type MarketingPageSlug = (typeof MARKETING_PAGE_SLUGS)[number];

export function isMarketingPageSlug(value: string): value is MarketingPageSlug {
  return (MARKETING_PAGE_SLUGS as readonly string[]).includes(value);
}

export const MARKETING_BLOCK_TYPES = ['pageHeader', 'prose', 'callout', 'bullets'] as const;
export type MarketingBlockType = (typeof MARKETING_BLOCK_TYPES)[number];

const pageHeaderDataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(600),
});

const proseDataSchema = z.object({
  heading: z.string().trim().max(160),
  body: z.string().trim().min(1).max(8000),
});

const calloutDataSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1200),
  tone: z.enum(['green', 'amber', 'neutral']),
});

const bulletsDataSchema = z.object({
  heading: z.string().trim().max(160),
  items: z.array(z.string().trim().min(1).max(400)).min(1).max(20),
});

export const marketingBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1).max(80), type: z.literal('pageHeader'), data: pageHeaderDataSchema }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('prose'), data: proseDataSchema }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('callout'), data: calloutDataSchema }),
  z.object({ id: z.string().min(1).max(80), type: z.literal('bullets'), data: bulletsDataSchema }),
]);

export type MarketingBlock = z.infer<typeof marketingBlockSchema>;

export const marketingBlocksPageSchema = z.object({
  schemaVersion: z.literal(2),
  blocks: z.array(marketingBlockSchema).min(1).max(40),
});

export type MarketingBlocksPage = z.infer<typeof marketingBlocksPageSchema>;

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function marketingBlockLabel(type: MarketingBlockType): string {
  switch (type) {
    case 'pageHeader':
      return 'Page header';
    case 'prose':
      return 'Text section';
    case 'callout':
      return 'Highlight box';
    case 'bullets':
      return 'Bullet list';
    default:
      return type;
  }
}

export function createDefaultMarketingBlock(type: MarketingBlockType): MarketingBlock {
  switch (type) {
    case 'pageHeader':
      return {
        id: id('header'),
        type: 'pageHeader',
        data: { title: 'New page title', subtitle: 'Short supporting line for shoppers.' },
      };
    case 'prose':
      return {
        id: id('prose'),
        type: 'prose',
        data: { heading: 'Section heading', body: 'Write the section body here. Use blank lines to start a new paragraph.' },
      };
    case 'callout':
      return {
        id: id('callout'),
        type: 'callout',
        data: {
          title: 'Important',
          body: 'A short highlight shoppers should notice.',
          tone: 'green',
        },
      };
    case 'bullets':
      return {
        id: id('bullets'),
        type: 'bullets',
        data: { heading: 'Key points', items: ['First point', 'Second point'] },
      };
  }
}

const DEFAULTS: Record<MarketingPageSlug, MarketingBlock[]> = {
  delivery: [
    {
      id: 'delivery-header',
      type: 'pageHeader',
      data: {
        title: 'Delivery Information',
        subtitle:
          'Mel-Agri delivers seeds, fertilizers, and agrochemicals across Kenya. Choose home delivery at checkout, or collect free from our Machakos collection point.',
      },
    },
    {
      id: 'delivery-free',
      type: 'callout',
      data: {
        title: 'Free delivery',
        body: 'On orders of KES 5,000 or more, country-wide. Exact rates show at checkout by county.',
        tone: 'green',
      },
    },
    {
      id: 'delivery-pickup',
      type: 'callout',
      data: {
        title: 'Free pickup (Machakos only)',
        body: 'Collect at our Machakos collection point — usually ready in 1–2 hours when stock allows.',
        tone: 'amber',
      },
    },
    {
      id: 'delivery-process',
      type: 'prose',
      data: {
        heading: 'How delivery works',
        body: 'Orders placed before 12:00 PM are processed same-day. Sunday and public-holiday orders process the next business day.\n\nWhen your order ships you get an SMS update, and the same status appears under Alerts in your dashboard.',
      },
    },
  ],
  returns: [
    {
      id: 'returns-header',
      type: 'pageHeader',
      data: {
        title: 'Return Policy',
        subtitle: 'We want you to be completely satisfied with your purchase. If you receive a defective or incorrect item, we are here to help.',
      },
    },
    {
      id: 'returns-eligibility',
      type: 'bullets',
      data: {
        heading: 'Eligibility for Returns',
        items: [
          'Items must be returned within 7 days of delivery or collection.',
          'Items must be unused and in their original packaging.',
          'Perishable goods (like certain seeds or live plants) may not be eligible for return.',
        ],
      },
    },
    {
      id: 'returns-how',
      type: 'prose',
      data: {
        heading: 'How to Initiate a Return',
        body: 'Go to your Orders Dashboard, select the order, and click “Request Return”. You can also contact support with your order number and photos if the item arrived damaged.',
      },
    },
    {
      id: 'returns-refunds',
      type: 'prose',
      data: {
        heading: 'Refunds',
        body: 'Once we receive and inspect your return, we will notify you of the approval or rejection of your refund. Approved refunds are processed through the payment method agreed with our support team, normally M-Pesa, within 5-7 business days.',
      },
    },
  ],
  privacy: [
    {
      id: 'privacy-header',
      type: 'pageHeader',
      data: {
        title: 'Privacy Policy',
        subtitle:
          'This policy explains how Mel-Agri uses account, order, delivery, support, and website-interaction data to operate and improve the store. We do not sell personal data.',
      },
    },
    {
      id: 'privacy-collect',
      type: 'prose',
      data: {
        heading: '1. Information We Collect',
        body: 'We collect details you submit when creating an account, checking out, paying, requesting delivery, or contacting support. We also record product views, searches, cart actions, recommendation interactions, payment status, and fulfillment timestamps. Analytics are designed to avoid storing search terms that look like phone numbers or email addresses.',
      },
    },
    {
      id: 'privacy-use',
      type: 'prose',
      data: {
        heading: '2. How We Use Your Information',
        body: 'We use this information to process orders, prevent fraud, provide support, estimate delivery, identify operational problems, understand aggregate demand, and—when enabled—rank product suggestions and estimate likely reorder timing. Recommendations show a reason and do not remove access to the full catalog.',
      },
    },
    {
      id: 'privacy-personalization',
      type: 'prose',
      data: {
        heading: '3. Personalization and automated assistance',
        body: 'You can turn product personalization off from the recommendation area. Cart-recovery contact requires a separate opt-in and is limited by cooldown and attempt controls. We do not use an automated assistant to prescribe pesticide or veterinary dosage, mixing, or diagnosis. High-impact operational actions remain subject to staff review.',
      },
    },
    {
      id: 'privacy-retention',
      type: 'prose',
      data: {
        heading: '4. Retention and sharing',
        body: 'Short-lived visit-deduplication records are retained for 2 days. Search and recommendation aggregates are retained for about 13 months; purchase reconciliation and recorded operational outcomes for up to 24 months. Order and financial records may be retained longer where required for accounting, legal obligations, disputes, or fraud prevention. We share necessary data only with service providers involved in hosting, payments, communications, and delivery.',
      },
    },
    {
      id: 'privacy-security',
      type: 'prose',
      data: {
        heading: '5. Security and your choices',
        body: 'We implement appropriate security measures to protect your personal information from unauthorized access or disclosure.\n\nYou may update your profile and communication preferences, opt out of personalization or cart recovery, and contact Mel-Agri to request access, correction, or deletion where applicable. Some transaction records cannot be deleted immediately when legal retention duties apply.',
      },
    },
  ],
  terms: [
    {
      id: 'terms-header',
      type: 'pageHeader',
      data: {
        title: 'Terms & Conditions',
        subtitle: 'Please read these terms and conditions carefully before using the Mel-Agri platform.',
      },
    },
    {
      id: 'terms-intro',
      type: 'prose',
      data: {
        heading: '1. Introduction',
        body: 'Welcome to Mel-Agri. By accessing or using our website and services, you agree to be bound by these terms and conditions. These terms apply to all visitors, users, and others who access or use the service.',
      },
    },
    {
      id: 'terms-use',
      type: 'prose',
      data: {
        heading: '2. Use of Services',
        body: 'You agree to use Mel-Agri services only for lawful purposes related to agricultural activities. You are responsible for maintaining the confidentiality of your account credentials.',
      },
    },
    {
      id: 'terms-pricing',
      type: 'prose',
      data: {
        heading: '3. Product Information & Pricing',
        body: 'We strive to display accurate product information and pricing. Prices are listed in Kenyan Shillings (KES) and may change without notice. In the event of a pricing error, we reserve the right to cancel orders placed at the incorrect price.',
      },
    },
    {
      id: 'terms-orders',
      type: 'prose',
      data: {
        heading: '4. Orders & Payment',
        body: 'Orders are confirmed after successful payment (typically via M-Pesa). We may refuse or cancel an order for stock, fraud-prevention, or compliance reasons and will notify you when that happens.',
      },
    },
  ],
  contact: [
    {
      id: 'contact-header',
      type: 'pageHeader',
      data: {
        title: 'Contact Mel-Agri',
        subtitle:
          'Bringing Quality Agricultural Inputs online in Kenya and Beyond. Reach out with your orders or partnerships.',
      },
    },
    {
      id: 'contact-hours',
      type: 'callout',
      data: {
        title: 'Support hours',
        body: 'Monday – Friday, 8am – 5pm. For urgent order issues, use WhatsApp or phone and include your order number.',
        tone: 'green',
      },
    },
    {
      id: 'contact-location',
      type: 'prose',
      data: {
        heading: 'Visit & reach us',
        body: 'Our team supports farmers from Makamithi Towers in Nairobi. Use the form on this page, call, WhatsApp, or email — we reply as soon as we can during support hours.',
      },
    },
  ],
  bulk: [
    {
      id: 'bulk-header',
      type: 'pageHeader',
      data: {
        title: 'Bulk & Wholesale Orders',
        subtitle:
          'Are you a large-scale farmer, cooperative, or institution? We offer bulk supply and wholesale orders via Makamithi, our parent company — with special pricing and logistics for high-volume agricultural inputs.',
      },
    },
    {
      id: 'bulk-makamithi',
      type: 'callout',
      data: {
        title: 'Fulfilled by Makamithi',
        body: 'Mel-Agri is the digital storefront. Wholesale and bulk supply are handled through Makamithi so you get parent-company pricing, stock depth, and delivery capacity.',
        tone: 'green',
      },
    },
    {
      id: 'bulk-why',
      type: 'bullets',
      data: {
        heading: 'Why Buy in Bulk?',
        items: [
          'Wholesale pricing on fertilizers, seeds, agrochemicals, and equipment.',
          'Dedicated account support through Makamithi.',
          'Priority delivery logistics for high-volume orders.',
        ],
      },
    },
    {
      id: 'bulk-next',
      type: 'prose',
      data: {
        heading: 'Request a quote',
        body: 'Use the form on this page with your product list, quantities, and delivery county. A Makamithi account manager will follow up with pricing and lead times.',
      },
    },
  ],
};

export function defaultMarketingBlocksPage(slug: MarketingPageSlug): MarketingBlocksPage {
  return {
    schemaVersion: 2,
    blocks: DEFAULTS[slug].map((block) => ({
      ...block,
      data: structuredClone(block.data),
    })) as MarketingBlock[],
  };
}

export function parseMarketingBlocksPage(slug: MarketingPageSlug, raw: unknown): MarketingBlocksPage {
  if (raw && typeof raw === 'object' && Array.isArray((raw as { blocks?: unknown }).blocks)) {
    const parsed = marketingBlocksPageSchema.safeParse({
      schemaVersion: 2,
      blocks: (raw as { blocks: unknown }).blocks,
    });
    if (parsed.success) return parsed.data;
  }
  return defaultMarketingBlocksPage(slug);
}

export function validateMarketingBlocksPage(content: unknown) {
  const parsed = marketingBlocksPageSchema.safeParse(content);
  if (!parsed.success) return parsed;
  const headers = parsed.data.blocks.filter((block) => block.type === 'pageHeader');
  if (headers.length !== 1) {
    return {
      success: false as const,
      error: { issues: [{ message: 'Marketing pages require exactly one page header.' }] },
    };
  }
  return parsed;
}
