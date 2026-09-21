"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { canAccessAdminPath } from "@/lib/admin-permissions";

type Result = { id: string; type: string; title: string; subtitle: string; href: string };

const ALL_QUICK_ACTIONS: Result[] = [
  { id: "quick:new-product", type: "Quick action", title: "Add a product", subtitle: "Create a new catalogue listing", href: "/dashboard/admin/products/new" },
  { id: "quick:new-order", type: "Quick action", title: "Create an order", subtitle: "Enter a customer order manually", href: "/dashboard/admin/orders/create" },
  { id: "quick:returns", type: "Quick action", title: "Open Returns desk", subtitle: "Approve or reject return requests", href: "/dashboard/admin/returns" },
  { id: "quick:alerts", type: "Quick action", title: "Open Action Centre", subtitle: "Review operational alerts", href: "/dashboard/admin/action-centre" },
  { id: "quick:analytics", type: "Navigation", title: "Revenue analytics", subtitle: "Traffic, searches, and paid orders", href: "/dashboard/admin/analytics" },
  { id: "quick:messages", type: "Navigation", title: "Customer messages", subtitle: "Reply to support conversations", href: "/dashboard/admin/messages" },
  { id: "quick:settings", type: "Navigation", title: "Store settings", subtitle: "Payments, shipping and documents", href: "/dashboard/admin/settings" },
];

export default function AdminCommandCentre() {
  const { user } = useAuth();
  const allowedActions = useMemo(
    () => ALL_QUICK_ACTIONS.filter((item) => canAccessAdminPath(user?.role, user?.adminPermissions, item.href)),
    [user?.role, user?.adminPermissions],
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>(allowedActions);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults(allowedActions);
    }
  }, [open, allowedActions]);

  useEffect(() => {
    setActive(0);
    if (query.trim().length < 2) {
      setResults(allowedActions);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        setResults(response.ok ? data.results || [] : []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, allowedActions]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    }
    if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      setOpen(false);
      router.push(results[active].href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-h-11 w-full max-w-md items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 text-left text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/15 sm:flex"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <span className="flex-grow">Search orders, products, customers…</span>
        <kbd className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-400">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search admin"
        className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 sm:hidden"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/55 px-3 pt-[8vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-label="Admin command centre" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search by order ID, phone, SKU, name or M-Pesa receipt…"
                className="h-16 flex-grow border-0 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                aria-activedescendant={results[active]?.id}
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-500">
                ESC
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading ? (
                <p className="p-8 text-center text-sm text-gray-500">Searching Mel-Agri…</p>
              ) : results.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-bold text-gray-800">No results found</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {query.trim().length < 2
                      ? "No quick actions are available on your staff profile."
                      : "Try an order ID, customer phone, SKU or M-Pesa receipt."}
                  </p>
                </div>
              ) : (
                results.map((result, index) => (
                  <Link
                    id={result.id}
                    key={result.id}
                    href={result.href}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-4 rounded-xl px-4 py-3 ${index === active ? "bg-green-50" : "hover:bg-gray-50"}`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        result.type === "Order"
                          ? "bg-blue-500"
                          : result.type === "Product"
                            ? "bg-orange-500"
                            : result.type === "Customer"
                              ? "bg-purple-500"
                              : result.type === "Payment"
                                ? "bg-green-600"
                                : "bg-gray-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-grow">
                      <span className="block truncate font-bold text-gray-900">{result.title}</span>
                      <span className="block truncate text-xs text-gray-500">{result.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-gray-400">{result.type}</span>
                  </Link>
                ))
              )}
            </div>
            <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3 text-[10px] font-bold text-gray-400">
              <span>↑↓ Navigate · Enter open · Esc close</span>
              <span>Actions match your staff profile</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
