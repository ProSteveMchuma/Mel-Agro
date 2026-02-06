"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductVariant } from "@/types";
import { useBehavior } from "@/context/BehaviorContext";

interface ProductCardProps {
    id: string | number;
    name: string;
    price: number;
    image?: string;
    images?: string[]; // Fallback gallery images
    category: string;
    variants?: ProductVariant[];
}

export default function ProductCard({ id, name, price, image, images = [], category, variants = [] }: ProductCardProps) {
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isAdding, setIsAdding] = useState(false);

    const safePrice = typeof price === 'number' ? price : 0;

    // Use image if provided, otherwise first image from gallery, otherwise placeholder
    const rawImage = image || (images.length > 0 ? images[0] : "");
    const imageSrc = (typeof rawImage === 'string' && rawImage.startsWith('http')) ? rawImage : "https://placehold.co/400x400?text=No+Image";

    const inWishlist = isInWishlist(id);
    const router = useRouter();
    const { trackAction } = useBehavior();

    const handleView = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        trackAction('product_view', { id, name, category });
        router.push(`/products/${id}`);
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAdding(true);
        trackAction('cart_add', { id, name, category, price: safePrice });

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

    const originalPrice = safePrice;
    const discountPercent = 0;

    return (
        <Link href={`/products/${id}`}>
            <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-green-200 flex flex-col h-full cursor-pointer relative">
                {/* Image Section */}
                <div className="relative aspect-square overflow-hidden bg-[#f8fcf9] flex items-center justify-center p-3 md:p-6 text-center">
                    <Image
                        src={imageSrc}
                        alt={name}
                        fill
                        className="object-contain p-2 md:p-3 group-hover:scale-110 transition-transform duration-700 ease-out"
                        unoptimized={imageSrc.includes('firebasestorage')}
                    />

                    {/* Quick Action Overlay - Hidden on mobile, shown on md+ hover */}
                    <div className="hidden md:flex absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 items-center justify-center gap-4">
                        <button
                            onClick={handleAddToCart}
                            className="bg-white text-gray-900 p-3 rounded-full shadow-lg transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500 delay-75 hover:bg-green-500 hover:text-white"
                            title="Quick Add"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                        <button
                            onClick={handleView}
                            className="bg-white text-gray-900 p-3 rounded-full shadow-lg transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500 delay-150 hover:bg-green-500 hover:text-white"
                            title="View Details"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                    </div>


                    {/* Wishlist Button */}
                    <button
                        onClick={toggleWishlist}
                        className={`absolute top-2 right-2 md:top-4 md:right-4 p-2 md:p-2.5 rounded-full z-10 transition-all duration-300 backdrop-blur-md ${inWishlist
                            ? "bg-red-500 text-white shadow-lg scale-110"
                            : "bg-white/90 text-gray-300 hover:text-red-500 border border-gray-100 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4" fill={inWishlist ? "currentColor" : "none"} viewBox="0 0 20 20" stroke="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-3 md:p-5 flex flex-col flex-grow">
                    {/* Category Label */}
                    <p className="text-[8px] md:text-[10px] font-black text-green-600 uppercase tracking-[0.1em] mb-1 opacity-70">
                        {category}
                    </p>

                    {/* Product Name */}
                    <h3 className="font-bold text-gray-900 mb-2 md:mb-3 line-clamp-2 leading-tight group-hover:text-green-600 transition-colors min-h-[2.2rem] md:min-h-[2.5rem] tracking-tight text-xs md:text-sm">
                        {name}
                    </h3>

                    {/* Price Section */}
                    <div className="mb-3 md:mb-5 mt-auto">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                            {variants.length > 0 && variants.some(v => v.price && v.price !== price) && (
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block w-full">From</span>
                            )}
                            <span className="text-lg md:text-xl font-black text-gray-900">
                                KES {safePrice.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Double Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2 mt-auto">
                        <button
                            onClick={handleAddToCart}
                            disabled={isAdding}
                            className={`
                                w-full py-3 md:py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-200 active:scale-95
                                ${isAdding
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gray-900 text-white hover:bg-[#22c55e] shadow-md hover:shadow-green-200"
                                }
                            `}
                        >
                            {isAdding ? "Added!" : "Add to Cart"}
                        </button>

                        <button
                            onClick={handleView}
                            className="hidden md:block w-full py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-900 hover:border-gray-900 transition-all shadow-sm hover:bg-gray-50 active:scale-95"
                        >
                            View
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
