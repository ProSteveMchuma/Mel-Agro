"use client";

import ProductCard from "./ProductCard";
import { useEffect, useState } from "react";
import { getProducts, Product } from "@/lib/products";

interface ProductRowProps {
    title: string;
    filter?: (p: Product) => boolean;
}

export default function ProductRow({ title, filter }: ProductRowProps) {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        getProducts().then(allProducts => {
            let filtered = allProducts;
            if (filter) {
                filtered = allProducts.filter(filter);
            }
            // Limit to 6-8 items for the row
            setProducts(filtered.slice(0, 8));
        });
    }, [filter]);

    if (products.length === 0) return null;

    return (
        <div className="py-6">
            <div className="flex items-center justify-between mb-4 px-4 md:px-0">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <button className="text-sm font-medium text-melagro-primary hover:text-melagro-secondary transition-colors">
                    View All &rarr;
                </button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 px-4 md:px-0 scrollbar-hide snap-x">
                {products.map(product => (
                    <div key={product.id} className="w-44 md:w-56 flex-shrink-0 snap-start">
                        <ProductCard
                            id={product.id}
                            name={product.name}
                            price={product.price}
                            image={product.image}
                            category={product.category}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
