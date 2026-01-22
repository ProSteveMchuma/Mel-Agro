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
            <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-green-200 flex flex-col h-full cursor-pointer relative">
                {/* Image Section */}
                <div className="relative aspect-square overflow-hidden bg-[#f8fcf9] flex items-center justify-center p-6">
                    <Image
                        src={imageSrc}
                        alt={name}
                        fill
                        className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
                    />

                    {/* Quick Action Overlay */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center gap-4">
                        <button
                            onClick={handleAddToCart}
                            className="bg-white text-gray-900 p-3 rounded-full shadow-lg transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500 delay-75 hover:bg-green-500 hover:text-white"
                            title="Quick Add"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const msg = encodeURIComponent(`*PRODUCT INQUIRY*\n\nI am interested in: *${name}*\nPrice: KES ${safePrice.toLocaleString()}\n\nIs this available?`);
                                window.open(`https://wa.me/254748970757?text=${msg}`, '_blank');
                            }}
                            className="bg-[#25D366] text-white p-3 rounded-full shadow-lg transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500 delay-150 hover:bg-[#128C7E]"
                            title="WhatsApp Inquiry"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.038 3.284l-.54 1.964 2.009-.528c.954.524 1.942.85 3.037.852 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.772-5.744-5.772zm3.374 8.086c-.1.272-.58.513-.801.551-.237.042-.46.079-.769-.015-.297-.091-.676-.239-1.144-.442-1.99-.861-3.284-2.885-3.383-3.018-.099-.134-.736-.979-.736-1.959 0-.979.512-1.46.694-1.658.183-.198.396-.247.53-.247.13 0 .26.012.37.012.11 0 .26-.041.408.321.148.36.512 1.25.56 1.348.049.099.083.214.016.347-.066.13-.1.214-.2.33-.1.115-.208.261-.297.35-.099.099-.198.198-.083.396.115.198.512.845 1.099 1.366.759.673 1.398.882 1.596.981.198.099.313.082.43-.049.115-.132.512-.596.644-.793.132-.198.26-.165.43-.099.172.066 1.09.514 1.277.613.183.1.312.148.363.23.049.082.049.479-.05.751z" />
                            </svg>
                        </button>
                    </div>

                    {/* Discount Badge */}
                    <div className="absolute top-4 left-4 bg-[#22c55e] text-white px-2 py-1 rounded-lg text-[10px] font-black shadow-lg z-10 uppercase tracking-tighter">
                        -{discountPercent}% OFF
                    </div>

                    {/* Wishlist Button */}
                    <button
                        onClick={toggleWishlist}
                        className={`absolute top-4 right-4 p-2.5 rounded-full z-10 transition-all duration-300 backdrop-blur-md ${inWishlist
                            ? "bg-red-500 text-white shadow-lg scale-110"
                            : "bg-white/90 text-gray-300 hover:text-red-500 border border-gray-100 opacity-0 group-hover:opacity-100"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={inWishlist ? "currentColor" : "none"} viewBox="0 0 20 20" stroke="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-grow">
                    {/* Category Label */}
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.1em] mb-1 opacity-70">
                        {category}
                    </p>

                    {/* Product Name */}
                    <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 leading-tight group-hover:text-green-600 transition-colors min-h-[2.5rem] tracking-tight">
                        {name}
                    </h3>

                    {/* Price Section */}
                    <div className="mb-5 mt-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl font-black text-gray-900">
                                KES {safePrice.toLocaleString()}
                            </span>
                            <span className="text-gray-400 line-through text-xs font-medium">
                                KES {originalPrice.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Double Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleAddToCart}
                            disabled={isAdding}
                            className={`py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ${isAdding
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-gray-900 text-white hover:bg-[#22c55e] shadow-sm hover:shadow-green-200"
                                }`}
                        >
                            {isAdding ? "Added!" : "Add Cart"}
                        </button>

                        <button
                            onClick={handleBuyNow}
                            className="py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-900 hover:border-gray-900 transition-all shadow-sm"
                        >
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
