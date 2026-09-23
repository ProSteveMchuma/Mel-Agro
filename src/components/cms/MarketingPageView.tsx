import type { ReactNode } from 'react';
import Link from 'next/link';
import type { MarketingBlock, MarketingBlocksPage } from '@/lib/cms-marketing';

function paragraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function calloutTone(tone: 'green' | 'amber' | 'neutral') {
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-950';
  if (tone === 'neutral') return 'border-gray-100 bg-gray-50 text-gray-900';
  return 'border-green-100 bg-green-50 text-green-950';
}

export default function MarketingPageView({
  content,
  children,
}: {
  content: MarketingBlocksPage;
  /** Optional interactive region (contact form, bulk form, delivery rate table). */
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {content.blocks.map((block) => (
        <MarketingBlockView key={block.id} block={block} />
      ))}
      {children}
    </div>
  );
}

function MarketingBlockView({ block }: { block: MarketingBlock }) {
  if (block.type === 'pageHeader') {
    return (
      <header>
        <h1 className="text-3xl font-black tracking-tight text-gray-950 md:text-4xl">{block.data.title}</h1>
        {block.data.subtitle ? (
          <p className="mt-3 text-base leading-relaxed text-gray-600 md:text-lg">{block.data.subtitle}</p>
        ) : null}
      </header>
    );
  }

  if (block.type === 'callout') {
    return (
      <aside className={`rounded-2xl border px-5 py-4 ${calloutTone(block.data.tone)}`}>
        <p className="text-sm font-black">{block.data.title}</p>
        <p className="mt-1 text-sm leading-relaxed opacity-90">{block.data.body}</p>
      </aside>
    );
  }

  if (block.type === 'bullets') {
    return (
      <section>
        {block.data.heading ? (
          <h2 className="mb-3 text-xl font-bold text-gray-900">{block.data.heading}</h2>
        ) : null}
        <ul className="list-disc space-y-2 pl-5 text-gray-600">
          {block.data.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === 'quickShop') {
    return (
      <section aria-label="Quick shop tiles">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {block.data.tiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="group flex min-h-16 items-center justify-between rounded-2xl border border-gray-100 bg-[#f7faf7] px-5 py-4 transition-colors hover:border-green-300 hover:bg-white"
            >
              <div>
                <p className="text-sm font-black tracking-tight text-gray-900">{tile.label}</p>
                <p className="text-[11px] font-medium text-gray-500">{tile.hint}</p>
              </div>
              <span className="text-green-700" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Link href={block.data.browseAllHref} className="text-xs font-black uppercase tracking-widest text-green-700 hover:underline">
            {block.data.browseAllLabel}
          </Link>
        </div>
      </section>
    );
  }

  if (block.type === 'partnersIntro') {
    return (
      <section className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-8 text-center">
        {block.data.eyebrow ? (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-melagri-primary">{block.data.eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-black tracking-tighter text-gray-950">{block.data.title}</h2>
        {block.data.subtitle ? <p className="mt-2 text-sm text-gray-500">{block.data.subtitle}</p> : null}
        <p className="mt-4 text-xs text-gray-400">Partner logos still render on the live homepage.</p>
      </section>
    );
  }

  return (
    <section>
      {block.data.heading ? (
        <h2 className="mb-3 text-xl font-bold text-gray-900">{block.data.heading}</h2>
      ) : null}
      <div className="space-y-3 text-gray-600">
        {paragraphs(block.data.body).map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
