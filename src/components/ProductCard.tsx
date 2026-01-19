"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    const router = useRouter();

    const handleBuyNow = (e: React.MouseEvent) => {
        handleAddToCart(e);
        router.push('/checkout');
    };

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
            reviews: 0,
            stockQuantity: 100,
            lowStockThreshold: 10
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

    // Mock discount for visual parity with reference image
    const originalPrice = Math.round(safePrice * 1.15); // 15% mockup
    const discountPercent = 15;

    return (
        <Link href={`/products/${id}`}>
            <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-melagro-primary/30 flex flex-col h-full cursor-pointer">
                {/* Image Section */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <Image
                        src={imageSrc}
                        alt={name}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-500 p-3"
                    />

                    {/* Discount Badge */}
                    <div className="absolute top-3 left-3 bg-melagro-accent text-melagro-primary px-2 py-1 rounded-lg text-xs font-bold shadow-md z-10">
                        -{discountPercent}%
                    </div>

                    {/* Wishlist Button */}
                    <button
                        onClick={toggleWishlist}
                        className={`absolute top-3 right-3 p-2 rounded-full z-10 transition-all duration-300 backdrop-blur-sm ${inWishlist
                            ? "bg-red-500/90 text-white shadow-lg"
                            : "bg-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={inWishlist ? "currentColor" : "none"} viewBox="0 0 20 20" stroke="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-4 flex flex-col flex-grow">
                    {/* Category Badge */}
                    <div className="mb-2">
                        <span className="inline-block bg-melagro-primary/10 text-melagro-primary text-xs font-semibold px-2 py-1 rounded-full">
                            {category}
                        </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="font-semibold text-sm text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-melagro-primary transition-colors min-h-[2.5rem]">
                        {name}
                    </h3>

                    {/* Price Section */}
                    <div className="mb-4 mt-auto">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xl font-bold text-melagro-primary">
                                KES {safePrice.toLocaleString()}
                            </span>
                            <span className="text-gray-400 line-through text-sm">
                                KES {originalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleAddToCart(e);
                            }}
                            disabled={isAdding}
                            className={`py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${isAdding
                                ? "bg-green-600 text-white"
                                : "bg-melagro-primary/10 text-melagro-primary hover:bg-melagro-primary hover:text-white"
                                }`}
                        >
                            {isAdding ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    Add
                                </>
                            )}
                        </button>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleBuyNow(e);
                            }}
                            className="py-2.5 rounded-lg font-semibold text-sm bg-melagro-accent text-melagro-primary hover:bg-melagro-accent/90 transition-all duration-300 flex items-center justify-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            Buy
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
