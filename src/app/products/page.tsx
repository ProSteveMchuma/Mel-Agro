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

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // State for filters - initialize from URL
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
    const [sortBy, setSortBy] = useState("best-selling");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Sync state with URL changes
    useEffect(() => {
        const cat = searchParams.get("category");
        if (cat !== selectedCategory) {
            setSelectedCategory(cat || "");
        }
    }, [searchParams]);

    const handleCategoryChange = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (category) {
            params.set("category", category);
        } else {
            params.delete("category");
        }
        router.push(`/products?${params.toString()}`);
        setSelectedCategory(category);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
    };

    const categories = ["Seeds", "Fertilizers", "Crop Protection Products", "Animal Feeds", "Veterinary Products", "Farm Tools", "Irrigation"];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow">
                {/* Breadcrumb & Mobile Filter Toggle */}
                <div className="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
                    <div className="container-custom px-4 md:px-8 py-3 flex items-center justify-between">
                        <nav className="flex items-center gap-2 text-[10px] md:text-sm">
                            <Link href="/" className="text-gray-400 hover:text-melagro-primary transition-colors font-bold uppercase tracking-widest">Home</Link>
                            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            <Link href="/products" className="text-gray-400 hover:text-melagro-primary transition-colors font-bold uppercase tracking-widest">Shop</Link>
                            <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            <span className="text-melagro-primary font-black uppercase tracking-widest">
                                {selectedCategory || "Catalogue"}
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
                                categories={categories}
                                onCategoryChange={handleCategoryChange}
                                onPriceChange={setPriceRange}
                            />
                        </div>
                    </div>

                    <div className="flex-1">
                        {/* Page Title & Controls */}
                        <div className="mb-8 group">
                            <div className="flex items-center gap-4 mb-3">
                                <span className="h-1 w-12 bg-melagro-primary rounded-full group-hover:w-20 transition-all duration-500"></span>
                                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase">
                                    {selectedCategory || "Global Catalogue"}
                                </h1>
                            </div>
                            <p className="text-gray-500 mb-8 font-medium max-w-2xl leading-relaxed">
                                Curating the finest agricultural inputs for the modern farmer. Certified quality, delivered to your farm.
                            </p>

                            {/* Sort and Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-melagro-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                        Verified Inventory
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-gray-50 pl-4 pr-1 py-1 rounded-2xl border border-gray-100">
                                        <span className="text-gray-400">Sort:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="px-4 py-2 bg-white border-none rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-melagro-primary/20 cursor-pointer transition-all font-black shadow-sm"
                                        >
                                            <option value="best-selling">Popularity</option>
                                            <option value="price-low">Lowest Price</option>
                                            <option value="price-high">Highest Price</option>
                                            <option value="newest">Latest Stock</option>
                                            <option value="rating">Top Rated</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <Suspense fallback={
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 shadow-sm"></div>
                                ))}
                            </div>
                        }>
                            <ProductsGrid
                                category={selectedCategory}
                                priceRange={priceRange}
                                sortBy={sortBy}
                            />
                        </Suspense>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function ProductsGrid({ category, priceRange, sortBy }: { category: string, priceRange: [number, number], sortBy: string }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState<any>(null);
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
                categoryFilter
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
        loadProducts(true);
    }, [category]);

    const filteredProducts = useMemo(() => {
        let filtered = [...products];
        const searchQuery = searchParams.get("search");

        if (searchQuery) {
            filtered = fuzzySearch(filtered, searchQuery);
        }

        if (priceRange) {
            filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
        }

        // Sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "price-low":
                    return a.price - b.price;
                case "price-high":
                    return b.price - a.price;
                case "newest":
                    // Assuming id or createdAt can be used for newest. 
                    // Products from Firestore usually have a string ID which isn't chronological.
                    // But if we have createdAt, we should use it.
                    return 0;
                case "rating":
                    return (b.rating || 0) - (a.rating || 0);
                case "best-selling":
                default:
                    return (b.reviews || 0) - (a.reviews || 0);
            }
        });

        return filtered;
    }, [products, searchParams, priceRange, sortBy]);

    if (isLoading && products.length === 0) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        image={product.image}
                        category={product.category}
                    />
                ))}
            </div>

            {hasMore && (
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

