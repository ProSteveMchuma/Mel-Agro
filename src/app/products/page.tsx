"use client";

import React, { Suspense, useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ProductRow from "@/components/ProductRow";
import { Product, getProducts } from "@/lib/products";

export default function ProductsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("");

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
                            <a href="/shop" className="text-gray-600 hover:text-melagro-primary transition-colors">Shop</a>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            <span className="text-melagro-primary font-semibold">Agricultural Inputs</span>
                        </nav>
                    </div>
                </div>

                {/* Main Content with Sidebar */}
                <div className="flex">
                    <Sidebar onCategoryChange={setSelectedCategory} />
                    
                    <div className="flex-1 container-custom px-4 md:px-8 py-12">
                        {/* Page Title */}
                        <div className="mb-12">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Agricultural Inputs</h1>
                            <p className="text-gray-600">Browse our wide range of quality fertilizers, seeds, and farm tools.</p>
                        </div>

                        {/* Sort and Filter Bar */}
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                            <p className="text-sm text-gray-600">Showing 1-9 of 45 results</p>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">Sort By:</span>
                                    <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-melagro-primary/50">
                                        <option>Best Selling</option>
                                        <option>Price: Low to High</option>
                                        <option>Price: High to Low</option>
                                        <option>Newest</option>
                                        <option>Top Rated</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Suspense fallback={
                                <div className="col-span-full flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div>
                                </div>
                            }>
                                <ProductsGrid category={selectedCategory} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function ProductsGrid({ category }: { category: string }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        getProducts().then(allProducts => {
            let filtered = allProducts;
            if (category) {
                filtered = allProducts.filter(p => p.category === category);
            }
            setProducts(filtered.slice(0, 9));
            setIsLoading(false);
        });
    }, [category]);

    if (isLoading) return null;

    return (
        <>
            {products.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </>
    );
}

function ProductCard({ product }: { product: Product }) {
    const [isWishlisted, setIsWishlisted] = useState(false);

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300 group">
            {/* Image */}
            <div className="relative h-56 bg-gray-100 overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.inStock === false && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        Out of Stock
                    </div>
                )}
                <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all"
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
            <div className="p-4 space-y-3">
                {/* Category */}
                <span className="inline-block px-2 py-1 bg-green-100 text-melagro-primary text-xs font-semibold rounded">
                    {product.category}
                </span>

                {/* Name */}
                <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                    {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-2 text-xs">
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <svg
                                key={i}
                                className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300 fill-current'}`}
                                viewBox="0 0 20 20"
                            >
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                        ))}
                    </div>
                    <span className="text-gray-500">({product.reviews})</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900">KSh {product.price.toLocaleString()}</span>
                </div>

                {/* Add to Cart Button */}
                <button disabled={!product.inStock} className={`w-full ${product.inStock ? 'bg-melagro-primary hover:bg-melagro-secondary' : 'bg-gray-300'} text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </div>
    );
}

