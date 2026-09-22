"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import CmsPreviewFrame from "@/components/cms/CmsPreviewFrame";
import SortableBlockList from "@/components/cms/SortableBlockList";

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  image: string;
  link: string;
  active: boolean;
};

const blank = (): Banner => ({
  id: crypto.randomUUID(),
  title: "",
  subtitle: "",
  description: "",
  image: "",
  link: "/products",
  active: false,
});

export default function CMSPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [liveBanners, setLiveBanners] = useState<Banner[]>([]);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewRefresh, setPreviewRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const response = await fetch("/api/admin/content", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setBanners(result.draft.banners || []);
        setLiveBanners(result.live.banners || []);
        setVersion(result.draft.version || 0);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Could not load homepage content.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [refreshKey]);

  async function persist(action: "saveDraft" | "publish") {
    if (action === "publish" && !window.confirm("Publish this draft to the live homepage now?")) return;
    setSaving(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, version, banners }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setVersion(result.version);
      if (action === "publish") setLiveBanners(banners);
      setPreviewRefresh((value) => value + 1);
      toast.success(action === "publish" ? "Homepage published" : "Draft saved");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Content update failed.");
    } finally {
      setSaving(false);
    }
  }

  function discardDraft() {
    if (!window.confirm("Throw away draft changes and reload the live homepage banners?")) return;
    setBanners(liveBanners);
    toast.success("Draft reset to live banners");
  }

  function saveBanner(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBanners((current) =>
      current.some((item) => item.id === editing.id)
        ? current.map((item) => (item.id === editing.id ? editing : item))
        : [...current, editing],
    );
    setEditing(null);
  }

  const changed = JSON.stringify(banners) !== JSON.stringify(liveBanners);

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Website content</p>
        <h1 className="text-2xl font-black text-gray-950">Content you control</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Edit Mel-Agri pages here without a developer. Changes stay in a <strong className="font-semibold text-gray-700">draft</strong> until you click{" "}
          <strong className="font-semibold text-gray-700">Publish</strong> — then shoppers see them.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <HubCard
          active
          title="Homepage banners"
          body="Hero slides on the shop home page. Add images, titles, and Shop Now links."
          href="/dashboard/admin/cms"
        />
        <HubCard
          title="About Mel-Agri"
          body="Company story, mission, values, and call-to-action on /about."
          href="/dashboard/admin/cms/pages?slug=about"
        />
        <HubCard
          title="Help centre"
          body="FAQ categories and answers on /help — payments, delivery, returns."
          href="/dashboard/admin/cms/pages?slug=help"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-black text-slate-900">How publishing works</h2>
        <ol className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <li className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <span className="font-black text-green-700">1. Edit</span>
            <p className="mt-1">Change text or banners. Nothing goes live yet.</p>
          </li>
          <li className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <span className="font-black text-green-700">2. Save draft</span>
            <p className="mt-1">Keeps your work safe. Shoppers still see the old live version.</p>
          </li>
          <li className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <span className="font-black text-green-700">3. Publish</span>
            <p className="mt-1">Replaces the live page. You can reset a draft back to live anytime.</p>
          </li>
        </ol>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-gray-100 pt-6">
        <div>
          <h2 className="text-xl font-black text-gray-950">Homepage banners</h2>
          <p className="mt-1 text-sm text-gray-500">
            These rotate in the home hero. Drag to reorder slides. Need an image? Host it (HTTPS) and paste the URL — upload is not built in yet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/preview/home?mode=draft"
            target="_blank"
            rel="noreferrer"
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black leading-[2.75rem] text-gray-700 hover:border-green-300"
          >
            Preview draft →
          </a>
          <button
            type="button"
            disabled={saving || banners.length >= 8}
            onClick={() => setEditing(blank())}
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black disabled:opacity-40"
          >
            Add banner
          </button>
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

      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          changed ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"
        }`}
      >
        {changed ? "Draft has unpublished changes — shoppers still see the previous live banners." : "Draft matches the live homepage."}{" "}
        <span className="font-normal">
          Revision {version} · {banners.length}/8 banners
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

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <div className="space-y-4">
          {loading ? (
            <Empty>Loading homepage draft…</Empty>
          ) : banners.length === 0 ? (
            <Empty>No banners in this draft. Click Add banner to create the first slide.</Empty>
          ) : (
            <SortableBlockList
              items={banners}
              onReorder={setBanners}
              renderItem={(banner, handle) => {
                const index = banners.findIndex((item) => item.id === banner.id);
                return (
                  <article className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                    {handle}
                    <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 md:w-52">
                      {banner.image ? (
                        <Image src={banner.image} alt={banner.title} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">Image required</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-400">#{index + 1}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                            banner.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {banner.active ? "Visible when published" : "Hidden when published"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-black text-gray-950">{banner.title || "Untitled banner"}</h3>
                      <p className="text-sm text-gray-500">{banner.subtitle}</p>
                      <p className="mt-2 truncate text-xs text-blue-600">{banner.link}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBanners((current) =>
                            current.map((item) => (item.id === banner.id ? { ...item, active: !item.active } : item)),
                          )
                        }
                        className="rounded-lg border px-3 py-2 text-xs font-black"
                      >
                        {banner.active ? "Hide" : "Show"}
                      </button>
                      <button type="button" onClick={() => setEditing({ ...banner })} className="rounded-lg border px-3 py-2 text-xs font-black">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Remove this banner from the draft?")) {
                            setBanners((current) => current.filter((item) => item.id !== banner.id));
                          }
                        }}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              }}
            />
          )}
        </div>
        <div className="xl:sticky xl:top-4">
          <CmsPreviewFrame target="home" refreshToken={previewRefresh} />
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6">
            <h2 className="text-xl font-black">Banner draft</h2>
            <p className="mt-1 text-sm text-gray-500">Apply updates to the draft first, then Save draft or Publish above.</p>
            <form onSubmit={saveBanner} className="mt-5 space-y-4">
              <Field label="Headline" hint="Large text on the slide">
                <input required maxLength={100} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
              </Field>
              <Field label="Short line under the headline" hint="One sentence shoppers read next">
                <input maxLength={180} value={editing.subtitle} onChange={(event) => setEditing({ ...editing, subtitle: event.target.value })} />
              </Field>
              <Field label="Extra description" hint="Optional — longer supporting text">
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editing.description || ""}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                />
              </Field>
              <Field label="Image URL (HTTPS)" hint="Must start with https:// — paste a hosted image link">
                <input
                  required
                  type="url"
                  pattern="https://.*"
                  value={editing.image}
                  onChange={(event) => setEditing({ ...editing, image: event.target.value })}
                />
              </Field>
              <Field label="Button destination" hint="Where Shop Now goes — e.g. /products or /categories/seeds">
                <input
                  required
                  value={editing.link}
                  onChange={(event) => setEditing({ ...editing, link: event.target.value })}
                  placeholder="/products or https://…"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
                />
                Show this banner after publish
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 font-bold">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-gray-950 px-5 py-2 font-black text-white">
                  Apply to draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HubCard({
  title,
  body,
  href,
  active,
}: {
  title: string;
  body: string;
  href: string;
  active?: boolean;
}) {
  const className = `rounded-2xl border p-4 text-left transition-colors ${
    active
      ? "border-green-600 bg-green-50 ring-2 ring-green-600/20"
      : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40"
  }`;
  if (active) {
    return (
      <div className={className}>
        <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Editing now</p>
        <h2 className="mt-1 font-black text-gray-950">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{body}</p>
      </div>
    );
  }
  return (
    <Link href={href} className={className}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Open</p>
      <h2 className="mt-1 font-black text-gray-950">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{body}</p>
    </Link>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-black text-gray-600">
      {label}
      {hint ? <span className="mt-0.5 block text-[11px] font-medium normal-case tracking-normal text-gray-400">{hint}</span> : null}
      <div className="mt-2 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:px-3 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:p-3">
        {children}
      </div>
    </label>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center text-sm text-gray-500">{children}</div>;
}
