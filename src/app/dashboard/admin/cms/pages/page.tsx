"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  ABOUT_BLOCK_TYPES,
  AboutBlock,
  AboutBlockType,
  AboutBlocksPage,
  blockLabel,
  blocksContentEqual,
  createDefaultAboutBlock,
  createDefaultHelpBlock,
  createDefaultMarketingBlock,
  defaultBlocksPage,
  HELP_BLOCK_TYPES,
  HelpBlock,
  HelpBlockType,
  HelpBlocksPage,
  MARKETING_BLOCK_TYPES,
  type CmsBlock,
  type CmsBlocksPage,
  type MarketingBlock,
  type MarketingBlockType,
  type MarketingBlocksPage,
} from "@/lib/cms-blocks";
import { CMS_PAGE_SLUGS, CmsPageSlug, isCmsPageSlug } from "@/lib/cms-pages";
import { isMarketingPageSlug } from "@/lib/cms-marketing";
import CmsPreviewFrame from "@/components/cms/CmsPreviewFrame";
import type { CmsPreviewTarget } from "@/components/cms/CmsPreviewFrame";
import SortableBlockList from "@/components/cms/SortableBlockList";
import { waitForAuthToken } from "@/lib/wait-for-auth-token";

const VALUE_COLORS = [
  { label: "Green", value: "bg-green-500" },
  { label: "Mel-Agri", value: "bg-melagri-primary" },
  { label: "Orange", value: "bg-orange-500" },
  { label: "Blue", value: "bg-blue-600" },
  { label: "Teal", value: "bg-teal-600" },
  { label: "Amber", value: "bg-amber-500" },
] as const;

export default function CmsPagesAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center text-sm text-gray-500">
          Loading pages…
        </div>
      }
    >
      <CmsPagesAdminInner />
    </Suspense>
  );
}

function CmsPagesAdminInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slugParam = searchParams.get("slug");
  const slug: CmsPageSlug = slugParam && isCmsPageSlug(slugParam) ? slugParam : "about";

  const [draft, setDraft] = useState<CmsBlocksPage>(defaultBlocksPage("about"));
  const [live, setLive] = useState<CmsBlocksPage>(defaultBlocksPage("about"));
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewRefresh, setPreviewRefresh] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = await waitForAuthToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const response = await fetch(`/api/admin/pages?slug=${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load page draft.");
        setDraft(result.draft.content);
        setLive(result.live.content);
        setVersion(result.draft.version || 0);
        setExpandedId(result.draft.content?.blocks?.[0]?.id || null);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Could not load page content.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [slug, refreshKey]);

  const changed = useMemo(() => !blocksContentEqual(draft, live), [draft, live]);

  function selectSlug(next: CmsPageSlug) {
    if (next === slug) return;
    if (changed && !window.confirm("You have unsaved draft edits. Switch page and discard them?")) return;
    router.replace(`/dashboard/admin/cms/pages?slug=${next}`);
  }

  async function persist(action: "saveDraft" | "publish") {
    if (action === "publish" && !window.confirm(`Publish this ${labelFor(slug)} draft to the live site now?`)) return;
    setSaving(true);
    try {
      const token = await waitForAuthToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, slug, version, content: draft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Save failed.");
      setVersion(result.version);
      if (action === "publish") setLive(draft);
      setPreviewRefresh((value) => value + 1);
      toast.success(action === "publish" ? `${labelFor(slug)} published` : "Draft saved");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Content update failed.");
    } finally {
      setSaving(false);
    }
  }

  function discardDraft() {
    if (!window.confirm(`Reset the ${labelFor(slug)} draft to what is live on the website?`)) return;
    setDraft(live);
    toast.success("Draft reset to live content");
  }

  function reorderBlocks(blocks: CmsBlock[]) {
    setDraft({ schemaVersion: 2, blocks } as CmsBlocksPage);
  }

  function updateBlock(id: string, next: CmsBlock) {
    setDraft({
      schemaVersion: 2,
      blocks: (draft.blocks as CmsBlock[]).map((block) => (block.id === id ? next : block)),
    } as CmsBlocksPage);
  }

  function removeBlock(id: string) {
    const blocks = draft.blocks as CmsBlock[];
    const block = blocks.find((item) => item.id === id);
    if (!block) return;
    if (slug === "about") {
      toast.error("About sections are required — reorder them instead of removing.");
      return;
    }
    if (block.type === "helpHeader" || block.type === "pageHeader") {
      toast.error("This page needs a header section.");
      return;
    }
    const faqs = blocks.filter((item) => item.type === "faqCategory");
    if (block.type === "faqCategory" && faqs.length <= 1) {
      toast.error("Keep at least one FAQ category.");
      return;
    }
    if (isMarketingPageSlug(slug) && blocks.length <= 1) {
      toast.error("Keep at least one section.");
      return;
    }
    if (!window.confirm("Remove this section from the draft?")) return;
    setDraft({
      schemaVersion: 2,
      blocks: blocks.filter((item) => item.id !== id),
    } as CmsBlocksPage);
  }

  function addAboutBlock(type: AboutBlockType) {
    const blocks = draft.blocks as AboutBlock[];
    if (blocks.some((b) => b.type === type)) {
      toast.error(`“${blockLabel(type)}” is already on this page.`);
      return;
    }
    const block = createDefaultAboutBlock(type);
    setDraft({ schemaVersion: 2, blocks: [...blocks, block] } satisfies AboutBlocksPage);
    setExpandedId(block.id);
  }

  function addHelpBlock(type: HelpBlockType) {
    const blocks = draft.blocks as HelpBlock[];
    if (type === "helpHeader" && blocks.some((b) => b.type === "helpHeader")) {
      toast.error("Help already has a header.");
      return;
    }
    if (type === "faqCategory" && blocks.filter((b) => b.type === "faqCategory").length >= 12) {
      toast.error("Maximum 12 FAQ categories.");
      return;
    }
    const block = createDefaultHelpBlock(type);
    setDraft({ schemaVersion: 2, blocks: [...blocks, block] } satisfies HelpBlocksPage);
    setExpandedId(block.id);
  }

  function addMarketingBlock(type: MarketingBlockType) {
    const blocks = draft.blocks as MarketingBlock[];
    if (type === "pageHeader" && blocks.some((b) => b.type === "pageHeader")) {
      toast.error("This page already has a header.");
      return;
    }
    if (blocks.length >= 40) {
      toast.error("Maximum 40 sections.");
      return;
    }
    const block = createDefaultMarketingBlock(type);
    setDraft({ schemaVersion: 2, blocks: [...blocks, block] } satisfies MarketingBlocksPage);
    setExpandedId(block.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Website content</p>
          <h1 className="text-2xl font-black text-gray-950">Site pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Drag sections to reorder. Draft first, publish when ready.{" "}
            <Link href="/dashboard/admin/cms" className="font-bold text-melagri-primary hover:underline">
              ← Homepage banners
            </Link>
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          {CMS_PAGE_SLUGS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => selectSlug(item)}
              className={`min-h-11 rounded-xl px-4 text-sm font-black capitalize ${
                slug === item ? "bg-gray-950 text-white" : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              {labelFor(item)}
            </button>
          ))}
          <a
            href={`/preview/${slug}?mode=draft`}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black leading-[2.75rem] text-gray-700"
          >
            Preview draft →
          </a>
          <button
            type="button"
            disabled={saving || !changed}
            onClick={discardDraft}
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-600 disabled:opacity-40"
          >
            Reset to live
          </button>
          <button
            type="button"
            disabled={saving || !changed}
            onClick={() => persist("saveDraft")}
            className="min-h-11 rounded-xl border border-gray-900 bg-white px-4 text-sm font-black disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving || !changed}
            onClick={() => persist("publish")}
            className="min-h-11 rounded-xl bg-green-700 px-5 text-sm font-black text-white disabled:opacity-40"
          >
            Publish
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-black text-slate-900">Sections & draft</p>
        <p className="mt-1">
          Drag the handle to reorder sections. Shoppers on <code className="rounded bg-white px-1 text-xs">/{slug}</code> keep
          seeing the last published version until you Publish.
        </p>
      </section>

      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          changed ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        {changed ? "Draft has unpublished changes." : "Draft matches the live page."}{" "}
        <span className="font-normal">
          Revision {version} · editing {labelFor(slug)} · {draft.blocks.length} sections
        </span>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{" "}
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="font-black underline">
            Reload
          </button>
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center text-sm text-gray-500">
          Loading {labelFor(slug)} draft…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {slug === "about"
                ? ABOUT_BLOCK_TYPES.filter((type) => !draft.blocks.some((b) => b.type === type)).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addAboutBlock(type)}
                      className="min-h-10 rounded-xl border border-dashed border-gray-300 bg-white px-3 text-xs font-black text-gray-700"
                    >
                      + {blockLabel(type)}
                    </button>
                  ))
                : slug === "help"
                  ? HELP_BLOCK_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addHelpBlock(type)}
                        className="min-h-10 rounded-xl border border-dashed border-gray-300 bg-white px-3 text-xs font-black text-gray-700"
                      >
                        + {blockLabel(type)}
                      </button>
                    ))
                  : MARKETING_BLOCK_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addMarketingBlock(type)}
                        className="min-h-10 rounded-xl border border-dashed border-gray-300 bg-white px-3 text-xs font-black text-gray-700"
                      >
                        + {blockLabel(type)}
                      </button>
                    ))}
            </div>

            <SortableBlockList
              items={draft.blocks as CmsBlock[]}
              onReorder={reorderBlocks}
              renderItem={(block, handle) => {
                const title =
                  block.type === "faqCategory"
                    ? block.data.label
                    : block.type === "pageHeader"
                      ? block.data.title
                      : block.type === "prose" || block.type === "bullets"
                        ? block.data.heading || blockLabel(block.type)
                        : block.type === "callout"
                          ? block.data.title
                          : blockLabel(block.type);
                return (
                <article className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                    {handle}
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandedId((current) => (current === block.id ? null : block.id))}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{block.type}</p>
                      <h2 className="truncate text-sm font-black text-gray-950">{title}</h2>
                    </button>
                    {(slug === "help" && block.type === "faqCategory") ||
                    (isMarketingPageSlug(slug) && block.type !== "pageHeader") ? (
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="rounded-lg px-2 py-1 text-xs font-black text-red-600"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {expandedId === block.id ? (
                    <div className="p-4">
                      {slug === "about" ? (
                        <AboutBlockFields block={block as AboutBlock} onChange={(next) => updateBlock(block.id, next)} />
                      ) : slug === "help" ? (
                        <HelpBlockFields block={block as HelpBlock} onChange={(next) => updateBlock(block.id, next)} />
                      ) : (
                        <MarketingBlockFields
                          block={block as MarketingBlock}
                          onChange={(next) => updateBlock(block.id, next)}
                        />
                      )}
                    </div>
                  ) : null}
                </article>
                );
              }}
            />
          </div>
          <div className="xl:sticky xl:top-4">
            <CmsPreviewFrame target={slug as CmsPreviewTarget} refreshToken={previewRefresh} />
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(slug: CmsPageSlug) {
  switch (slug) {
    case "about":
      return "About";
    case "help":
      return "Help";
    case "delivery":
      return "Delivery";
    case "returns":
      return "Returns";
    case "privacy":
      return "Privacy";
    case "terms":
      return "Terms";
    case "contact":
      return "Contact";
    case "bulk":
      return "Bulk";
    default:
      return slug;
  }
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
      {label}
      {hint ? <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-gray-400">{hint}</span> : null}
      <div className="mt-2 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:px-3 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:p-3">
        {children}
      </div>
    </label>
  );
}

function AboutBlockFields({ block, onChange }: { block: AboutBlock; onChange: (block: AboutBlock) => void }) {
  if (block.type === "hero") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="Small label above the headline">
          <input
            value={data.heroEyebrow}
            maxLength={120}
            onChange={(e) => onChange({ ...block, data: { ...data, heroEyebrow: e.target.value } })}
          />
        </Field>
        <Field label="Main headline (first part)">
          <input
            value={data.heroTitle}
            maxLength={240}
            onChange={(e) => onChange({ ...block, data: { ...data, heroTitle: e.target.value } })}
          />
        </Field>
        <Field label="Coloured word in the headline">
          <input
            value={data.heroTitleAccent}
            maxLength={80}
            onChange={(e) => onChange({ ...block, data: { ...data, heroTitleAccent: e.target.value } })}
          />
        </Field>
        <Field label="Headline ending">
          <input
            value={data.heroTitleSuffix}
            maxLength={160}
            onChange={(e) => onChange({ ...block, data: { ...data, heroTitleSuffix: e.target.value } })}
          />
        </Field>
        <Field label="Supporting paragraph">
          <textarea
            rows={3}
            maxLength={800}
            value={data.heroSubtitle}
            onChange={(e) => onChange({ ...block, data: { ...data, heroSubtitle: e.target.value } })}
          />
        </Field>
      </div>
    );
  }

  if (block.type === "who") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="Section title">
          <input value={data.whoTitle} maxLength={200} onChange={(e) => onChange({ ...block, data: { ...data, whoTitle: e.target.value } })} />
        </Field>
        <Field label="Story body">
          <textarea rows={4} maxLength={2000} value={data.whoBody} onChange={(e) => onChange({ ...block, data: { ...data, whoBody: e.target.value } })} />
        </Field>
        <Field label="Pull quote">
          <textarea rows={2} maxLength={400} value={data.quote} onChange={(e) => onChange({ ...block, data: { ...data, quote: e.target.value } })} />
        </Field>
        <div className="grid gap-3 md:grid-cols-3">
          {data.stats.map((stat, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <Field label={`Stat ${index + 1}`}>
                <input
                  value={stat.value}
                  maxLength={24}
                  onChange={(e) => {
                    const stats = data.stats.map((item, i) => (i === index ? { ...item, value: e.target.value } : item));
                    onChange({ ...block, data: { ...data, stats } });
                  }}
                />
              </Field>
              <Field label="Label">
                <input
                  value={stat.label}
                  maxLength={80}
                  onChange={(e) => {
                    const stats = data.stats.map((item, i) => (i === index ? { ...item, label: e.target.value } : item));
                    onChange({ ...block, data: { ...data, stats } });
                  }}
                />
              </Field>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "missionVision") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="Mission">
          <textarea rows={3} maxLength={800} value={data.mission} onChange={(e) => onChange({ ...block, data: { ...data, mission: e.target.value } })} />
        </Field>
        <Field label="Vision">
          <textarea rows={3} maxLength={800} value={data.vision} onChange={(e) => onChange({ ...block, data: { ...data, vision: e.target.value } })} />
        </Field>
      </div>
    );
  }

  if (block.type === "values") {
    const data = block.data;
    return (
      <div className="space-y-3">
        {data.values.map((value, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-gray-100 p-3 md:grid-cols-3">
            <Field label="Value name">
              <input
                value={value.title}
                maxLength={80}
                onChange={(e) => {
                  const values = data.values.map((item, i) => (i === index ? { ...item, title: e.target.value } : item));
                  onChange({ ...block, data: { values } });
                }}
              />
            </Field>
            <Field label="Short description">
              <input
                value={value.desc}
                maxLength={400}
                onChange={(e) => {
                  const values = data.values.map((item, i) => (i === index ? { ...item, desc: e.target.value } : item));
                  onChange({ ...block, data: { values } });
                }}
              />
            </Field>
            <Field label="Accent colour">
              <select
                value={VALUE_COLORS.some((c) => c.value === value.color) ? value.color : VALUE_COLORS[0].value}
                onChange={(e) => {
                  const values = data.values.map((item, i) => (i === index ? { ...item, color: e.target.value } : item));
                  onChange({ ...block, data: { values } });
                }}
                className="min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold"
              >
                {VALUE_COLORS.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ))}
      </div>
    );
  }

  const data = block.data;
  return (
    <div className="space-y-3">
      <Field label="CTA title">
        <input value={data.ctaTitle} maxLength={160} onChange={(e) => onChange({ ...block, data: { ...data, ctaTitle: e.target.value } })} />
      </Field>
      <Field label="CTA body">
        <textarea rows={2} maxLength={400} value={data.ctaBody} onChange={(e) => onChange({ ...block, data: { ...data, ctaBody: e.target.value } })} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Button text">
          <input value={data.ctaLabel} maxLength={80} onChange={(e) => onChange({ ...block, data: { ...data, ctaLabel: e.target.value } })} />
        </Field>
        <Field label="Button link">
          <input value={data.ctaHref} maxLength={200} onChange={(e) => onChange({ ...block, data: { ...data, ctaHref: e.target.value } })} />
        </Field>
      </div>
    </div>
  );
}

