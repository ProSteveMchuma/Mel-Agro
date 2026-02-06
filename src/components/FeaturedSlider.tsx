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
        <div className="relative w-full h-[500px] overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gray-900 shadow-2xl group border border-gray-800/50">
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

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-end md:justify-center px-6 md:px-20 pb-10 md:pb-0 z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="flex flex-col items-start"
                        >
                            <span className="bg-green-500 text-white text-[10px] md:text-sm font-black uppercase tracking-[0.2em] px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-full mb-3 md:mb-6 shadow-lg shadow-green-900/20 backdrop-blur-sm">
                                Featured Pick
                            </span>
                            <h2 className="text-3xl md:text-6xl font-black text-white mb-3 md:mb-6 leading-[1.1] tracking-tighter uppercase max-w-2xl drop-shadow-lg filter">
                                {currentProduct.name}
                            </h2>
                            <p className="block text-base md:text-xl text-gray-200/90 mb-6 md:mb-8 max-w-xl line-clamp-3 font-medium drop-shadow-md leading-relaxed">
                                {currentProduct.description || "Premium agricultural solution for your farm. Certified quality for maximum yield."}
                            </p>

                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full md:w-auto">
                                <Link
                                    href={`/products/${currentProduct.id}`}
                                    className="bg-white text-gray-900 px-8 py-3.5 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-green-50 transition-all text-center shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95"
                                >
                                    View Details
                                </Link>
                                <button
                                    onClick={() => {
                                        addToCart(currentProduct);
                                        toast.success(`Added ${currentProduct.name} to cart!`);
                                    }}
                                    className="bg-green-600/90 backdrop-blur-md border border-white/10 text-white px-8 py-3.5 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-green-500 transition-all shadow-xl shadow-green-900/20 hover:-translate-y-1 active:scale-95 flex justify-center"
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

            {/* Price Tag */}
            <div className="absolute top-4 right-4 md:top-10 md:right-10 z-20">
                <motion.div
                    key={currentProduct.price}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/30 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-xl"
                >
                    <p className="text-[10px] md:text-xs font-black text-green-400 uppercase tracking-widest mb-1 text-right">Price</p>
                    <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-xs md:text-sm font-bold text-green-400">KES</span>
                        <span className="text-xl md:text-3xl font-black text-white leading-none tracking-tight">
                            {currentProduct.price.toLocaleString()}
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
