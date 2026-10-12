"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { skipImageOptimizer } from "@/lib/product-image";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import type { Product } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { nairobiPlacedLabel } from "@/lib/order-admin";
import { movementPackName, movementReason, type MovementRow } from "@/lib/inventory-movements";

type InventoryProduct = Product & { totalSold30d: number; dailyVelocity: number };

export default function InventoryManagement() {
  const { user } = useAuth();
  const canEditProduct = hasAdminPermission(user?.role, user?.adminPermissions, "catalogue.manage");
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState("");

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

  useEffect(() => {
    if (!openId) {
      setMovements([]);
      return;
    }
    const controller = new AbortController();
    (async () => {
      setMovementsLoading(true);
      setMovementsError("");
      try {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Admin session is unavailable.");
        const response = await fetch(`/api/admin/inventory?movements=${encodeURIComponent(openId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load stock movements.");
        setMovements(result.movements || []);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setMovementsError(caught instanceof Error ? caught.message : "Could not load stock movements.");
        }
      } finally {
        if (!controller.signal.aborted) setMovementsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [openId, refreshKey]);

  function resetPage() {
    setCursor(null);
    setCursorHistory([]);
  }

  async function postInventory(product: InventoryProduct, body: Record<string, unknown>, success: string) {
    const id = String(product.id);
    setPendingId(id);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Admin session is unavailable.");
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: id, ...body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update stock.");
      toast.success(result.restockSms ? `${success} ${result.restockSms} back-in-stock SMS sent.` : success);
      setRefreshKey((value) => value + 1);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update stock.");
    } finally {
      setPendingId(null);
    }
  }

  async function adjustStock(product: InventoryProduct, adjustment: number, variantId?: string, packName?: string, reason?: string) {
    await postInventory(
      product,
      {
        action: "adjust",
        adjustment,
        ...(variantId ? { variantId } : {}),
        reason: reason || (packName
          ? `Quick adjustment ${adjustment > 0 ? "+" : ""}${adjustment} (${packName})`
          : `Quick adjustment ${adjustment > 0 ? "+" : ""}${adjustment}`),
      },
      reason ? "Shelf count saved." : (packName ? `${packName} stock updated.` : "Stock updated."),
    );
  }

  async function receiveGoods(product: InventoryProduct) {
    await postInventory(product, { action: "receive" }, "Incoming stock is now on the shelf.");
  }

  const hasExtraFilters = filterBrand !== "All" || Boolean(minPrice.trim()) || Boolean(maxPrice.trim());

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Catalogue operations</p>
        <h1 className="text-2xl font-black text-gray-950">Inventory management</h1>
        <p className="mt-1 text-sm text-gray-500">Open a product to read its movements and save a shelf count. Pack +/− stays on the row.</p>
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
                  const packs = Array.isArray(product.variants) ? product.variants : [];
                  const stock = Number(product.stockQuantity || 0);
                  const velocity = Number(product.dailyVelocity || 0);
                  const totalSold = Number(product.totalSold30d || 0);
                  const daysRemaining = velocity > 0 ? Math.floor(stock / velocity) : Infinity;
                  const runOutDate =
                    daysRemaining < 365
                      ? new Date(Date.now() + daysRemaining * 86400000).toLocaleDateString()
                      : "Stable";
                  const busy = pendingId === String(product.id);
                  const imageSrc =
                    typeof product.image === "string" && product.image.startsWith("http")
                      ? product.image
                      : "https://placehold.co/100x100?text=No+Image";
                  return (
                    <Fragment key={product.id}>
                    <tr
                      onClick={() => setOpenId((current) => current === String(product.id) ? null : String(product.id))}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <Image
                              src={imageSrc}
                              alt={product.name}
                              fill
                              className="object-cover"
                              unoptimized={skipImageOptimizer(imageSrc)}
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
                        {packs.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {packs.map((pack) => (
                              <li key={pack.id} className="text-xs font-semibold text-gray-600">
                                {pack.name || "Pack"} · {Number(pack.stockQuantity ?? 0)}
                              </li>
                            ))}
                          </ul>
                        )}
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
                        <div className="flex flex-col items-end gap-2">
                          {Number(product.incomingStock || 0) > 0 && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => receiveGoods(product)}
                              className="h-9 rounded-lg bg-emerald-700 px-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-35"
                            >
                              Goods arrived ({Number(product.incomingStock)})
                            </button>
                          )}
                          {packs.length > 0 ? packs.map((pack) => {
                            const packStock = Number(pack.stockQuantity ?? 0);
                            return (
                              <div key={pack.id} className="flex items-center justify-end gap-2">
                                <span className="max-w-24 truncate text-[10px] font-black uppercase text-gray-500">{pack.name || "Pack"}</span>
                                {[-10, -1, 1, 10].map((amount) => (
                                  <button
                                    key={amount}
                                    type="button"
                                    disabled={busy || packStock + amount < 0}
                                    onClick={() => adjustStock(product, amount, String(pack.id), pack.name)}
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
                            );
                          }) : [-10, -1, 1, 10].map((amount) => (
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
                    {openId === String(product.id) ? (
                      <ProductDrawer
                        product={product}
                        canEditProduct={canEditProduct}
                        movements={movements}
                        loading={movementsLoading}
                        error={movementsError}
                        busy={busy}
                        onCount={(adjustment, reason, variantId, packName) => adjustStock(product, adjustment, variantId, packName, reason)}
                      />
                    ) : null}
                    </Fragment>
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

function ProductDrawer({
  product,
  canEditProduct,
  movements,
  loading,
  error,
  busy,
  onCount,
}: {
  product: InventoryProduct;
  canEditProduct: boolean;
  movements: MovementRow[];
  loading: boolean;
  error: string;
  busy: boolean;
  onCount: (adjustment: number, reason: string, variantId?: string, packName?: string) => void;
}) {
  const packs = Array.isArray(product.variants) ? product.variants : [];
  const [packId, setPackId] = useState(packs[0] ? String(packs[0].id) : "");
  const [shelf, setShelf] = useState("");
  const [reason, setReason] = useState("counted");
  const pack = packs.find((item) => String(item.id) === packId);
  const screen = pack ? Number(pack.stockQuantity ?? 0) : Number(product.stockQuantity || 0);
  const shelfNumber = shelf.trim() === "" ? null : Math.floor(Number(shelf));
  const difference = shelfNumber == null || !Number.isFinite(shelfNumber) ? null : shelfNumber - screen;
  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-6 py-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">Stock movements</h2>
              {canEditProduct ? (
                <Link href={`/dashboard/admin/products/edit/${product.id}`} className="text-xs font-black text-green-700 hover:underline" onClick={(event) => event.stopPropagation()}>
                  Edit product
                </Link>
              ) : null}
            </div>
            {loading ? <p className="text-sm text-gray-500">Loading movements…</p> : error ? <p className="text-sm text-red-700">{error}</p> : movements.length === 0 ? <p className="text-sm text-gray-500">No movements recorded for this product.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <tr><th className="py-2 pr-3">Nairobi time</th><th className="py-2 pr-3">Who</th><th className="py-2 pr-3">Pack</th><th className="py-2 pr-3">Change</th><th className="py-2">Reason</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {movements.map((row, index) => {
                      const change = Number(row.change) || 0;
                      const packName = movementPackName(row, packs);
                      return (
                        <tr key={String((row as { id?: string }).id || index)}>
                          <td className="py-2 pr-3 text-gray-700">{nairobiPlacedLabel(String((row as { updatedAt?: string }).updatedAt || ""))}</td>
                          <td className="py-2 pr-3 text-gray-700">{String((row as { updatedBy?: string }).updatedBy || "—")}</td>
                          <td className="py-2 pr-3 text-gray-700">{packName || "—"}</td>
                          <td className="py-2 pr-3 font-black text-gray-900">{change > 0 ? `+${change}` : change}</td>
                          <td className="py-2 text-gray-700">{movementReason(row)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <form
            className="rounded-2xl border border-gray-200 bg-white p-4"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              if (difference == null || difference === 0 || shelfNumber == null || shelfNumber < 0) return;
              onCount(difference, reason, pack ? String(pack.id) : undefined, pack?.name);
              setShelf("");
            }}
          >
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">Shelf count</h2>
            <p className="mt-1 text-xs text-gray-500">Enter what you counted. The difference is saved with the adjustment that already exists.</p>
            {packs.length > 0 ? (
              <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-gray-400">
                Pack
                <select value={packId} onChange={(event) => setPackId(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold normal-case text-gray-900">
                  {packs.map((item) => <option key={item.id} value={String(item.id)}>{item.name || "Pack"}</option>)}
                </select>
              </label>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-[10px] font-black uppercase text-gray-400">Shelf</p><input inputMode="numeric" value={shelf} onChange={(event) => setShelf(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 font-black" /></div>
              <div><p className="text-[10px] font-black uppercase text-gray-400">Screen</p><p className="mt-3 font-black text-gray-950">{screen}</p></div>
              <div><p className="text-[10px] font-black uppercase text-gray-400">Difference</p><p className="mt-3 font-black text-gray-950">{difference == null ? "—" : difference > 0 ? `+${difference}` : difference}</p></div>
            </div>
            <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-gray-400">
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-bold normal-case text-gray-900">
                <option value="counted">Counted</option>
                <option value="damaged">Damaged</option>
                <option value="received">Received</option>
              </select>
            </label>
            <button type="submit" disabled={busy || difference == null || difference === 0 || (shelfNumber != null && shelfNumber < 0)} className="mt-4 min-h-11 rounded-xl bg-green-700 px-4 text-sm font-black text-white disabled:opacity-40">
              Save count
            </button>
          </form>
        </div>
      </td>
    </tr>
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
