"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

interface ProductCardProps {
    id: string | number;
    name: string;
    price: number;
    image?: string;
    category: string;
}

export default function ProductCard({ id, name, price, image, category }: ProductCardProps) {
    const { addToCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);
    const safePrice = typeof price === 'number' ? price : 0;
    const imageSrc = (typeof image === 'string' && image.startsWith('http')) ? image : "https://placehold.co/400x400?text=No+Image";

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation if inside a Link
        e.stopPropagation();
        setIsAdding(true);

        // Create a minimal product object for cart
        const productForCart = {
            id: String(id),
            name,
            price: safePrice,
            image: imageSrc,
            category,
            description: "", // Not needed for cart list
            inStock: true,
            rating: 5,
            reviews: 0
        };

        addToCart(productForCart, 1);

        // Visual feedback
        setTimeout(() => setIsAdding(false), 1000);
    };

    return (
        <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full relative">
            <Link href={`/products/${id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
                <Image
                    src={imageSrc}
                    alt={name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-melagro-primary shadow-sm">
                    {category}
                </div>
            </Link>

            <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 group-hover:text-melagro-primary transition-colors">
                    <Link href={`/products/${id}`}>
                        {name}
                    </Link>
                </h3>
                <div className="mt-auto flex items-center justify-between">
                    <span className="text-xl font-bold text-melagro-primary">
                        KES {safePrice.toLocaleString()}
                    </span>
                    <button
                        onClick={handleAddToCart}
                        disabled={isAdding}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${isAdding
                            ? "bg-green-500 text-white"
                            : "bg-melagro-primary text-white hover:bg-melagro-secondary"
                            }`}
                    >
                        {isAdding ? "Added" : "Add to Cart"}
                    </button>
                </div>
            </div>
        </div>
    );
}
