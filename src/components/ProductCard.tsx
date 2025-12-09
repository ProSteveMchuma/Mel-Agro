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

    // Mock discount for visual parity with reference image
    const originalPrice = Math.round(safePrice * 1.15); // 15% mockup
    const discountPercent = 15;

    return (
        <div className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 flex flex-col h-full relative">
            <Link href={`/products/${id}`} className="block relative aspect-square overflow-hidden bg-white p-2">
                <Image
                    src={imageSrc}
                    alt={name}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                />
                {/* Discount Badge */}
                <div className="absolute top-2 left-2 bg-[#D32F2F] text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm z-10">
                    -{discountPercent}%
                </div>

                {/* Wishlist Button */}
                <button
                    onClick={toggleWishlist}
                    className={`absolute top-2 right-2 p-1.5 rounded-full z-10 transition-colors ${inWishlist ? "bg-red-50 text-red-500" : "text-gray-300 hover:text-red-500"
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </button>
            </Link>

            <div className="p-2.5 flex flex-col flex-grow bg-white">
                <h3 className="font-medium text-[13px] text-gray-900 mb-1.5 line-clamp-2 leading-tight min-h-[2.4em] group-hover:text-melagro-primary transition-colors">
                    <Link href={`/products/${id}`}>
                        {name}
                    </Link>
                </h3>

                <div className="mt-auto">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2">
                        <span className="font-bold text-melagro-primary text-sm">
                            KES {safePrice.toLocaleString()}
                        </span>
                        <span className="text-gray-400 line-through text-[11px]">
                            {originalPrice.toLocaleString()}
                        </span>
                    </div>

                    <div className="flex gap-2 transition-all duration-300 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:pointer-events-none md:group-hover:pointer-events-auto">
                        <button
                            onClick={handleAddToCart}
                            disabled={isAdding}
                            className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition-all duration-300 flex items-center justify-center gap-1.5 uppercase tracking-wide ${isAdding
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-white text-melagro-primary border-melagro-primary hover:bg-melagro-primary hover:text-white"
                                }`}
                        >
                            {isAdding ? "Adding..." : "Add"}
                        </button>

                        <button
                            onClick={handleBuyNow}
                            className="flex-1 py-1.5 rounded text-[11px] font-bold border border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition-all duration-300 uppercase tracking-wide flex items-center justify-center"
                        >
                            Buy Now
                        </button>
                    </div>
                </div>

                <div className="mt-2 text-[10px] text-gray-400">
                    {category}
                </div>
            </div>
        </div>
    );
}
