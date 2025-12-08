"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
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
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isAdding, setIsAdding] = useState(false);

    const safePrice = typeof price === 'number' ? price : 0;
    const imageSrc = (typeof image === 'string' && image.startsWith('http')) ? image : "https://placehold.co/400x400?text=No+Image";
    const inWishlist = isInWishlist(id);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAdding(true);

        const productForCart = {
            id: String(id),
            name,
            price: safePrice,
            image: imageSrc,
            category,
            description: "",
            inStock: true,
            rating: 5,
            reviews: 0
        };

        addToCart(productForCart, 1);
        setTimeout(() => setIsAdding(false), 1000);
    };

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (inWishlist) {
            removeFromWishlist(id);
        } else {
            addToWishlist({
                id,
                name,
                price: safePrice,
                image: imageSrc,
                category,
                inStock: true,
                rating: 5,
                reviews: 0,
                stockQuantity: 0,
                lowStockThreshold: 0
            });
        }
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
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-melagro-primary shadow-sm z-10">
                    {category}
                </div>
                <button
                    onClick={toggleWishlist}
                    className={`absolute top-3 right-3 p-2 rounded-full shadow-sm z-10 transition-colors ${inWishlist ? "bg-red-50 text-red-500" : "bg-white/90 text-gray-400 hover:text-red-500"
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </button>
            </Link>

            <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 group-hover:text-melagro-primary transition-colors leading-tight min-h-[2.5em]">
                    <Link href={`/products/${id}`}>
                        {name}
                    </Link>
                </h3>
                <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-melagro-primary">
                        KES {safePrice.toLocaleString()}
                    </span>
                    <button
                        onClick={handleAddToCart}
                        disabled={isAdding}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${isAdding
                            ? "bg-green-500 text-white"
                            : "bg-melagro-primary text-white hover:bg-melagro-secondary"
                            }`}
                    >
                        {isAdding ? "Added" : "Add"}
                    </button>
                </div>
            </div>
        </div>
    );
}
