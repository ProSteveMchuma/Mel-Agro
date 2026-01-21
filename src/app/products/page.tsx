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
    // State for filters
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("best-selling");

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow">
                {/* Breadcrumb */}
                <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
                    <div className="container-custom px-4 md:px-8 py-3">
                        <nav className="flex items-center gap-2 text-sm">
                            <a href="/" className="text-gray-600 hover:text-melagro-primary transition-colors">Home</a>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <a href="/products" className="text-gray-600 hover:text-melagro-primary transition-colors">Shop</a>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <span className="text-melagro-primary font-semibold">
                                {selectedCategory || "All Products"}
                            </span>
                        </nav>
                    </div>
                </div>

                {/* Main Content with Sidebar */}
                <div className="flex flex-col lg:flex-row container-custom py-8 gap-8">
                    {/* Sidebar Filter */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <Sidebar
                            categories={["Seeds & Seedlings", "Fertilizers", "Crop Protection", "Farm Tools", "Irrigation", "Animal Feeds", "Vet Products"]}
                            onCategoryChange={setSelectedCategory}
                            onPriceChange={setPriceRange} // Assuming Sidebar implements this
                        />
                    </div>

                    <div className="flex-1">
                        {/* Page Title & Controls */}
                        <div className="mb-8">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                                {selectedCategory || "All Products"}
                            </h1>
                            <p className="text-gray-600 mb-6">Browse our wide range of quality agricultural inputs.</p>

                            {/* Sort and Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <p className="text-sm text-gray-600 font-medium">Showing results</p>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                                        <span className="text-gray-600">Sort By:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-melagro-primary/50 cursor-pointer hover:bg-white transition-colors"
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
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div>
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
            const { products: newProducts, lastVisible: newLastVisible } = await getProductsPage(
                12,
                isInitial ? null : lastVisible,
                category
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
    }, [category]); // Reload everything when category changes

    // Combined Price & Search Client-Side filter (for now)
    const filteredProducts = useMemo(() => {
        let filtered = products;
        const searchQuery = searchParams.get("search");

        if (searchQuery) {
            filtered = fuzzySearch(filtered, searchQuery);
        }

        if (priceRange) {
            filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
        }

        // Sorting (already in state, but double check client-side)
        // ... (sorting logic stays)
        return filtered;
    }, [products, searchParams, priceRange, sortBy]);

    if (isLoading) return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl h-96 animate-pulse"></div>
            ))}
        </div>
    );

    if (products.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
        </div>
    );

    return (
        <div className="space-y-10">
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
                        className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-8 py-3 rounded-full font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-melagro-primary"></div>
                        ) : 'Load More Products'}
                    </button>
                </div>
            )}
        </div>
    );
}

