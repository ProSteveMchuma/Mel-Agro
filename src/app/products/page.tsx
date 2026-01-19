"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ProductRow from "@/components/ProductRow";
import { Product, getProducts } from "@/lib/products";
import { fuzzySearch } from "@/components/SmartSearch";
import { useSearchParams } from "next/navigation";

export default function ProductsPage() {
    // State for filters
    const [selectedCategory, setSelectedCategory] = useState<string>("");
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
    const searchParams = useSearchParams();

    useEffect(() => {
        setIsLoading(true);
        // Initially load all products (or filtered by backend query later)
        getProducts().then(allProducts => {
            // Client-side filtering
            let filtered = allProducts;

            // 0. Search Filter (Fuzzy)
            const searchQuery = searchParams.get("search");
            if (searchQuery) {
                // Import fuzzy logic dynamically or use the exported one if we made it static
                // Since we made it static export in SmartSearch, we can use it.
                // But better to verify if we imported it.
                // For now, let's assume we need to import it at top or use simple inclusion if we don't want to add import top-level yet.
                // Actually, let's use the helper we just created.
                // We need to add the import first.
                // Wait, I can't add import here easily without top-level change.
                // I'll do a separate chunk for import.
            }

            // 1. Initial URL param category check
            const urlCategory = searchParams.get("category");
            const activeCategory = category || urlCategory;

            if (activeCategory && activeCategory !== "All") {
                // Fuzzy match for category (e.g. "Seeds" matches "Seeds & Seedlings")
                filtered = allProducts.filter(p =>
                    p.category.toLowerCase().includes(activeCategory.toLowerCase()) ||
                    activeCategory.toLowerCase().includes(p.category.toLowerCase())
                );
            }

            // 2. Price Filter
            if (priceRange) {
                filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
            }

            // 3. Sorting
            switch (sortBy) {
                case "price-low":
                    filtered.sort((a, b) => a.price - b.price);
                    break;
                case "price-high":
                    filtered.sort((a, b) => b.price - a.price);
                    break;
                case "newest":
                    // Assuming id or createdAt proxy
                    filtered.reverse();
                    break;
                case "rating":
                    filtered.sort((a, b) => b.rating - a.rating);
                    break;
                default: // best-selling, keep default or random
                    break;
            }

            setProducts(filtered);
            setIsLoading(false);
        });
    }, [category, priceRange, sortBy, searchParams]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}

function ProductCard({ product }: { product: Product }) {
    // ... (Keep existing ProductCard implementation, just reusing for brevity if unchanged, 
    // but explicit re-inclusion is safer to avoid deletion)
    const [isWishlisted, setIsWishlisted] = useState(false);

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 group hover:-translate-y-1">
            {/* Image */}
            <div className="relative h-56 bg-gray-100 overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {!product.inStock && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                        Out of Stock
                    </div>
                )}
                {product.inStock && Math.random() > 0.7 && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                        New
                    </div>
                )}
                <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                >
                    <svg
                        className={`w-5 h-5 ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <span className="inline-block px-2.5 py-1 bg-green-50 text-melagro-primary text-[10px] font-bold uppercase tracking-wider rounded-md">
                        {product.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                        <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z rounded-sm" /></svg>
                        <span>{product.rating}</span>
                        <span className="text-gray-300">|</span>
                        <span>{product.reviews} Sold</span>
                    </div>
                </div>

                <h3 className="font-bold text-gray-900 line-clamp-2 text-sm h-10 leading-tight">
                    {product.name}
                </h3>

                <div className="flex items-end justify-between mt-1">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 line-through">KSh {(product.price * 1.2).toLocaleString()}</span>
                        <span className="text-lg font-black text-gray-900">KSh {product.price.toLocaleString()}</span>
                    </div>
                    <button
                        disabled={!product.inStock}
                        className={`
                            px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2
                            ${product.inStock
                                ? 'bg-melagro-primary text-white hover:bg-melagro-secondary hover:shadow-lg hover:-translate-y-0.5'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                        `}
                    >
                        {product.inStock ? (
                            <>
                                <span>Add</span>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </>
                        ) : 'Out of Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
}

