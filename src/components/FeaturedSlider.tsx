"use client";

import { useEffect, useState } from 'react';
import { getFeaturedProducts, Product } from '@/lib/products';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useLiveProduct } from '@/context/ProductContext';
import { productSeoPath } from '@/lib/seo';

export default function FeaturedSlider({ products: initialProducts }: { products?: Product[] }) {
    const [products, setProducts] = useState<Product[]>(initialProducts || []);
    const [activeIndex, setActiveIndex] = useState(0);
    const { addToCart } = useCart();
    const [loading, setLoading] = useState(!initialProducts);

    useEffect(() => {
        if (initialProducts) {
            setProducts(initialProducts);
            setLoading(false);
            return;
        }

        const fetchFeatured = async () => {
            const featured = await getFeaturedProducts(5);
            setProducts(featured);
            setLoading(false);
        };
        fetchFeatured();
    }, [initialProducts]);

    useEffect(() => {
        if (products.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % products.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [products]);

    const currentProduct = useLiveProduct(products[activeIndex] || {
        id: '',
        name: '',
        price: 0,
        category: '',
        inStock: false,
        stockQuantity: 0,
    });

    if (loading) {
        return (
            <div className="w-full h-[min(70vw,380px)] sm:h-[500px] min-h-[300px] bg-gray-50 animate-pulse rounded-2xl md:rounded-[2.5rem] flex items-center justify-center">
                <div className="text-gray-300 font-bold uppercase tracking-widest text-xs sm:text-sm">Loading Featured...</div>
            </div>
        );
    }

    if (products.length === 0) return null;

    const featuredVariant = currentProduct.variants?.length === 1 ? currentProduct.variants[0] : undefined;
    const requiresOptions = (currentProduct.variants?.length || 0) > 1;
    const featuredStock = Number(featuredVariant?.stockQuantity ?? currentProduct.stockQuantity ?? currentProduct.stock ?? 0);
    const isAvailable = currentProduct.inStock !== false && featuredStock > 0;

    return (
        <div className="relative w-full h-[min(75vw,420px)] sm:h-[500px] min-h-[320px] overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-gray-900 shadow-2xl group border border-gray-800/50">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentProduct.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                        <Image
                            src={currentProduct.image || "/assets/images/placeholder.png"}
                            alt={currentProduct.name}
                            fill
                            className="object-cover object-center opacity-80 md:opacity-70 group-hover:scale-105 transition-all duration-[2s] ease-out"
                            priority
                        />
                        {/* Improved Gradient for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent md:bg-gradient-to-r" />
                    </div>

                    {/* Content — extra bottom pad so CTAs clear the dots */}
                    <div className="relative h-full flex flex-col justify-end md:justify-center px-4 sm:px-6 md:px-20 pb-14 sm:pb-16 md:pb-0 z-10 pr-24 sm:pr-6 md:pr-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="flex flex-col items-start max-w-full"
                        >
                            <span className="bg-green-500 text-white text-[10px] md:text-sm font-black uppercase tracking-[0.2em] px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-full mb-2 sm:mb-3 md:mb-6 shadow-lg shadow-green-900/20 backdrop-blur-sm">
                                Featured Pick
                            </span>
                            <h2 className="text-xl sm:text-2xl md:text-5xl font-black text-white mb-4 sm:mb-6 md:mb-10 leading-[1.15] tracking-tighter uppercase max-w-2xl drop-shadow-lg line-clamp-2">
                                {currentProduct.name}
                            </h2>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 md:gap-4 w-full sm:w-auto">
                                <Link
                                    href={productSeoPath(currentProduct)}
                                    className="bg-white text-gray-900 px-5 py-3 md:px-8 md:py-3.5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-green-50 transition-all text-center shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 min-h-11 flex items-center justify-center"
                                >
                                    View Details
                                </Link>
                                {requiresOptions ? (
                                    <Link
                                        href={productSeoPath(currentProduct)}
                                        className="bg-green-600/90 backdrop-blur-md border border-white/10 text-white px-5 py-3 md:px-8 md:py-3.5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-green-500 transition-all shadow-xl shadow-green-900/20 hover:-translate-y-1 active:scale-95 flex justify-center items-center min-h-11"
                                    >
                                        Choose Options
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => addToCart(currentProduct, 1, featuredVariant)}
                                        disabled={!isAvailable}
                                        className="bg-green-600/90 backdrop-blur-md border border-white/10 text-white px-5 py-3 md:px-8 md:py-3.5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-green-500 transition-all shadow-xl shadow-green-900/20 hover:-translate-y-1 active:scale-95 flex justify-center items-center min-h-11 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                    >
                                        {isAvailable ? 'Add To Cart' : 'Out of Stock'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            <div className="absolute bottom-3 sm:bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                {products.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        aria-label={`Show featured product ${idx + 1}`}
                        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    >
                        <span className={`transition-all duration-500 rounded-full h-1.5 md:h-2 block ${idx === activeIndex
                            ? 'w-6 md:w-10 bg-green-500'
                            : 'w-1.5 md:w-2 bg-white/30 hover:bg-white/50'
                            }`} />
                    </button>
                ))}
            </div>

            {/* Price Tag */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-10 md:right-10 z-20">
                <motion.div
                    key={currentProduct.price}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/30 backdrop-blur-xl border border-white/10 px-3 py-2.5 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-xl"
                >
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-green-400 uppercase tracking-widest mb-0.5 sm:mb-1 text-right">Price</p>
                    <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-[10px] sm:text-xs md:text-sm font-bold text-green-400">KES</span>
                        <span className="text-base sm:text-xl md:text-3xl font-black text-white leading-none tracking-tight">
                            {currentProduct.price.toLocaleString()}
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