function HelpBlockFields({ block, onChange }: { block: HelpBlock; onChange: (block: HelpBlock) => void }) {
  if (block.type === "helpHeader") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="Page title">
          <input value={data.title} maxLength={160} onChange={(e) => onChange({ ...block, data: { ...data, title: e.target.value } })} />
        </Field>
        <Field label="Subtitle">
          <textarea rows={2} maxLength={400} value={data.subtitle} onChange={(e) => onChange({ ...block, data: { ...data, subtitle: e.target.value } })} />
        </Field>
        <Field label="Support hours note">
          <textarea
            rows={2}
            maxLength={400}
            value={data.supportBlurb}
            onChange={(e) => onChange({ ...block, data: { ...data, supportBlurb: e.target.value } })}
          />
        </Field>
      </div>
    );
  }

  const data = block.data;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Group name">
          <input value={data.label} maxLength={80} onChange={(e) => onChange({ ...block, data: { ...data, label: e.target.value } })} />
        </Field>
        <Field label="Emoji icon">
          <input value={data.icon} maxLength={12} onChange={(e) => onChange({ ...block, data: { ...data, icon: e.target.value } })} />
        </Field>
        <Field label="Internal id">
          <input value={data.id} disabled className="bg-gray-50 text-gray-400" />
        </Field>
      </div>
      {data.faqs.map((faq, faqIndex) => (
        <div key={faqIndex} className="space-y-3 rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Question {faqIndex + 1}</p>
            <button
              type="button"
              className="text-xs font-black text-red-600 disabled:opacity-40"
              disabled={data.faqs.length <= 1}
              onClick={() =>
                onChange({
                  ...block,
                  data: { ...data, faqs: data.faqs.filter((_, j) => j !== faqIndex) },
                })
              }
            >
              Remove
            </button>
          </div>
          <Field label="Question">
            <input
              value={faq.question}
              maxLength={240}
              onChange={(e) => {
                const faqs = data.faqs.map((entry, j) => (j === faqIndex ? { ...entry, question: e.target.value } : entry));
                onChange({ ...block, data: { ...data, faqs } });
              }}
            />
          </Field>
          <Field label="Answer">
            <textarea
              rows={3}
              maxLength={2000}
              value={faq.answer}
              onChange={(e) => {
                const faqs = data.faqs.map((entry, j) => (j === faqIndex ? { ...entry, answer: e.target.value } : entry));
                onChange({ ...block, data: { ...data, faqs } });
              }}
            />
          </Field>
        </div>
      ))}
      <button
        type="button"
        className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black disabled:opacity-40"
        disabled={data.faqs.length >= 20}
        onClick={() =>
          onChange({
            ...block,
            data: { ...data, faqs: [...data.faqs, { question: "New question", answer: "New answer" }] },
          })
        }
      >
        Add FAQ
      </button>
    </div>
  );
}

