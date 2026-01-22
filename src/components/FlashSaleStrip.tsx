"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { getProducts, Product } from "@/lib/products";

export default function FlashSaleStrip() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({
        hours: 12,
        minutes: 45,
        seconds: 30
    });

    // Fetch products once on mount
    useEffect(() => {
        getProducts().then(all => {
            // Filter products for flash sale (e.g., price < 5000)
            const saleProducts = all.filter(p => p.price < 10000).slice(0, 10);
            setProducts(saleProducts);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                let s = prev.seconds - 1;
                let m = prev.minutes;
                let h = prev.hours;

                if (s < 0) {
                    s = 59;
                    m -= 1;
                }
                if (m < 0) {
                    m = 59;
                    h -= 1;
                }
                if (h < 0) {
                    return { hours: 0, minutes: 0, seconds: 0 };
                }
                return { hours: h, minutes: m, seconds: s };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (time: number) => time.toString().padStart(2, '0');

    // Duplicate products for infinite marquee effect
    const marqueeProducts = [...products, ...products, ...products];

    return (
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-red-500/10 border border-red-50/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-6 md:px-10 py-6 flex flex-col lg:flex-row justify-between items-center text-white gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                        <motion.svg
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-7 h-7 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </motion.svg>
                    </div>
                    <div>
                        <h2 className="font-extrabold text-3xl tracking-tighter uppercase leading-none italic">Flash Sales</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <p className="text-[10px] font-black text-red-100 uppercase tracking-[0.2em]">Live: Limited Stock Remaining</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-8">
                    <div className="flex items-center gap-4 bg-black/10 px-6 py-3 rounded-3xl backdrop-blur-sm border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100">Ends In:</span>
                        <div className="flex items-center gap-3">
                            {[
                                { label: 'HRS', value: formatTime(timeLeft.hours) },
                                { label: 'MIN', value: formatTime(timeLeft.minutes) },
                                { label: 'SEC', value: formatTime(timeLeft.seconds) }
                            ].map((unit, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="bg-white text-red-600 min-w-[3rem] h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-xl shadow-red-900/20">
                                        {unit.value}
                                    </div>
                                    <span className="text-[7px] font-black uppercase mt-1 text-red-100 tracking-widest">{unit.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Link
                        href="/products?filter=sale"
                        className="group bg-white text-red-600 hover:bg-red-50 px-8 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3 text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-red-500/20 active:scale-95"
                    >
                        Explore All
                        <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            →
                        </motion.span>
                    </Link>
                </div>
            </div>

            {/* Sliding Products Marquee */}
            <div className="py-10 relative bg-gray-50/30">
                {isLoading ? (
                    <div className="flex gap-6 px-8 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="min-w-[280px] h-96 bg-gray-200 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="flex overflow-hidden group">
                        <motion.div
                            className="flex gap-6 px-4"
                            animate={{ x: [0, -100 * products.length + '%'] }}
                            transition={{
                                x: {
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    duration: products.length * 8, // Adjust speed based on item count
                                    ease: "linear"
                                }
                            }}
                            whileHover={{ pause: true }}
                        >
                            {marqueeProducts.map((product, idx) => (
                                <div key={`${product.id}-${idx}`} className="min-w-[280px] max-w-[280px]">
                                    <ProductCard
                                        id={product.id}
                                        name={product.name}
                                        price={product.price}
                                        image={product.image}
                                        category={product.category}
                                    />
                                </div>
                            ))}
                        </motion.div>
                    </div>
                )}

                {/* Left/Right Fading Overlays */}
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
            </div>
        </div>
    );
}
