import { z } from 'zod';
import { MARKETING_PAGE_SLUGS } from './cms-marketing.ts';

export const CMS_PAGE_SLUGS = ['about', 'help', ...MARKETING_PAGE_SLUGS] as const;
export type CmsPageSlug = (typeof CMS_PAGE_SLUGS)[number];

export function isCmsPageSlug(value: string): value is CmsPageSlug {
  return (CMS_PAGE_SLUGS as readonly string[]).includes(value);
}

export function liveDocId(slug: CmsPageSlug) {
  return slug;
}

export function draftDocId(slug: CmsPageSlug) {
  return `${slug}Draft`;
}

const faqSchema = z.object({
  question: z.string().trim().min(1).max(240),
  answer: z.string().trim().min(1).max(2000),
});

const faqCategorySchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(12),
  faqs: z.array(faqSchema).min(1).max(20),
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

export const aboutPageSchema = z.object({
  heroEyebrow: z.string().trim().min(1).max(120),
  heroTitle: z.string().trim().min(1).max(240),
  heroTitleAccent: z.string().trim().max(80),
  heroTitleSuffix: z.string().trim().max(160),
  heroSubtitle: z.string().trim().min(1).max(800),
  whoTitle: z.string().trim().min(1).max(200),
  whoBody: z.string().trim().min(1).max(2000),
  quote: z.string().trim().min(1).max(400),
  stats: z.array(aboutStatSchema).min(1).max(6),
  mission: z.string().trim().min(1).max(800),
  vision: z.string().trim().min(1).max(800),
  values: z.array(aboutValueSchema).min(1).max(8),
  ctaTitle: z.string().trim().min(1).max(160),
  ctaBody: z.string().trim().min(1).max(400),
  ctaHref: z.string().trim().min(1).max(200).refine(
    (value) => value.startsWith('/') || value.startsWith('https://'),
    'CTA link must be an internal path or HTTPS URL.',
  ),
  ctaLabel: z.string().trim().min(1).max(80),
});

export const helpPageSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().min(1).max(400),
  categories: z.array(faqCategorySchema).min(1).max(12),
  supportBlurb: z.string().trim().min(1).max(400),
});

export type AboutPageContent = z.infer<typeof aboutPageSchema>;
export type HelpPageContent = z.infer<typeof helpPageSchema>;
export type CmsPageContent = AboutPageContent | HelpPageContent;

export const DEFAULT_ABOUT_PAGE: AboutPageContent = {
  heroEyebrow: 'Online Retail Arm of Makamithi',
  heroTitle: 'Bringing Quality Agricultural Inputs',
  heroTitleAccent: 'online',
  heroTitleSuffix: 'in Kenya and Beyond.',
  heroSubtitle:
    'We are the online retail arm of Makamithi Enterprises Ltd, one of the largest distributors and retailers of Agricultural inputs (animal feeds, seeds, fertilizers, crop protection products and veterinary products) in Kenya',
  whoTitle: 'Bringing Quality Agricultural Inputs online in Kenya and Beyond.',
  whoBody:
    'We are the online retail arm of Makamithi Enterprises Ltd, one of the largest distributors and retailers of Agricultural inputs (animal feeds, seeds, fertilizers, crop protection products and veterinary products) in Kenya',
  quote: 'Bringing Quality Agricultural Inputs online in Kenya and Beyond.',
  stats: [
    { value: '20+', label: 'Years Experience' },
    { value: '50k+', label: 'Farmers Served' },
    { value: '100%', label: 'Quality Assurance' },
  ],
  mission:
    'To empower farmers by providing frictionless access to high-quality agricultural inputs and sustainable solutions that maximize productivity and legacy.',
  vision:
    "To be Africa's definitive digital agribusiness partner, setting the benchmark for innovation, transparency, and impact across the entire value chain.",
  values: [
    { title: 'Integrity', desc: 'Honesty in every seed we sell and every advice we give.', color: 'bg-green-500' },
    { title: 'Innovation', desc: 'Constant pursuit of digital solutions for simple problems.', color: 'bg-melagri-primary' },
    { title: 'Resilience', desc: 'Standing by our farmers through every season and storm.', color: 'bg-orange-500' },
    { title: 'Excellence', desc: 'Uncompromising quality in products and customer service.', color: 'bg-blue-600' },
  ],
  ctaTitle: 'Shop Quality Inputs Online',
  ctaBody:
    'Explore animal feeds, seeds, fertilizers, crop protection, and veterinary products — backed by Makamithi Enterprises Ltd.',
  ctaHref: '/products',
  ctaLabel: 'Explore Marketplace',
};

