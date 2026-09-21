"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ProductCard from "@/components/ProductCard";
import { Product, getProductsPage } from "@/lib/products";
import { fuzzySearch } from "@/components/SmartSearch";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProducts } from "@/context/ProductContext";
import { SITE_URL } from '@/lib/site';
import { productSeoPath } from '@/lib/seo';


interface ProductsClientProps {
    initialProducts: Product[];
    initialBrands: string[];
    initialCategories: string[];
}

export default function ProductsClient({ initialProducts, initialBrands, initialCategories }: ProductsClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    // State for filters - initialize from URL
    const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
        // Initialize from URL search params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const brands = params.getAll("brand");
            const search = params.get("search");

            // If search matches a brand exactly, promote it to selectedBrands
            // This ensures "all products under the brand" are shown via server filter
            if (search && initialBrands.some(b => b.toLowerCase() === search.toLowerCase())) {
                const matchedBrand = initialBrands.find(b => b.toLowerCase() === search.toLowerCase())!;
                if (!brands.includes(matchedBrand)) {
                    return [...brands, matchedBrand];
                }
            }
            return brands;
        }
        return [];
    });
    const currentCategory = searchParams.get("category") || "";

    // Initialize with server-fetched data
    const availableBrands = initialBrands;
    const availableCategories = initialCategories;

    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>(() => {
        const sort = searchParams.get("sort");
        if (sort === 'price-low' || sort === 'price-high') return sort;
        return 'newest';
    });

    // Real-time search state
    const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");

    // Dynamic discovery chips from live brands + categories (skip empty catalogue)
    const discoveryChips = useMemo(() => {
        const brands = availableBrands.slice(0, 4);
        const cats = availableCategories
            .filter((c) => !brands.some((b) => b.toLowerCase() === c.toLowerCase()))
            .slice(0, 3);
        return [...brands, ...cats].slice(0, 6);
    }, [availableBrands, availableCategories]);

    const handleSortChange = (next: 'newest' | 'price-low' | 'price-high') => {
        setSortBy(next);
        const params = new URLSearchParams(searchParams.toString());
        if (next === 'newest') {
            params.delete("sort");
        } else {
            params.set("sort", next);
        }
        router.push(`/products?${params.toString()}`, { scroll: false });
    };

    // Keep sort in sync with URL (back/forward, shared links)
    useEffect(() => {
        const sort = searchParams.get("sort");
        const next = sort === 'price-low' || sort === 'price-high' ? sort : 'newest';
        setSortBy(prev => (prev === next ? prev : next));
    }, [searchParams]);

    // Keep the quick-filter input in sync when the URL `search` changes from
    // elsewhere (suggestion pills, header search, back/forward navigation) so
    // external selections aren't lost.
    useEffect(() => {
        const urlSearch = searchParams.get("search") || "";
        setLocalSearch(prev => (prev === urlSearch ? prev : urlSearch));
    }, [searchParams]);

    // Debounce the user's typing into the URL. Only write when the debounced
    // value actually differs from the current URL search, so external changes
    // (pills / brand selection) are never clobbered back to the full catalogue.
    useEffect(() => {
        const urlSearch = searchParams.get("search") || "";
        if (localSearch === urlSearch) return;
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (localSearch) {
                params.set("search", localSearch);
            } else {
                params.delete("search");
            }
            router.push(`/products?${params.toString()}`, { scroll: false });
        }, 300);

        return () => clearTimeout(timer);
    }, [localSearch, router, searchParams]);

    const handleCategoryChange = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (category) {
            params.set("category", category);
        } else {
            params.delete("category");
        }
        router.push(`/products?${params.toString()}`);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const handleBrandChange = (brand: string) => {
        const newBrands = selectedBrands.includes(brand)
            ? selectedBrands.filter(b => b !== brand)
            : [...selectedBrands, brand];
        
        setSelectedBrands(newBrands);

        // Update URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete("brand"); // Clear existing
        newBrands.forEach(b => params.append("brand", b));
        
        router.push(`/products?${params.toString()}`, { scroll: false });
    };




    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow">
                {/* Breadcrumb & Mobile Filter Toggle */}
                <div className="bg-white border-b border-gray-100 sticky top-[124px] sm:top-[152px] md:top-[104px] z-30 shadow-sm">
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

                        {/* Mobile Filter Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 border border-gray-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filters
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row container-custom py-8 gap-8 px-4 relative">
                    {/* Sidebar Overlay (Mobile) */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar Filter */}
                    <div className={`
                        fixed inset-y-0 left-0 w-[280px] bg-white z-[70] transform transition-transform duration-500 ease-in-out lg:relative lg:translate-x-0 lg:z-0 lg:w-64 flex-shrink-0
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}>
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
                                onPriceChange={setPriceRange}
                                brands={availableBrands}
                                selectedBrands={selectedBrands}
                                onBrandChange={handleBrandChange}
                            />
                        </div>
                    </div>

                            <div className="flex-1">
                                {/* Page Title & Controls */}
                                <div className="mb-6 md:mb-8 group">
                                    {/* Page Title */}
                                    <div className="flex items-center mb-3">
                                        <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">
                                            {currentCategory || "Shop farm inputs"}
                                        </h1>
                                    </div>

                                    {/* Description hidden on mobile */}
                                    <p className="hidden md:block text-gray-500 mb-8 font-medium max-w-2xl leading-relaxed">
                                        Certified seeds, fertilizers, and crop protection — priced for Kenyan farms, delivered to your county.
                                    </p>

                                    <div className="md:hidden">
                                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                                            <button
                                                onClick={() => handleCategoryChange("")}
                                                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${currentCategory === ""
                                                    ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20"
                                                    : "bg-white text-gray-500 border-gray-100 shadow-sm"
                                                    }`}
                                            >
                                                All
                                            </button>
                                            {availableCategories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${currentCategory === cat
                                                        ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20"
                                                        : "bg-white text-gray-500 border-gray-100 shadow-sm"
                                                        }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {/* Mobile discovery chips from live catalogue */}
                                        {discoveryChips.length > 0 && (
                                            <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
                                                {discoveryChips.map(pill => (
                                                    <button
                                                        key={pill}
                                                        onClick={() => {
                                                            const params = new URLSearchParams(searchParams.toString());
                                                            params.set("search", pill);
                                                            router.push(`/products?${params.toString()}`);
                                                        }}
                                                        className="flex-shrink-0 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-bold text-gray-500 shadow-sm uppercase tracking-wider active:bg-melagri-primary active:text-white transition-colors"
                                                    >
                                                        {pill}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <label htmlFor="sort-mobile" className="sr-only">Sort products</label>
                                            <select
                                                id="sort-mobile"
                                                value={sortBy}
                                                onChange={(e) => handleSortChange(e.target.value as 'newest' | 'price-low' | 'price-high')}
                                                className="w-full rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700"
                                            >
                                                <option value="newest">Newest</option>
                                                <option value="price-low">Price: low to high</option>
                                                <option value="price-high">Price: high to low</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Desktop Sort and Filter Bar - Hidden on Mobile */}
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
                                                <div className="bg-melagri-primary/10 px-3 py-1 rounded-lg">
                                                    <p className="text-[10px] text-melagri-primary font-black uppercase tracking-wider">
                                                        Deep Filter
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <label htmlFor="sort-desktop" className="sr-only">Sort products</label>
                                                <select
                                                    id="sort-desktop"
                                                    value={sortBy}
                                                    onChange={(e) => handleSortChange(e.target.value as 'newest' | 'price-low' | 'price-high')}
                                                    className="rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-600"
                                                >
                                                    <option value="newest">Newest</option>
                                                    <option value="price-low">Price: low → high</option>
                                                    <option value="price-high">Price: high → low</option>
                                                </select>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-50/50 px-4 py-2.5 rounded-2xl border border-gray-100 italic">
                                                    {searchParams.get("search")
                                                        ? `Results for "${searchParams.get("search")}"`
                                                        : currentCategory
                                                            ? `Collection: ${currentCategory}`
                                                            : "All farm inputs"}
                                                </p>
                                            </div>
                                        </div>

                                        {discoveryChips.length > 0 && (
                                            <div className="flex items-center gap-2 overflow-x-auto pb-2 pl-2">
                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest pr-2">Browse:</span>
                                                {discoveryChips.map(pill => (
                                                    <button
                                                        key={pill}
                                                        onClick={() => {
                                                            const params = new URLSearchParams(searchParams.toString());
                                                            params.set("search", pill);
                                                            router.push(`/products?${params.toString()}`);
                                                        }}
                                                        className="flex-shrink-0 px-4 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-500 hover:bg-melagri-primary hover:text-white hover:border-melagri-primary transition-all shadow-sm uppercase tracking-wider"
                                                    >
                                                        {pill}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                        {/* Products Grid */}
                        <Suspense fallback={
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 shadow-sm"></div>
                                ))}
                            </div>
                        }>
                            <ProductsGrid
                                category={currentCategory}
                                priceRange={priceRange}
                                selectedBrands={selectedBrands}
                                sortBy={sortBy}
                                initialProducts={initialProducts}
                            />
                        </Suspense>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function ProductsGrid({ category, priceRange, selectedBrands, sortBy, initialProducts }: { category: string, priceRange: [number, number], selectedBrands: string[], sortBy: 'newest' | 'price-low' | 'price-high', initialProducts: Product[] }) {
    const { products: allProducts } = useProducts();
    // Only use initialProducts if they match the current category filter (simple check)
    // Actually, on mount, category should match what page.tsx used. 
    // But if user changes category, we discard initialProducts.
    // We can use a ref to track if it's the very first load.
    const isFirstLoad = React.useRef(true);

    // logic: if first load, use initialProducts. else, start empty and fetch (or keep previous?)
    // Actually standard pattern: initialize with prop, but effect updates it.

    const [products, setProducts] = useState<Product[]>(isFirstLoad.current ? initialProducts : []);
    const [isLoading, setIsLoading] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null); // We don't have lastVisible from server? Hmm.
    // If we rely on load more, we need lastVisible. 
    // Since page.tsx didn't return lastVisible, we can't reliably "Load More" from the server-fetched batch without re-fetching or knowing the cursor.
    // Compromise: Initial load is fast (server). "Show More" might need to re-fetch the first page to get the cursor OR we just accept we might miss the cursor?
    // Actually, Firestore cursors are DocumentSnapshots. We can't serialize them easily to pass from Server Component to Client Component.
    // So for "Load More" to work, we might need to fetch page 1 again on client to get the cursor? 
    // Or we handle the first "Load More" by fetching page 2 using offset? Firestore doesn't like offset.
    // BEST EFFORT: 
    // On mount, if we have initialProducts, show them.
    // But we don't have the "cursor" for the next page. 
    // So "Show More" button ensures we have a cursor. 
    // Strategy: 
    // 1. Render initialProducts.
    // 2. Silently fetch page 1 (or just the cursor?) in background? No that defeats the purpose.
    // 3. Changing filters resets everything.

    // Let's rely on standard client fetching for now but seed with initialProducts for immediate paint.
    // But we need to make sure effect doesn't immediately overwrite it.

    const [hasMore, setHasMore] = useState(true);
    const searchParams = useSearchParams();

    const loadProducts = async (isInitial = false) => {
        setIsLoading(true);
        try {
            // Map "All Products" or empty to undefined for getProductsPage
            const categoryFilter = category === "All Products" || category === "" ? undefined : category;

            const { products: newProducts, lastVisible: newLastVisible } = await getProductsPage(
                12,
                isInitial ? null : lastVisible,
                categoryFilter,
                sortBy,
                selectedBrands
            );

            if (isInitial) {
                setProducts(newProducts);
            } else {
                setProducts(prev => [...prev, ...newProducts]);
            }

            setLastVisible(newLastVisible);
            setHasMore(newProducts.length === 12);
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const refreshProducts = async () => {
            setIsLoading(true);
            try {
                const categoryFilter = category === "All Products" || category === "" ? undefined : category;
                const { products: freshProducts, lastVisible: freshCursor } = await getProductsPage(
                    12,
                    null,
                    categoryFilter,
                    sortBy,
                    selectedBrands,
                );
                if (!cancelled) {
                    setProducts(freshProducts);
                    setLastVisible(freshCursor);
                    setHasMore(freshProducts.length === 12);
                    isFirstLoad.current = false;
                }
            } catch (error) {
                if (!cancelled) console.error("Failed to refresh products:", error);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void refreshProducts();
        return () => { cancelled = true; };
    }, [category, selectedBrands, sortBy]);

    const searchQuery = searchParams.get("search");

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [searchQuery, category, selectedBrands, sortBy]);

    const filteredProducts = useMemo(() => {
        const searchQuery = searchParams.get("search");
        let baseProducts = searchQuery ? allProducts : products;
        let filtered = [...baseProducts];

        if (searchQuery) {
            filtered = fuzzySearch(filtered, searchQuery);
        }

        if (priceRange) {
            filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
        }

        if (selectedBrands.length > 0) {
            filtered = filtered.filter(p => p.brand && selectedBrands.includes(p.brand));
        }

        // Apply category filter on client if searching globally
        if (searchQuery && category && category !== "All Products") {
            filtered = filtered.filter(p => p.category === category);
        }

        // Client sort for search / mixed sets (server already sorts paginated fetches)
        if (sortBy === 'price-low') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => b.price - a.price);
        }

        return filtered;
    }, [products, allProducts, searchParams, priceRange, selectedBrands, category, sortBy]);

    if (isLoading && products.length === 0) return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 shadow-sm"></div>
            ))}
        </div>
    );

    if (products.length === 0 && !isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 max-w-xs font-medium">Try adjusting your filters or search criteria to find what you need.</p>
        </div>
    );

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: filteredProducts.map((product, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `${SITE_URL}${productSeoPath(product)}`,
            item: {
                '@type': 'Product',
                name: product.name,
                image: product.image,
                offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: 'KES',
                    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    url: `${SITE_URL}${productSeoPath(product)}`,
                },
            }
        }))
    };

    return (
        <div className="space-y-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
            />
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
                        description={product.description}
                        brand={product.brand}
                        productCode={product.productCode}
                        inStock={product.inStock}
                        stockQuantity={product.stockQuantity}
                        lowStockThreshold={product.lowStockThreshold}
                        rating={product.rating}
                        reviews={product.reviews}
                    />
                ))}
            </div>

            {hasMore && !searchParams.get("search") && (
                <div className="flex justify-center pt-8">
                    <button
                        onClick={() => loadProducts(false)}
                        disabled={isLoading}
                        className="bg-gray-900 hover:bg-[#22c55e] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-green-100 disabled:opacity-50 flex items-center gap-3"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                        ) : null}
                        {isLoading ? 'Loading More...' : 'Show More Products'}
                    </button>
                </div>
            )}
        </div>
    );
}
