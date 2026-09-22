import Link from "next/link";

export default function PreviewChrome({
  mode,
  label,
  children,
}: {
  mode: "draft" | "live";
  label: string;
  children: React.ReactNode;
}) {
  const isDraft = mode === "draft";
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <div
        className={`sticky top-0 z-[200] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 text-center text-[11px] font-black uppercase tracking-widest ${
          isDraft ? "bg-amber-500 text-amber-950" : "bg-emerald-700 text-white"
        }`}
      >
        <span>
          {isDraft ? "Draft preview" : "Live preview"} · {label} · Staff only
        </span>
        <Link href="/dashboard/admin/cms" className="underline decoration-2 underline-offset-2">
          Back to CMS
        </Link>
      </div>
      {children}
    </div>
  );
}

export function parsePreviewMode(value: string | string[] | undefined): "draft" | "live" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "live" ? "live" : "draft";
}
