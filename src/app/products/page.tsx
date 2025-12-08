"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useProducts } from "@/context/ProductContext";

function ProductsContent() {
    const { products } = useProducts();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search');
    const initialCategory = searchParams.get('category');

    // Derive categories from products
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (products.length > 0) {
            const unique = Array.from(new Set(products.map(p => p.category))).sort();
            setCategories(["All", ...unique]);
        } else {
            // Fallback if no products yet
            setCategories(["All", "Fertilizers", "Seeds", "Crop Protection", "Animal Feeds"]);
        }
    }, [products]);

    const [activeCategory, setActiveCategory] = useState("All");

    // Sync with URL param on mount or change
    useEffect(() => {
        if (initialCategory) {
            // Capitalize first letter to match category names if needed, or just use as is if they match
            const match = categories.find(c => c.toLowerCase() === initialCategory.toLowerCase());
            if (match) {
                setActiveCategory(match);
            } else if (initialCategory !== null) {
                setActiveCategory(initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1));
            }
        }

        if (initialSearch) {
            setSearchTerm(initialSearch);
        }
    }, [initialCategory, initialSearch, categories]);

    const [filteredProducts, setFilteredProducts] = useState(products);
    const [sortBy, setSortBy] = useState("featured");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        let result = [...products];

        // Filter by Category
        if (activeCategory !== "All") {
            result = result.filter((p) => p.category === activeCategory);
        }

        // Filter by Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerTerm) ||
                p.tags?.some(tag => tag.toLowerCase().includes(lowerTerm))
            );
        }

        // Sort
        if (sortBy === "price-low") {
            result.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-high") {
            result.sort((a, b) => b.price - a.price);
        } else if (sortBy === "name-asc") {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "name-desc") {
            result.sort((a, b) => b.name.localeCompare(a.name));
        }

        setFilteredProducts(result);
    }, [activeCategory, sortBy, searchTerm, products]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            {/* Page Header */}
            <div className="bg-melagro-primary text-white py-16">
                <div className="container-custom text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Our Products</h1>
                    <p className="text-lg text-gray-200 max-w-2xl mx-auto">
                        Browse our extensive collection of premium agricultural inputs. From certified seeds to effective crop protection, we have everything you need for a bountiful harvest.
                    </p>
                </div>
            </div>

            <main className="flex-grow py-12">
                <div className="container-custom">
                    <Breadcrumbs />
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar Filters */}
                        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
                            {/* Search */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Search</h3>
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 focus:border-melagro-primary outline-none"
                                />
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Categories</h3>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            onClick={() => setActiveCategory(category)}
                                            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${activeCategory === category
                                                ? "bg-melagro-primary text-white font-medium"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-melagro-primary"
                                                }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Sort By</h3>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-melagro-primary/50 focus:border-melagro-primary outline-none"
                                >
                                    <option value="featured">Featured</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="name-asc">Name: A to Z</option>
                                    <option value="name-desc">Name: Z to A</option>
                                </select>
                            </div>
                        </aside>

                        {/* Product Grid */}
                        <div className="flex-grow">
                            <div className="mb-6 flex items-center justify-between">
                                <p className="text-gray-500">
                                    Showing <span className="font-bold text-gray-900">{filteredProducts.length}</span> results
                                </p>
                            </div>

                            {filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                                    {filteredProducts.map((product) => (
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
                            ) : (
                                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                                    <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
                                    <button
                                        onClick={() => { setActiveCategory("All"); setSearchTerm(""); }}
                                        className="mt-4 text-melagro-primary font-medium hover:underline"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div></div>}>
            <ProductsContent />
        </Suspense>
    );
}
