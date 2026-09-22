"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccessAdminPath } from "@/lib/admin-permissions";

const checklist = [
  { id: "payments", label: "Verify production payment settings", href: "/dashboard/admin/settings/mpesa" },
  { id: "returns", label: "Clear pending return requests", href: "/dashboard/admin/returns" },
  { id: "shipping", label: "Review delivery zones and charges", href: "/dashboard/admin/logistics" },
  { id: "catalogue", label: "Resolve catalogue and stock alerts", href: "/dashboard/admin/products" },
  { id: "automation", label: "Review automation thresholds", href: "/dashboard/admin/automations" },
  { id: "staff", label: "Assign staff access profiles", href: "/dashboard/admin/users" },
  { id: "cms", label: "Review homepage / About / Help drafts", href: "/dashboard/admin/cms" },
] as const;

const guidance = [
  { match: /\/orders\//, title: "Order workspace", body: "Verify payment before dispatch. Use the timeline and internal notes to leave an auditable handover." },
  { match: /\/orders$/, title: "Order queue", body: "Use saved views for daily queues. Bulk changes are best for orders that share the same verified state." },
  { match: /\/products|\/inventory/, title: "Catalogue operations", body: "Filter by brand and price range to find stock faster. Check variants as well as product-level stock before archiving or replenishing a listing." },
  { match: /\/payments|\/mpesa/, title: "Payment operations", body: "Match receipt, amount, and phone before manually linking or approving an M-Pesa payment." },
  { match: /\/analytics|\/reports/, title: "Analytics workspace", body: "Save common time windows, set targets, and export the current filtered period for offline review." },
  { match: /\/automations/, title: "Automation safety", body: "Start in alert-only mode. Review generated work in the Action Centre before enabling assisted workflows." },
  { match: /\/cms/, title: "Website content", body: "Edit drafts for homepage banners, About, and Help. Drag sections or slides to reorder. Use Draft/Live preview on the right — shoppers only see changes after Publish." },
  { match: /\/users/, title: "People and staff", body: "Customers sign up on the shop first. Super-admins use “Make someone staff” (or the Role column) to promote them, then assign a staff profile for least privilege." },
];

export default function AdminHelpDrawer() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  const visibleChecklist = useMemo(
    () => checklist.filter((item) => canAccessAdminPath(user?.role, user?.adminPermissions, item.href)),
    [user?.role, user?.adminPermissions],
  );

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem("melagri_admin_onboarding") || "[]"));
    } catch {
      setDone([]);
    }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key === "?" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => closeRef.current?.focus(), 0);
  }, [open]);

  const context = useMemo(
    () =>
      guidance.find((item) => item.match.test(pathname)) || {
        title: "Admin overview",
        body: "Start with urgent Action Centre signals, then work through the tools your staff profile can access.",
      },
    [pathname],
  );

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
    setDone(next);
    localStorage.setItem("melagri_admin_onboarding", JSON.stringify(next));
  };

  const doneVisible = visibleChecklist.filter((item) => done.includes(item.id)).length;
  const remaining = visibleChecklist.length - doneVisible;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open admin help${remaining ? `, ${remaining} setup tasks remaining` : ""}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
      >
        <span className="text-lg font-black">?</span>
        {remaining > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[110] bg-slate-950/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <aside role="dialog" aria-modal="true" aria-label="Admin help and setup" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-gray-50 shadow-2xl">
            <header className="flex items-start justify-between border-b border-gray-200 bg-white p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-green-700">Help & readiness</p>
                <h2 className="mt-1 text-xl font-black text-gray-950">Admin field guide</h2>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close admin help" className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-gray-500 hover:bg-gray-100">
                ×
              </button>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <section className="rounded-2xl bg-gray-950 p-5 text-white">
                <p className="text-[10px] font-black uppercase tracking-wider text-green-400">On this screen</p>
                <h3 className="mt-2 font-black">{context.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">{context.body}</p>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Production checklist</p>
                    <h3 className="mt-1 font-black text-gray-950">
                      {visibleChecklist.length === 0
                        ? "No setup tasks on your profile"
                        : remaining
                          ? `${remaining} tasks remaining`
                          : "Setup complete"}
                    </h3>
                  </div>
                  {visibleChecklist.length > 0 && (
                    <span className="text-xs font-black text-green-700">
                      {doneVisible}/{visibleChecklist.length}
                    </span>
                  )}
                </div>
                {visibleChecklist.length > 0 && (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-green-600 transition-[width]" style={{ width: `${(doneVisible / visibleChecklist.length) * 100}%` }} />
                    </div>
                    <div className="mt-4 space-y-2">
                      {visibleChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2">
                          <button
                            type="button"
                            onClick={() => toggle(item.id)}
                            aria-label={`${done.includes(item.id) ? "Mark incomplete" : "Mark complete"}: ${item.label}`}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${done.includes(item.id) ? "border-green-600 bg-green-600 text-white" : "border-gray-300 text-transparent"}`}
                          >
                            ✓
                          </button>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`min-h-10 flex-1 py-2 text-sm font-bold ${done.includes(item.id) ? "text-gray-400 line-through" : "text-gray-800 hover:text-green-700"}`}
                          >
                            {item.label}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Keyboard shortcuts</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-semibold text-gray-600">Global search</dt>
                    <dd>
                      <kbd className="rounded border bg-gray-50 px-2 py-1 text-xs font-black">Ctrl K</kbd>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-gray-600">Open this guide</dt>
                    <dd>
                      <kbd className="rounded border bg-gray-50 px-2 py-1 text-xs font-black">?</kbd>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-gray-600">Close dialogs</dt>
                    <dd>
                      <kbd className="rounded border bg-gray-50 px-2 py-1 text-xs font-black">Esc</kbd>
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black text-amber-900">Before irreversible actions</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">Confirm the customer, order or payment reference and expected financial effect. Never approve from a screenshot alone.</p>
              </section>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
