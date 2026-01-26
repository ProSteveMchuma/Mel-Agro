"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useProducts } from "@/context/ProductContext";

export default function ShopLayout({ showBreadcrumbs = true }: { showBreadcrumbs?: boolean }) {
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
            setCategories(["All", "Animal Feeds", "Fertilizers", "Seeds", "Crop Protection Products", "Veterinary Products"]);
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
        <div className="container-custom py-8">
            {showBreadcrumbs && <Breadcrumbs />}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
                    {/* Search */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Search</h3>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-melagri-primary/50 focus:border-melagri-primary outline-none"
                        />
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Categories</h3>
                        <div className="space-y-1.5">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory === category
                                        ? "bg-melagri-primary text-white font-medium shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-melagri-primary"
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Sort By</h3>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-melagri-primary/50 focus:border-melagri-primary outline-none"
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
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-gray-500 text-sm">
                            Showing <span className="font-bold text-gray-900">{filteredProducts.length}</span> results
                        </p>
                    </div>

                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
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
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                            <p className="text-gray-500 text-lg">No products found.</p>
                            <button
                                onClick={() => { setActiveCategory("All"); setSearchTerm(""); }}
                                className="mt-4 text-melagri-primary font-medium hover:underline"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