function MarketingBlockFields({
  block,
  onChange,
}: {
  block: MarketingBlock;
  onChange: (block: MarketingBlock) => void;
}) {
  if (block.type === "pageHeader") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="Page title">
          <input value={data.title} maxLength={160} onChange={(e) => onChange({ ...block, data: { ...data, title: e.target.value } })} />
        </Field>
        <Field label="Subtitle">
          <textarea
            rows={3}
            maxLength={600}
            value={data.subtitle}
            onChange={(e) => onChange({ ...block, data: { ...data, subtitle: e.target.value } })}
          />
        </Field>
      </div>
    );
  }

  if (block.type === "callout") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="Highlight title">
          <input value={data.title} maxLength={120} onChange={(e) => onChange({ ...block, data: { ...data, title: e.target.value } })} />
        </Field>
        <Field label="Highlight body">
          <textarea
            rows={3}
            maxLength={1200}
            value={data.body}
            onChange={(e) => onChange({ ...block, data: { ...data, body: e.target.value } })}
          />
        </Field>
        <Field label="Tone">
          <select
            value={data.tone}
            onChange={(e) =>
              onChange({
                ...block,
                data: { ...data, tone: e.target.value as "green" | "amber" | "neutral" },
              })
            }
            className="min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold"
          >
            <option value="green">Green</option>
            <option value="amber">Amber</option>
            <option value="neutral">Neutral</option>
          </select>
        </Field>
      </div>
    );
  }

  if (block.type === "bullets") {
    const data = block.data;
    return (
      <div className="space-y-3">
        <Field label="List heading">
          <input
            value={data.heading}
            maxLength={160}
            onChange={(e) => onChange({ ...block, data: { ...data, heading: e.target.value } })}
          />
        </Field>
        {data.items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Field label={`Bullet ${index + 1}`}>
              <input
                value={item}
                maxLength={400}
                onChange={(e) => {
                  const items = data.items.map((entry, i) => (i === index ? e.target.value : entry));
                  onChange({ ...block, data: { ...data, items } });
                }}
              />
            </Field>
            <button
              type="button"
              className="mt-7 h-11 rounded-xl px-3 text-xs font-black text-red-600 disabled:opacity-40"
              disabled={data.items.length <= 1}
              onClick={() =>
                onChange({
                  ...block,
                  data: { ...data, items: data.items.filter((_, i) => i !== index) },
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black disabled:opacity-40"
          disabled={data.items.length >= 20}
          onClick={() => onChange({ ...block, data: { ...data, items: [...data.items, "New point"] } })}
        >
          Add bullet
        </button>
      </div>
    );
  }

  const data = block.data;
  return (
    <div className="space-y-3">
      <Field label="Section heading">
        <input
          value={data.heading}
          maxLength={160}
          onChange={(e) => onChange({ ...block, data: { ...data, heading: e.target.value } })}
        />
      </Field>
      <Field label="Body" hint="Blank line starts a new paragraph">
        <textarea
          rows={6}
          maxLength={8000}
          value={data.body}
          onChange={(e) => onChange({ ...block, data: { ...data, body: e.target.value } })}
        />
      </Field>
    </div>
  );
}
