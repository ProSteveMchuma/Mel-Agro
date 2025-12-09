"use client";

import ProductCard from "./ProductCard";
import { useEffect, useState } from "react";
import { getProducts, Product } from "@/lib/products";

export default function FlashSaleStrip() {
    const [hotProducts, setHotProducts] = useState<Product[]>([]);

    useEffect(() => {
        getProducts().then(products => {
            // Simulate "Hot" deals by taking random or specific items
            setHotProducts(products.slice(0, 5));
        });
    }, []);

    return (
        <div className="mb-8 bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600 uppercase italic">Flash Sale</span>
                    <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-mono">03:12:45</span>
                </div>
                <button className="text-xs text-red-600 font-bold hover:underline">View All &rarr;</button>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
                {hotProducts.map(product => (
                    <div key={product.id} className="w-40 flex-shrink-0 snap-start">
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
