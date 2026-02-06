"use client";

import { useEffect, useState } from 'react';
import { getFeaturedProducts, Product } from '@/lib/products';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

export default function FeaturedSlider() {
    const [products, setProducts] = useState<Product[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const { addToCart } = useCart();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeatured = async () => {
            const featured = await getFeaturedProducts(5);
            setProducts(featured);
            setLoading(false);
        };
        fetchFeatured();
    }, []);

    useEffect(() => {
        if (products.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % products.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [products]);

    if (loading) {
        return (
            <div className="w-full h-[500px] bg-gray-50 animate-pulse rounded-[2.5rem] flex items-center justify-center">
                <div className="text-gray-300 font-bold uppercase tracking-widest">Loading Featured...</div>
            </div>
        );
    }

    if (products.length === 0) return null;

    const currentProduct = products[activeIndex];

    return (
        <div className="relative w-full h-[280px] md:h-[500px] overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gray-900 shadow-2xl group border border-gray-800/50">
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
                            className="object-cover object-center opacity-70 group-hover:opacity-60 transition-opacity duration-700"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-gray-900/90 via-gray-900/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-end md:justify-center px-6 md:px-20 pb-8 md:pb-0 z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            <span className="bg-green-500 text-white text-[9px] md:text-xs font-black uppercase tracking-[0.2em] px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-full mb-3 md:mb-6 inline-block shadow-lg shadow-green-900/20">
                                Featured Pick
                            </span>
                            <h2 className="text-2xl md:text-6xl font-black text-white mb-2 md:mb-6 leading-none tracking-tighter uppercase max-w-2xl drop-shadow-sm">
                                {currentProduct.name}
                            </h2>
                            <p className="hidden md:block text-lg md:text-xl text-gray-200 mb-8 max-w-xl line-clamp-2 font-medium drop-shadow-sm">
                                {currentProduct.description || "Premium agricultural solution for your farm. Certified quality for maximum yield."}
                            </p>

                            <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0">
                                <Link
                                    href={`/product/${currentProduct.id}`}
                                    className="bg-white text-gray-900 px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm hover:bg-green-50 transition-all text-center shadow-xl"
                                >
                                    View
                                </Link>
                                <button
                                    onClick={() => {
                                        addToCart(currentProduct);
                                        toast.success(`Added ${currentProduct.name} to cart!`);
                                    }}
                                    className="bg-green-600/90 backdrop-blur-md border border-white/10 text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm hover:bg-green-600 transition-all shadow-xl shadow-green-900/20"
                                >
                                    Add To Cart
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {products.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`transition-all duration-500 rounded-full h-1.5 md:h-2 ${idx === activeIndex
                            ? 'w-6 md:w-10 bg-green-500'
                            : 'w-1.5 md:w-2 bg-white/30 hover:bg-white/50'
                            }`}
                    />
                ))}
            </div>

            {/* Price Tag - Hidden on very small screens if needed, or scaled down */}
            <div className="absolute top-4 right-4 md:top-10 md:right-10 z-20">
                <motion.div
                    key={currentProduct.price}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/20 backdrop-blur-xl border border-white/10 p-3 md:p-6 rounded-2xl md:rounded-3xl"
                >
                    <p className="hidden md:block text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Price</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs md:text-sm font-bold text-green-400">KES</span>
                        <span className="text-xl md:text-3xl font-black text-white leading-none">
                            {currentProduct.price.toLocaleString()}
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
