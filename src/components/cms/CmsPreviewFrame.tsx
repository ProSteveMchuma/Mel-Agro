"use client";

import { useState } from "react";

export type CmsPreviewTarget =
  | "home"
  | "about"
  | "help"
  | "home-below"
  | "delivery"
  | "returns"
  | "privacy"
  | "terms"
  | "contact"
  | "bulk";

type Props = {
  target: CmsPreviewTarget;
  /** Bump to force iframe reload after Save draft / Publish. */
  refreshToken?: number;
  className?: string;
};

export default function CmsPreviewFrame({ target, refreshToken = 0, className = "" }: Props) {
  const [mode, setMode] = useState<"draft" | "live">("draft");
  const [manualRefresh, setManualRefresh] = useState(0);
  const src = `/preview/${target}?mode=${mode}&r=${refreshToken}-${manualRefresh}`;

  return (
    <div className={`flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
          <ModeButton active={mode === "draft"} onClick={() => setMode("draft")}>
            Draft
          </ModeButton>
          <ModeButton active={mode === "live"} onClick={() => setMode("live")}>
            Live
          </ModeButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setManualRefresh((value) => value + 1)}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-green-300"
          >
            Refresh
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black leading-9 text-slate-700 hover:border-green-300"
          >
            Open tab →
          </a>
        </div>
      </div>
      <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
        {mode === "draft"
          ? "Showing the last saved draft. Save draft to refresh unsaved form edits."
          : "Showing what shoppers see on the live site right now."}
      </p>
      <iframe
        key={src}
        title={`CMS ${mode} preview — ${target}`}
        src={src}
        className="min-h-[32rem] w-full flex-1 bg-white"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 rounded-md px-3 text-xs font-black ${
        active ? "bg-gray-950 text-white" : "bg-transparent text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
