"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import type { Product } from "@/types";

type InventoryProduct = Product & { totalSold30d: number; dailyVelocity: number };

export default function InventoryManagement() {
  const router = useRouter();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [risk, setRisk] = useState("all");
  const [filterBrand, setFilterBrand] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const params = new URLSearchParams({ risk });
        if (searchTerm.trim()) params.set("q", searchTerm.trim());
        if (filterBrand !== "All") params.set("brand", filterBrand);
        if (minPrice.trim()) params.set("minPrice", minPrice.trim());
        if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/inventory?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load inventory.");
        setProducts(result.products || []);
        setNextCursor(result.nextCursor || null);
        setSearchLimited(Boolean(result.searchLimited));
        setBrands((current) => Array.from(new Set([...current, ...(result.brands || [])])).sort());
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Could not load inventory.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, searchTerm || minPrice || maxPrice ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, risk, filterBrand, minPrice, maxPrice, cursor, refreshKey]);

  function resetPage() {
    setCursor(null);
    setCursorHistory([]);
  }

  async function adjustStock(product: InventoryProduct, adjustment: number) {
    const id = String(product.id);
    setPendingId(id);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: id,
          adjustment,
          reason: `Quick adjustment ${adjustment > 0 ? "+" : ""}${adjustment}`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not adjust stock.");
      setProducts((current) =>
        current.map((item) =>
          String(item.id) === id ? { ...item, stockQuantity: result.newStock, inStock: result.newStock > 0 } : item,
        ),
      );
      toast.success(`Stock updated to ${result.newStock}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not adjust stock.");
    } finally {
      setPendingId(null);
    }
  }

  const hasExtraFilters = filterBrand !== "All" || Boolean(minPrice.trim()) || Boolean(maxPrice.trim());

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Catalogue operations</p>
        <h1 className="text-2xl font-black text-gray-950">Inventory management</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor stock cover and make atomic, audited adjustments.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search inventory</span>
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
              />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                resetPage();
              }}
              placeholder="Product name, code, brand or category"
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10"
            />
          </label>
          <label>
            <span className="sr-only">Stock status</span>
            <select
              value={risk}
              onChange={(event) => {
                setRisk(event.target.value);
                resetPage();
              }}
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold md:min-w-[11rem]"
            >
              <option value="all">All stock levels</option>
              <option value="out">Out of stock</option>
              <option value="low">Low stock</option>
              <option value="healthy">Healthy stock</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Brand</span>
            <select
              value={filterBrand}
              onChange={(event) => {
                setFilterBrand(event.target.value);
                resetPage();
              }}
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold md:min-w-[11rem]"
            >
              <option value="All">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Min price (KES)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              value={minPrice}
              onChange={(event) => {
                setMinPrice(event.target.value);
                resetPage();
              }}
              placeholder="0"
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Max price (KES)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              value={maxPrice}
              onChange={(event) => {
                setMaxPrice(event.target.value);
                resetPage();
              }}
              placeholder="Any"
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10"
            />
          </label>
          {hasExtraFilters ? (
            <button
              type="button"
              onClick={() => {
                setFilterBrand("All");
                setMinPrice("");
                setMaxPrice("");
                resetPage();
              }}
              className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-600 hover:border-green-300"
            >
              Clear brand / price
            </button>
          ) : null}
        </div>
      </section>

      {searchLimited && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          This broad filter checked the next 600 products. Add a product name, code, brand, or price range to narrow it.
        </p>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{" "}
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ml-2 font-black underline">
            Retry
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Current stock</th>
                <th className="px-6 py-4">Sales velocity (30d)</th>
                <th className="px-6 py-4">Intelligence alert</th>
                <th className="px-6 py-4 text-right">Quick adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading &&
                products.map((product) => {
                  const stock = Number(product.stockQuantity || 0);
                  const velocity = Number(product.dailyVelocity || 0);
                  const totalSold = Number(product.totalSold30d || 0);
                  const daysRemaining = velocity > 0 ? Math.floor(stock / velocity) : Infinity;
                  const runOutDate =
                    daysRemaining < 365
                      ? new Date(Date.now() + daysRemaining * 86400000).toLocaleDateString()
                      : "Stable";
                  const busy = pendingId === String(product.id);
                  return (
                    <tr
                      key={product.id}
                      onClick={() => router.push(`/dashboard/admin/products/edit/${product.id}`)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <Image
                              src={
                                typeof product.image === "string" && product.image.startsWith("http")
                                  ? product.image
                                  : "https://placehold.co/100x100?text=No+Image"
                              }
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{product.name}</p>
                            <p className="text-[10px] font-bold uppercase text-gray-400">
                              {product.productCode || product.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">{product.brand || "—"}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        KES {Number(product.price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-black text-gray-950">{stock}</span>
                        <span className="ml-1 text-xs text-gray-400">units</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-700">{totalSold} units</p>
                        <p className="text-[10px] font-black uppercase text-gray-400">Avg {velocity.toFixed(1)}/day</p>
                      </td>
                      <td className="px-6 py-4">
                        {stock === 0 ? (
                          <Badge tone="red">Empty</Badge>
                        ) : daysRemaining <= 7 ? (
                          <Badge tone="red">Runs out: {runOutDate}</Badge>
                        ) : daysRemaining <= 14 ? (
                          <Badge tone="orange">Runs out: {runOutDate}</Badge>
                        ) : totalSold > 10 ? (
                          <Badge tone="blue">High demand</Badge>
                        ) : (
                          <Badge tone="gray">Steady</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {[-10, -1, 1, 10].map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              disabled={busy || stock + amount < 0}
                              onClick={() => adjustStock(product, amount)}
                              className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35 ${
                                amount < 0
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {amount > 0 ? `+${amount}` : amount}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="p-16 text-center text-sm font-semibold text-gray-500">Loading inventory intelligence…</div>
        ) : products.length === 0 && !error ? (
          <div className="p-16 text-center">
            <p className="font-black text-gray-900">No inventory records found</p>
            <p className="mt-1 text-sm text-gray-500">Try clearing the search or changing brand, price, or stock filters.</p>
          </div>
        ) : !error ? (
          <footer className="flex items-center justify-between border-t border-gray-100 px-4 py-4 text-sm text-gray-500">
            <span>
              Page {cursorHistory.length + 1} · showing {products.length} products
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={cursorHistory.length === 0}
                onClick={() =>
                  setCursorHistory((history) => {
                    const copy = [...history];
                    setCursor(copy.pop() ?? null);
                    return copy;
                  })
                }
                className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!nextCursor}
                onClick={() => {
                  if (nextCursor) {
                    setCursorHistory((history) => [...history, cursor]);
                    setCursor(nextCursor);
                  }
                }}
                className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

function Badge({ tone, children }: { tone: "red" | "orange" | "blue" | "gray"; children: React.ReactNode }) {
  const styles = {
    red: "border-red-100 bg-red-50 text-red-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    gray: "border-gray-100 bg-gray-50 text-gray-500",
  };
  return (
    <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${styles[tone]}`}>
      {children}
    </span>
  );
}
