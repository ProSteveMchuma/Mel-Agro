"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ProductRow from "@/components/ProductRow";
import ProductCard from "@/components/ProductCard";
import { Product, getProductsPage } from "@/lib/products";
import { fuzzySearch } from "@/components/SmartSearch";
import { useSearchParams } from "next/navigation";

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // State for filters - initialize from URL
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
    const [sortBy, setSortBy] = useState("best-selling");

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
    };

    const categories = ["Seeds", "Fertilizers", "Crop Protection Products", "Animal Feeds", "Veterinary Products", "Farm Tools", "Irrigation"];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow">
                {/* Breadcrumb */}
                <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
                    <div className="container-custom px-4 md:px-8 py-3">
                        <nav className="flex items-center gap-2 text-sm">
                            <Link href="/" className="text-gray-600 hover:text-melagro-primary transition-colors">Home</Link>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <Link href="/products" className="text-gray-600 hover:text-melagro-primary transition-colors">Shop</Link>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <span className="text-melagro-primary font-semibold">
                                {selectedCategory || "All Products"}
                            </span>
                        </nav>
                    </div>
                </div>

                {/* Main Content with Sidebar */}
                <div className="flex flex-col lg:flex-row container-custom py-8 gap-8 px-4">
                    {/* Sidebar Filter */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <Sidebar
                            categories={categories}
                            onCategoryChange={handleCategoryChange}
                            onPriceChange={setPriceRange}
                        />
                    </div>

                    <div className="flex-1">
                        {/* Page Title & Controls */}
                        <div className="mb-8">
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tighter uppercase">
                                {selectedCategory || "All Products"}
                            </h1>
                            <p className="text-gray-600 mb-6 font-medium">Browse our wide range of quality agricultural inputs.</p>

                            {/* Sort and Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                    Quality Inputs for Productive Farming
                                </p>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                        <span className="text-gray-400">Sort By:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-melagro-primary/50 cursor-pointer hover:bg-gray-100 transition-all font-black"
                                        >
                                            <option value="best-selling">Best Selling</option>
                                            <option value="price-low">Price: Low to High</option>
                                            <option value="price-high">Price: High to Low</option>
                                            <option value="newest">Newest</option>
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

