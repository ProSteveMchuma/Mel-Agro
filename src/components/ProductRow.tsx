"use client";

import ProductCard from "./ProductCard";
import { useEffect, useState } from "react";
import { getProducts, Product } from "@/lib/products";
import Link from "next/link";

interface ProductRowProps {
    title?: string;
    filter?: (p: Product) => boolean;
}

export default function ProductRow({ title = "", filter }: ProductRowProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        getProducts().then(allProducts => {
            let filtered = allProducts;
            if (filter) {
                filtered = allProducts.filter(filter);
            }
            // Limit to 12 items for the grid
            setProducts(filtered.slice(0, 12));
            setIsLoading(false);
        });
    }, [filter]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded-xl aspect-square animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <div>
            {title && (
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                    <Link href="/products" className="text-sm font-semibold text-melagri-primary hover:text-melagri-secondary transition-colors flex items-center gap-1 group">
                        View All
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {products.map(product => (
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
    );
}