export const DEFAULT_HELP_PAGE: HelpPageContent = {
  title: 'How can we help you?',
  subtitle: 'Find answers to common questions about orders, M-PESA payments, delivery, and agro inputs',
  supportBlurb: 'Our support team is available Monday - Friday, 8am - 5pm',
  categories: [
    {
      id: 'ordering-payments',
      label: 'Ordering & Payments',
      icon: '💳',
      faqs: [
        {
          question: 'How do I pay using M-PESA?',
          answer:
            'Select M-Pesa at checkout. You will get a prompt on your phone — enter your PIN. Once payment is confirmed you will receive an SMS, and the same update appears in your dashboard Alerts.',
        },
        {
          question: 'Do you deliver to upcountry locations?',
          answer:
            'Yes, we deliver countrywide. Delivery cost depends on your county (about KES 200 in Nairobi up to KES 750 upcountry). Free pickup is available at our Machakos collection point only. You see the exact fee at checkout.',
        },
        {
          question: 'Can I return items if I bought the wrong variety?',
          answer:
            'Yes. Unopened, defective, or incorrect items can be returned within 7 days of delivery. Open your order in the dashboard and tap Request Return, or contact support with your order number.',
        },
      ],
    },
    {
      id: 'shipping-delivery',
      label: 'Shipping & Delivery',
      icon: '🚚',
      faqs: [
        {
          question: 'What shipping methods are available?',
          answer:
            'Choose home delivery (priced by zone at checkout) or free pickup from our Machakos collection point only, usually ready in 1–2 hours.',
        },
        {
          question: 'How do I track my delivery?',
          answer:
            'When your order ships you get an SMS, and the same update is saved under Alerts in your dashboard. Open Orders in your account to follow status.',
        },
        {
          question: 'What happens if my item arrives damaged?',
          answer:
            "If your item arrives damaged, contact our support team immediately with photos. We'll arrange a replacement or refund within 48 hours.",
        },
      ],
    },
    {
      id: 'product-info',
      label: 'Product Info',
      icon: '🌱',
      faqs: [
        {
          question: 'Are your fertilizers and seeds certified?',
          answer:
            'Yes, all our products are certified genuine from authorized manufacturers. We only stock quality agricultural inputs.',
        },
        {
          question: 'How should I store farm inputs?',
          answer:
            'Store in a cool, dry place away from direct sunlight. Fertilizers should be kept away from moisture. See product packaging for specific storage instructions.',
        },
      ],
    },
    {
      id: 'account',
      label: 'My Account',
      icon: '👤',
      faqs: [
        {
          question: 'How do I create a Mel-Agri account?',
          answer:
            'Tap Sign In and use your Kenyan phone number. We send a 6-digit SMS from Makamithi — there is no password to remember. You can also use a magic link to your email, or Google.',
        },
        {
          question: 'I did not get my login code. What should I do?',
          answer:
            'Look for an SMS from Makamithi. Wait a minute, check that the phone number starts with 07 or +254, then tap Resend code. You can also sign in with Google or an email magic link.',
        },
        {
          question: 'Can I have multiple addresses?',
          answer:
            'Yes! You can save multiple delivery addresses in your account. This is useful if you have multiple farms or offices.',
        },
      ],
    },
  ],
};

export function defaultPageContent(slug: CmsPageSlug): CmsPageContent {
  if (slug === 'about') return DEFAULT_ABOUT_PAGE;
  if (slug === 'help') return DEFAULT_HELP_PAGE;
  // Marketing pages use block defaults via cms-blocks / cms-marketing.
  return DEFAULT_HELP_PAGE;
}

export function parsePageContent(slug: CmsPageSlug, raw: unknown): CmsPageContent {
  if (slug !== 'about' && slug !== 'help') return defaultPageContent(slug);
  const schema = slug === 'about' ? aboutPageSchema : helpPageSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return defaultPageContent(slug);
  return parsed.data;
}

export function contentFieldsEqual(a: CmsPageContent, b: CmsPageContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
