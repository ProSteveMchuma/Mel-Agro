"use client";
import { useProducts } from "@/context/ProductContext";
import type { Product } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import BulkUploadButton from "@/components/admin/BulkUploadButton";
import ExportProductsButton from "@/components/admin/ExportProductsButton";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ProductManagement() {
    const { deleteProduct, restoreProduct } = useProducts();
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterBrand, setFilterBrand] = useState("All");
    const [filterStock, setFilterStock] = useState("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [brands, setBrands] = useState<string[]>([]);
    const [deleteId, setDeleteId] = useState<string | number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchLimited, setSearchLimited] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true); setError("");
            try {
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) throw new Error("Admin session is unavailable.");
                const params = new URLSearchParams({ archived: String(showArchived), stock: filterStock });
                if (searchTerm.trim()) params.set("q", searchTerm.trim());
                if (filterCategory !== "All") params.set("category", filterCategory);
                if (filterBrand !== "All") params.set("brand", filterBrand);
                if (minPrice.trim()) params.set("minPrice", minPrice.trim());
                if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim());
                if (cursor) params.set("cursor", cursor);
                const response = await fetch(`/api/admin/products?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Could not load products.");
                setProducts(result.products || []); setNextCursor(result.nextCursor || null); setSearchLimited(Boolean(result.searchLimited));
                setCategories((current) => Array.from(new Set([...current, ...(result.categories || [])])).sort());
                setBrands((current) => Array.from(new Set([...current, ...(result.brands || [])])).sort());
            } catch (caught) {
                if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load products.");
            } finally { if (!controller.signal.aborted) setLoading(false); }
        }, searchTerm || minPrice || maxPrice ? 300 : 0);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [showArchived, searchTerm, filterCategory, filterBrand, filterStock, minPrice, maxPrice, cursor, refreshKey]);

    const visibleProducts = products;
    const visibleIds = visibleProducts.map(product => String(product.id));
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProducts.includes(id));
    const resetPage = () => { setCursor(null); setCursorHistory([]); setSelectedProducts([]); };
    const refresh = () => setRefreshKey(value => value + 1);

    const toggleSelectAll = () => {
        setSelectedProducts(current => allVisibleSelected
            ? current.filter(id => !visibleIds.includes(id))
            : Array.from(new Set([...current, ...visibleIds])));
    };

    const toggleSelectProduct = (id: string) => {
        if (selectedProducts.includes(id)) {
            setSelectedProducts(selectedProducts.filter(pId => pId !== id));
        } else {
            setSelectedProducts([...selectedProducts, id]);
        }
    };

    const handleBulkLifecycle = async () => {
        const action = showArchived ? 'restore' : 'archive';
        if (!confirm(`${showArchived ? 'Restore' : 'Archive'} ${selectedProducts.length} products?${showArchived ? '' : ' They can be restored later.'}`)) return;
        const notice = toast.loading(`${showArchived ? 'Restoring' : 'Archiving'} products...`);
        const results = await Promise.allSettled(selectedProducts.map(id => showArchived ? restoreProduct(id) : deleteProduct(id)));
        const failures = results.filter(result => result.status === 'rejected').length;
        if (failures) toast.error(`${selectedProducts.length - failures} updated; ${failures} failed.`, { id: notice });
        else toast.success(`${selectedProducts.length} products ${action}d.`, { id: notice });
        setSelectedProducts([]);
        refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500 text-sm">Manage your inventory and catalog.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedProducts.length > 0 && (
                        <button
                            onClick={handleBulkLifecycle}
                            className={`${showArchived ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'} px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {showArchived ? 'Restore' : 'Archive'} ({selectedProducts.length})
                        </button>
                    )}
                    <ExportProductsButton />
                    <BulkUploadButton />
                    <Link href="/dashboard/admin/products/new" className="btn-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Product
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex flex-col md:flex-row gap-4">
                <div className="flex shrink-0 rounded-lg border border-gray-200 p-1">
                    <button type="button" onClick={() => { setShowArchived(false); resetPage(); }} className={`rounded-md px-3 py-1.5 text-xs font-bold ${!showArchived ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>Active</button>
                    <button type="button" onClick={() => { setShowArchived(true); resetPage(); }} className={`rounded-md px-3 py-1.5 text-xs font-bold ${showArchived ? 'bg-gray-900 text-white' : 'text-gray-500'}`}>Archived</button>
                </div>
                <div className="relative flex-grow max-w-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-melagri-primary focus:ring-1 focus:ring-melagri-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); resetPage(); }}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:border-melagri-primary outline-none bg-white"
                >
                    <option value="All">All categories</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select
                    value={filterBrand}
                    onChange={(e) => { setFilterBrand(e.target.value); resetPage(); }}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:border-melagri-primary outline-none bg-white"
                >
                    <option value="All">All brands</option>
                    {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
                <select
                    value={filterStock}
                    onChange={(e) => { setFilterStock(e.target.value); resetPage(); }}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:border-melagri-primary outline-none bg-white"
                >
                    <option value="all">All Stock Status</option>
                    <option value="in">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                </select>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1 max-w-xs">
                        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Min price (KES)</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={1}
                            value={minPrice}
                            onChange={(e) => { setMinPrice(e.target.value); resetPage(); }}
                            placeholder="0"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-melagri-primary outline-none"
                        />
                    </label>
                    <label className="flex-1 max-w-xs">
                        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Max price (KES)</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={1}
                            value={maxPrice}
                            onChange={(e) => { setMaxPrice(e.target.value); resetPage(); }}
                            placeholder="Any"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-melagri-primary outline-none"
                        />
                    </label>
                    {(filterBrand !== "All" || minPrice || maxPrice) ? (
                        <button
                            type="button"
                            onClick={() => { setFilterBrand("All"); setMinPrice(""); setMaxPrice(""); resetPage(); }}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:border-melagri-primary"
                        >
                            Clear brand / price
                        </button>
                    ) : null}
                </div>
            </div>
            {searchLimited && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">This broad filter checked the next 600 catalogue records. Add a product name, code, brand, category, or price range to narrow it.</p>}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={refresh} className="ml-2 font-black underline">Retry</button></div>}

            {/* Product Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-4">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-melagri-primary focus:ring-melagri-primary"
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium">Product</th>
                                <th className="px-6 py-4 font-medium">Brand</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium">Price</th>
                                <th className="px-6 py-4 font-medium">Stock Level</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!loading && visibleProducts.map(product => {
                                const totalStock = product.stockQuantity + (product.variants?.reduce((acc, v) => acc + (v.stockQuantity || 0), 0) || 0);
                                const isLowStock = totalStock <= (product.lowStockThreshold || 10);
                                const isOutOfStock = totalStock === 0;
                                const isSelected = selectedProducts.includes(String(product.id));

                                return (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50' : ''}`}
                                        onClick={() => router.push(`/dashboard/admin/products/edit/${product.id}`)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectProduct(String(product.id))}
                                                className="rounded border-gray-300 text-melagri-primary focus:ring-melagri-primary"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0 border border-gray-200">
                                                    <Image
                                                        src={(typeof product.image === 'string' && product.image.startsWith('http')) ? product.image : "https://placehold.co/100x100?text=No+Image"}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized={typeof product.image === 'string' && product.image.includes('firebasestorage')}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{product.name}</div>
                                                    {product.productCode && (
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{product.productCode}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">{product.brand || "—"}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">KES {product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                                <span className={`font-medium ${isOutOfStock ? 'text-red-700' : isLowStock ? 'text-yellow-700' : 'text-green-700'}`}>
                                                    {totalStock} Units
                                                </span>
                                                {isLowStock && !isOutOfStock && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Low</span>
                                                )}
                                                {product.variants && product.variants.length > 0 && (
                                                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded" title="Includes Variants">
                                                        {product.variants.length}V
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={async () => {
                                                        if (!showArchived) return setDeleteId(product.id);
                                                        try { await restoreProduct(product.id); toast.success('Product restored'); refresh(); } catch (caught) { toast.error(caught instanceof Error ? caught.message : 'Could not restore product'); }
                                                    }}
                                                    className={`p-2 rounded-lg transition-colors ${showArchived ? 'text-green-700 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                                                    title={showArchived ? "Restore" : "Archive"}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {loading && <div className="p-12 text-center text-sm font-semibold text-gray-500">Loading catalogue records…</div>}
                {!loading && products.length === 0 && !error && (
                    <div className="p-12 text-center text-gray-500">
                        No products found matching "{searchTerm}".
                    </div>
                )}
                {!loading && products.length > 0 && !error && (
                    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>Page {cursorHistory.length + 1} · showing {products.length} products</span>
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={cursorHistory.length === 0} onClick={() => { setCursorHistory(history => { const copy = [...history]; setCursor(copy.pop() ?? null); return copy; }); setSelectedProducts([]); }} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold text-gray-700 disabled:opacity-40">Previous</button>
                            <button type="button" disabled={!nextCursor} onClick={() => { if (nextCursor) { setCursorHistory(history => [...history, cursor]); setCursor(nextCursor); setSelectedProducts([]); } }} className="min-h-10 rounded-lg border border-gray-200 px-3 font-bold text-gray-700 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={deleteId !== null}
                title="Archive this product?"
                message="The product will be hidden from the catalogue and search. You can restore it later from the Archived tab."
                onConfirm={async () => {
                    if (deleteId === null) return;
                    setDeleting(true);
                    try {
                        await deleteProduct(deleteId);
                        toast.success('Product archived');
                        setDeleteId(null);
                        refresh();
                    } catch (caught) {
                        toast.error(caught instanceof Error ? caught.message : 'Could not archive product');
                    } finally {
                        setDeleting(false);
                    }
                }}
                onCancel={() => setDeleteId(null)}
                busy={deleting}
                confirmLabel="Archive"
            />
        </div>
    );
}
