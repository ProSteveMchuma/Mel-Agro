"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import {
  AboutPageContent,
  CMS_PAGE_SLUGS,
  CmsPageSlug,
  contentFieldsEqual,
  DEFAULT_ABOUT_PAGE,
  HelpPageContent,
} from "@/lib/cms-pages";

type DraftState = AboutPageContent | HelpPageContent;

export default function CmsPagesAdminPage() {
  const [slug, setSlug] = useState<CmsPageSlug>("about");
  const [draft, setDraft] = useState<DraftState>(DEFAULT_ABOUT_PAGE);
  const [live, setLive] = useState<DraftState>(DEFAULT_ABOUT_PAGE);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
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

  const changed = useMemo(() => !contentFieldsEqual(draft, live), [draft, live]);

  async function persist(action: "saveDraft" | "publish") {
    if (action === "publish" && !window.confirm(`Publish this ${slug} draft to the live site now?`)) return;
    setSaving(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
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
      toast.success(action === "publish" ? `${labelFor(slug)} published` : "Draft saved");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Content update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Publishing</p>
          <h1 className="text-2xl font-black text-gray-950">Site pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Edit About and Help drafts, then publish when ready.{" "}
            <Link href="/dashboard/admin/cms" className="font-bold text-melagri-primary hover:underline">
              Homepage banners →
            </Link>
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          {CMS_PAGE_SLUGS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSlug(item)}
              className={`min-h-11 rounded-xl px-4 text-sm font-black capitalize ${
                slug === item ? "bg-gray-950 text-white" : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              {labelFor(item)}
            </button>
          ))}
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

      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          changed ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        {changed ? "Draft has unpublished changes." : "Draft matches the live page."}{" "}
        <span className="font-normal">
          Revision {version} · editing {labelFor(slug)}
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
      ) : slug === "about" ? (
        <AboutEditor draft={draft as AboutPageContent} onChange={setDraft} />
      ) : (
        <HelpEditor draft={draft as HelpPageContent} onChange={setDraft} />
      )}
    </div>
  );
}

function labelFor(slug: CmsPageSlug) {
  return slug === "about" ? "About" : "Help";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
      {label}
      <div className="mt-2 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-200 [&_input]:px-3 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-gray-200 [&_textarea]:p-3">
        {children}
      </div>
    </label>
  );
}

function AboutEditor({
  draft,
  onChange,
}: {
  draft: AboutPageContent;
  onChange: (value: AboutPageContent) => void;
}) {
  const update = (patch: Partial<AboutPageContent>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <Section title="Hero">
        <Field label="Eyebrow">
          <input value={draft.heroEyebrow} maxLength={120} onChange={(e) => update({ heroEyebrow: e.target.value })} />
        </Field>
        <Field label="Title">
          <input value={draft.heroTitle} maxLength={240} onChange={(e) => update({ heroTitle: e.target.value })} />
        </Field>
        <Field label="Accent word">
          <input value={draft.heroTitleAccent} maxLength={80} onChange={(e) => update({ heroTitleAccent: e.target.value })} />
        </Field>
        <Field label="Title suffix">
          <input value={draft.heroTitleSuffix} maxLength={160} onChange={(e) => update({ heroTitleSuffix: e.target.value })} />
        </Field>
        <Field label="Subtitle">
          <textarea rows={3} maxLength={800} value={draft.heroSubtitle} onChange={(e) => update({ heroSubtitle: e.target.value })} />
        </Field>
      </Section>

      <Section title="Who we are">
        <Field label="Title">
          <input value={draft.whoTitle} maxLength={200} onChange={(e) => update({ whoTitle: e.target.value })} />
        </Field>
        <Field label="Body">
          <textarea rows={4} maxLength={2000} value={draft.whoBody} onChange={(e) => update({ whoBody: e.target.value })} />
        </Field>
        <Field label="Quote">
          <textarea rows={2} maxLength={400} value={draft.quote} onChange={(e) => update({ quote: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          {draft.stats.map((stat, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <Field label={`Stat ${index + 1} value`}>
                <input
                  value={stat.value}
                  maxLength={24}
                  onChange={(e) => {
                    const stats = draft.stats.map((item, i) => (i === index ? { ...item, value: e.target.value } : item));
                    update({ stats });
                  }}
                />
              </Field>
              <Field label="Label">
                <input
                  value={stat.label}
                  maxLength={80}
                  onChange={(e) => {
                    const stats = draft.stats.map((item, i) => (i === index ? { ...item, label: e.target.value } : item));
                    update({ stats });
                  }}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Mission & vision">
        <Field label="Mission">
          <textarea rows={3} maxLength={800} value={draft.mission} onChange={(e) => update({ mission: e.target.value })} />
        </Field>
        <Field label="Vision">
          <textarea rows={3} maxLength={800} value={draft.vision} onChange={(e) => update({ vision: e.target.value })} />
        </Field>
      </Section>

      <Section title="Values">
        {draft.values.map((value, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-gray-100 p-3 md:grid-cols-3">
            <Field label="Title">
              <input
                value={value.title}
                maxLength={80}
                onChange={(e) => {
                  const values = draft.values.map((item, i) => (i === index ? { ...item, title: e.target.value } : item));
                  update({ values });
                }}
              />
            </Field>
            <Field label="Description">
              <input
                value={value.desc}
                maxLength={400}
                onChange={(e) => {
                  const values = draft.values.map((item, i) => (i === index ? { ...item, desc: e.target.value } : item));
                  update({ values });
                }}
              />
            </Field>
            <Field label="Color class">
              <input
                value={value.color}
                maxLength={80}
                onChange={(e) => {
                  const values = draft.values.map((item, i) => (i === index ? { ...item, color: e.target.value } : item));
                  update({ values });
                }}
              />
            </Field>
          </div>
        ))}
      </Section>

      <Section title="Call to action">
        <Field label="Title">
          <input value={draft.ctaTitle} maxLength={160} onChange={(e) => update({ ctaTitle: e.target.value })} />
        </Field>
        <Field label="Body">
          <textarea rows={2} maxLength={400} value={draft.ctaBody} onChange={(e) => update({ ctaBody: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Button label">
            <input value={draft.ctaLabel} maxLength={80} onChange={(e) => update({ ctaLabel: e.target.value })} />
          </Field>
          <Field label="Button link">
            <input value={draft.ctaHref} maxLength={200} onChange={(e) => update({ ctaHref: e.target.value })} />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function HelpEditor({
  draft,
  onChange,
}: {
  draft: HelpPageContent;
  onChange: (value: HelpPageContent) => void;
}) {
  const update = (patch: Partial<HelpPageContent>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <Section title="Page header">
        <Field label="Title">
          <input value={draft.title} maxLength={160} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label="Subtitle">
          <textarea rows={2} maxLength={400} value={draft.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
        </Field>
        <Field label="Support blurb">
          <textarea rows={2} maxLength={400} value={draft.supportBlurb} onChange={(e) => update({ supportBlurb: e.target.value })} />
        </Field>
      </Section>

      {draft.categories.map((category, categoryIndex) => (
        <Section key={category.id} title={`Category: ${category.label}`}>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Label">
              <input
                value={category.label}
                maxLength={80}
                onChange={(e) => {
                  const categories = draft.categories.map((item, i) =>
                    i === categoryIndex ? { ...item, label: e.target.value } : item,
                  );
                  update({ categories });
                }}
              />
            </Field>
            <Field label="Icon">
              <input
                value={category.icon}
                maxLength={12}
                onChange={(e) => {
                  const categories = draft.categories.map((item, i) =>
                    i === categoryIndex ? { ...item, icon: e.target.value } : item,
                  );
                  update({ categories });
                }}
              />
            </Field>
            <Field label="Id">
              <input value={category.id} disabled className="bg-gray-50 text-gray-400" />
            </Field>
          </div>

          {category.faqs.map((faq, faqIndex) => (
            <div key={`${category.id}-${faqIndex}`} className="space-y-3 rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">FAQ {faqIndex + 1}</p>
                <button
                  type="button"
                  className="text-xs font-black text-red-600 disabled:opacity-40"
                  disabled={category.faqs.length <= 1}
                  onClick={() => {
                    const categories = draft.categories.map((item, i) =>
                      i === categoryIndex
                        ? { ...item, faqs: item.faqs.filter((_, j) => j !== faqIndex) }
                        : item,
                    );
                    update({ categories });
                  }}
                >
                  Remove
                </button>
              </div>
              <Field label="Question">
                <input
                  value={faq.question}
                  maxLength={240}
                  onChange={(e) => {
                    const categories = draft.categories.map((item, i) => {
                      if (i !== categoryIndex) return item;
                      const faqs = item.faqs.map((entry, j) =>
                        j === faqIndex ? { ...entry, question: e.target.value } : entry,
                      );
                      return { ...item, faqs };
                    });
                    update({ categories });
                  }}
                />
              </Field>
              <Field label="Answer">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={faq.answer}
                  onChange={(e) => {
                    const categories = draft.categories.map((item, i) => {
                      if (i !== categoryIndex) return item;
                      const faqs = item.faqs.map((entry, j) =>
                        j === faqIndex ? { ...entry, answer: e.target.value } : entry,
                      );
                      return { ...item, faqs };
                    });
                    update({ categories });
                  }}
                />
              </Field>
            </div>
          ))}

          <button
            type="button"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black disabled:opacity-40"
            disabled={category.faqs.length >= 20}
            onClick={() => {
              const categories = draft.categories.map((item, i) =>
                i === categoryIndex
                  ? { ...item, faqs: [...item.faqs, { question: "New question", answer: "New answer" }] }
                  : item,
              );
              update({ categories });
            }}
          >
            Add FAQ
          </button>
        </Section>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
