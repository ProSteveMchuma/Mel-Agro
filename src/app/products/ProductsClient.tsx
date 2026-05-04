"use client";

import React, { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar, { SortOption } from "@/components/Sidebar";
import ProductCard from "@/components/ProductCard";
import { Product, getProductsPage } from "@/lib/products";
import { searchProducts, didYouMean } from "@/lib/search";
import { useProducts } from "@/context/ProductContext";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ProductsClientProps {
    initialProducts: Product[];
    initialBrands: string[];
    initialCategories: string[];
}

const PAGE_SIZE = 12;
const PRICE_DEFAULT_MIN = 0;
const PRICE_DEFAULT_MAX = 1000000;

function parsePrice(raw: string | null, fallback: number): number {
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default function ProductsClient({ initialProducts, initialBrands, initialCategories }: ProductsClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const currentCategory = searchParams.get("category") || "";
    const currentSearch = searchParams.get("search") || "";
    const sortBy = (searchParams.get("sort") as SortOption) || 'relevance';
    const inStockOnly = searchParams.get("inStock") === "1";

    const priceMinParam = searchParams.get("priceMin");
    const priceMaxParam = searchParams.get("priceMax");
    const priceMin = parsePrice(priceMinParam, PRICE_DEFAULT_MIN);
    const priceMax = parsePrice(priceMaxParam, PRICE_DEFAULT_MAX);

    const selectedBrands = useMemo(() => searchParams.getAll("brand"), [searchParams]);

    const [availableBrands] = useState<string[]>(initialBrands);
    const [availableCategories] = useState<string[]>(initialCategories);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(currentSearch);

    // Keep localSearch in sync if URL changes externally
    useEffect(() => { setLocalSearch(currentSearch); }, [currentSearch]);

    // Debounced URL sync for the inline filter input
    useEffect(() => {
        if (localSearch === currentSearch) return;
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (localSearch) params.set("search", localSearch);
            else params.delete("search");
            router.push(`/products?${params.toString()}`, { scroll: false });
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateParams = useCallback((mutate: (params: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString());
        mutate(params);
        router.push(`/products?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    const handleCategoryChange = useCallback((category: string) => {
        updateParams(p => {
            if (category) p.set("category", category);
            else p.delete("category");
        });
        setIsSidebarOpen(false);
    }, [updateParams]);

    const handleBrandChange = useCallback((brand: string) => {
        updateParams(p => {
            const existing = p.getAll("brand");
            p.delete("brand");
            const next = existing.includes(brand)
                ? existing.filter(b => b !== brand)
                : [...existing, brand];
            next.forEach(b => p.append("brand", b));
        });
    }, [updateParams]);

    const handlePriceChange = useCallback(([min, max]: [number, number]) => {
        updateParams(p => {
            if (min > 0) p.set("priceMin", String(min)); else p.delete("priceMin");
            if (max < PRICE_DEFAULT_MAX) p.set("priceMax", String(max)); else p.delete("priceMax");
        });
    }, [updateParams]);

    const handleSortChange = useCallback((sort: SortOption) => {
        updateParams(p => {
            if (sort && sort !== 'relevance') p.set("sort", sort);
            else p.delete("sort");
        });
    }, [updateParams]);

    const handleInStockChange = useCallback((value: boolean) => {
        updateParams(p => {
            if (value) p.set("inStock", "1");
            else p.delete("inStock");
        });
    }, [updateParams]);

    const handleClearAll = useCallback(() => {
        setLocalSearch("");
        router.push(`/products`, { scroll: false });
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow">
                <div className="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
                    <div className="container-custom px-4 md:px-8 py-3 flex items-center justify-between">
                        <nav className="flex items-center gap-2 text-[10px] md:text-sm">
                            <Link href="/" className="text-gray-400 hover:text-melagri-primary transition-colors font-bold uppercase tracking-widest">Home</Link>
                            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            <Link href="/products" className="text-gray-400 hover:text-melagri-primary transition-colors font-bold uppercase tracking-widest">Shop</Link>
                            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            <span className="text-melagri-primary font-black uppercase tracking-widest">
                                {currentCategory || "Catalogue"}
                            </span>
                        </nav>

                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 border border-gray-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filters
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row container-custom py-8 gap-8 px-4 relative">
                    {isSidebarOpen && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
                    )}

                    <div className={`fixed inset-y-0 left-0 w-[280px] bg-white z-[70] transform transition-transform duration-500 ease-in-out lg:relative lg:translate-x-0 lg:z-0 lg:w-64 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="h-full overflow-y-auto lg:h-auto lg:overflow-visible p-4 lg:p-0">
                            <div className="flex items-center justify-between mb-6 lg:hidden">
                                <h2 className="text-xl font-black uppercase tracking-tighter">Filters</h2>
                                <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-gray-50 rounded-full">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <Sidebar
                                categories={availableCategories}
                                onCategoryChange={handleCategoryChange}
                                onPriceChange={handlePriceChange}
                                brands={availableBrands}
                                selectedBrands={selectedBrands}
                                onBrandChange={handleBrandChange}
                                sortBy={sortBy}
                                onSortChange={handleSortChange}
                                inStockOnly={inStockOnly}
                                onInStockChange={handleInStockChange}
                                onClearAll={handleClearAll}
                                initialMinPrice={priceMinParam || ''}
                                initialMaxPrice={priceMaxParam || ''}
                            />
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="mb-6 md:mb-8 group">
                            <div className="hidden md:flex items-center mb-3">
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">
                                    {currentCategory || "Global Catalogue"}
                                </h1>
                            </div>
                            <p className="hidden md:block text-gray-500 mb-8 font-medium max-w-2xl leading-relaxed">
                                Curating the finest agricultural inputs for the modern farmer. Certified quality, delivered to your farm.
                            </p>

                            <div className="md:hidden">
                                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                                    <button
                                        onClick={() => handleCategoryChange("")}
                                        className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${currentCategory === "" ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20" : "bg-white text-gray-500 border-gray-100 shadow-sm"}`}
                                    >
                                        All
                                    </button>
                                    {availableCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => handleCategoryChange(cat)}
                                            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${currentCategory === cat ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20" : "bg-white text-gray-500 border-gray-100 shadow-sm"}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="hidden md:flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50">
                                    <div className="flex items-center gap-3 bg-gray-50/50 pl-4 pr-2 py-1.5 rounded-2xl flex-1 max-w-md border border-gray-100/50 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-melagri-primary/10">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Quick filter products..."
                                                value={localSearch}
                                                onChange={(e) => setLocalSearch(e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-gray-300 py-1"
                                            />
                                        </div>
                                        {localSearch && (
                                            <button onClick={() => setLocalSearch("")} className="text-gray-400 hover:text-red-500 px-2" title="Clear">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Suspense fallback={
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 shadow-sm"></div>
                                ))}
                            </div>
                        }>
                            <ProductsGrid
                                category={currentCategory}
                                priceRange={[priceMin, priceMax]}
                                selectedBrands={selectedBrands}
                                searchQuery={currentSearch}
                                sortBy={sortBy}
                                inStockOnly={inStockOnly}
                                initialProducts={initialProducts}
                                onClearAll={handleClearAll}
                            />
                        </Suspense>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

interface ProductsGridProps {
    category: string;
    priceRange: [number, number];
    selectedBrands: string[];
    searchQuery: string;
    sortBy: SortOption;
    inStockOnly: boolean;
    initialProducts: Product[];
    onClearAll: () => void;
}

function ProductsGrid({
    category, priceRange, selectedBrands, searchQuery, sortBy, inStockOnly, initialProducts, onClearAll,
}: ProductsGridProps) {
    const router = useRouter();
    const { products: catalog } = useProducts();

    // When the user is searching, we use the full catalog from ProductContext (already streamed
    // via onSnapshot). When not searching, we use the paginated server flow for performance.
    const isSearching = !!searchQuery.trim();

    // Paginated client state (only used when NOT searching)
    const [pagedProducts, setPagedProducts] = useState<Product[]>(initialProducts);
    const [isLoading, setIsLoading] = useState(false);
    const lastVisibleRef = useRef<any>(null);
    const [hasMore, setHasMore] = useState(true);

    const loadProducts = useCallback(async (isInitial = false) => {
        setIsLoading(true);
        try {
            const categoryFilter = category === "All Products" || category === "" ? undefined : category;
            const { products: newProducts, lastVisible } = await getProductsPage(
                PAGE_SIZE,
                isInitial ? null : lastVisibleRef.current,
                categoryFilter,
                'newest',
                selectedBrands
            );
            if (isInitial) setPagedProducts(newProducts);
            else setPagedProducts(prev => [...prev, ...newProducts]);
            lastVisibleRef.current = lastVisible;
            setHasMore(newProducts.length === PAGE_SIZE);
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setIsLoading(false);
        }
    }, [category, selectedBrands]);

    // Refetch paginated stream when filters change (and we're not searching)
    useEffect(() => {
        if (isSearching) return;
        lastVisibleRef.current = null;
        setHasMore(true);
        loadProducts(true);
    }, [isSearching, category, selectedBrands.join('|'), loadProducts]); // eslint-disable-line react-hooks/exhaustive-deps

    const baseList: Product[] = isSearching ? catalog : pagedProducts;

    const filteredProducts = useMemo(() => {
        let list = [...baseList];

        if (isSearching) {
            list = searchProducts(list, searchQuery);
            // Apply category as a hard filter even when searching
            if (category) list = list.filter(p => p.category === category);
            if (selectedBrands.length > 0) list = list.filter(p => p.brand && selectedBrands.includes(p.brand));
        } else if (selectedBrands.length > 0) {
            // When NOT searching, brands are already applied server-side, but the local
            // filter is harmless and also covers the case where the server returns extras.
            list = list.filter(p => p.brand && selectedBrands.includes(p.brand));
        }

        list = list.filter(p => {
            const price = Number(p.price) || 0;
            return price >= priceRange[0] && price <= priceRange[1];
        });

        if (inStockOnly) {
            list = list.filter(p => Number((p as any).stockQuantity) > 0);
        }

        if (sortBy === 'price-asc') list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        else if (sortBy === 'price-desc') list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        else if (sortBy === 'newest') list.sort((a, b) => {
            const aT = new Date(((a as any).createdAt) || 0).getTime();
            const bT = new Date(((b as any).createdAt) || 0).getTime();
            return bT - aT;
        });
        else if (sortBy === 'top-rated') list.sort((a, b) => (Number((b as any).rating) || 0) - (Number((a as any).rating) || 0));

        return list;
    }, [baseList, isSearching, searchQuery, category, selectedBrands, priceRange, inStockOnly, sortBy]);

    const corrections = useMemo(() => {
        if (!isSearching || filteredProducts.length > 0) return [];
        return didYouMean(catalog, searchQuery, 3);
    }, [isSearching, searchQuery, filteredProducts.length, catalog]);

    const popularProducts = useMemo(() => {
        if (filteredProducts.length > 0) return [];
        return [...catalog]
            .filter(p => Number((p as any).rating || 0) >= 4)
            .slice(0, 4);
    }, [filteredProducts.length, catalog]);

    if (isLoading && pagedProducts.length === 0 && !isSearching) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 shadow-sm"></div>
                ))}
            </div>
        );
    }

    if (filteredProducts.length === 0) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">No products match</h3>
                    <p className="text-gray-500 max-w-md font-medium mb-6">
                        {searchQuery
                            ? <>We couldn&apos;t find anything for <span className="font-bold">&ldquo;{searchQuery}&rdquo;</span> with your current filters.</>
                            : <>Your filter combination has no matches.</>}
                    </p>

                    {corrections.length > 0 && (
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Did you mean?</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {corrections.map(c => (
                                    <button
                                        key={c.correctedTerm}
                                        onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('search', c.correctedTerm);
                                            router.push(`/products?${params.toString()}`);
                                        }}
                                        className="px-4 py-2 bg-melagri-primary/10 text-melagri-primary rounded-full text-sm font-bold hover:bg-melagri-primary hover:text-white transition-all"
                                    >
                                        {c.correctedTerm}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 justify-center">
                        <button onClick={onClearAll} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                            Clear all filters
                        </button>
                        <Link href="/products" className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                            Browse catalogue
                        </Link>
                    </div>
                </div>

                {popularProducts.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">You might like</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {popularProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    name={product.name}
                                    price={product.price}
                                    image={product.image}
                                    images={product.images}
                                    category={product.category}
                                    variants={product.variants}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
                    {searchQuery && <> for &ldquo;{searchQuery}&rdquo;</>}
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        image={product.image}
                        images={product.images}
                        category={product.category}
                        variants={product.variants}
                    />
                ))}
            </div>

            {/* Pagination only when browsing (not searching) — searching uses full catalog already */}
            {!isSearching && hasMore && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => loadProducts(false)}
                        disabled={isLoading || !lastVisibleRef.current}
                        className="bg-gray-900 hover:bg-[#22c55e] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-green-100 disabled:opacity-50 flex items-center gap-3"
                    >
                        {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div> : null}
                        {isLoading ? 'Loading more...' : 'Show more products'}
                    </button>
                </div>
            )}
        </div>
    );
}
