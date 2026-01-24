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
        <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden rounded-[2.5rem] bg-gray-900 shadow-2xl group">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentProduct.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                >
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                        <Image
                            src={currentProduct.image || "/assets/images/placeholder.png"}
                            alt={currentProduct.name}
                            fill
                            className="object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-[10s]"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-center px-8 md:px-20 z-10">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                        >
                            <span className="bg-green-500 text-white text-[10px] md:text-xs font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-6 inline-block">
                                Featured Product
                            </span>
                            <h2 className="text-4xl md:text-7xl font-black text-white mb-6 leading-none tracking-tighter uppercase max-w-2xl">
                                {currentProduct.name}
                            </h2>
                            <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-xl line-clamp-2 font-medium">
                                {currentProduct.description || "Premium agricultural solution for your farm. Certified quality for maximum yield."}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href={`/product/${currentProduct.id}`}
                                    className="bg-white text-gray-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-green-50 transition-all text-center"
                                >
                                    View Details
                                </Link>
                                <button
                                    onClick={() => {
                                        addToCart(currentProduct);
                                        toast.success(`Added ${currentProduct.name} to cart!`);
                                    }}
                                    className="bg-green-600/20 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-green-600/40 transition-all"
                                >
                                    Add To Cart
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                {products.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`transition-all duration-500 rounded-full ${idx === activeIndex
                            ? 'w-12 h-2.5 bg-green-500'
                            : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'
                            }`}
                    />
                ))}
            </div>

            {/* Price Tag */}
            <div className="absolute top-10 right-10 z-20">
                <motion.div
                    key={currentProduct.price}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl"
                >
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Price starts from</p>
                    <p className="text-3xl font-black text-white leading-none">
                        KES {currentProduct.price.toLocaleString()}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
