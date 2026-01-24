"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useContent } from "@/context/ContentContext";
import Image from "next/image";

interface HeroProps {
    categories?: string[];
}

export default function Hero({ categories: dynamicCategories = [] }: HeroProps) {
    const { banners } = useContent();
    const [currentSlide, setCurrentSlide] = useState(0);

    const activeBanners = banners.filter(b => b.active);

    const slides = activeBanners.length > 0 ? activeBanners.map(b => ({
        id: b.id,
        image: b.image,
        tag: "Weekly Offer",
        title: b.title,
        description: b.description || "Discover our premium agricultural products.",
        primaryBtn: "Shop Now",
        primaryLink: b.link || "/products",
    })) : [
        {
            id: 'shamba-ready',
            image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1740&auto=format&fit=crop",
            tag: "WEEKLY OFFER",
            title: "Prepare Your Shamba For The Long Rains",
            description: "Get certified hybrid maize seeds and planting fertilizers today.",
            primaryBtn: "Shop Now",
            primaryLink: "/products?category=seeds"
        },
        {
            id: 'tools-sale',
            image: "https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=1740&auto=format&fit=crop",
            tag: "NEW ARRIVALS",
            title: "Modern Tools for Higher Efficiency",
            description: "Upgrade your farm with our latest high-performance tilling and harvesting tools.",
            primaryBtn: "View Tools",
            primaryLink: "/products?category=Farm%20Tools"
        }
    ];

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <section className="bg-white py-4 md:py-6">
            <div className="container-custom">
                <div className="relative rounded-[3rem] overflow-hidden group shadow-2xl h-[400px] md:h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute inset-0"
                        >
                            <div className="absolute inset-0">
                                <Image
                                    src={slides[currentSlide].image}
                                    alt={slides[currentSlide].title}
                                    fill
                                    priority
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
                            </div>

                            <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-20 text-white max-w-2xl">
                                <motion.span
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-block px-4 py-1.5 bg-[#22c55e] text-white text-[10px] font-black rounded-lg mb-6 w-fit uppercase tracking-[0.2em] shadow-lg shadow-green-500/20"
                                >
                                    {slides[currentSlide].tag}
                                </motion.span>

                                <motion.h1
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl md:text-6xl font-black mb-6 leading-[0.9] tracking-tighter"
                                >
                                    {slides[currentSlide].title}
                                </motion.h1>

                                <motion.p
                                    initial={{ y: 40, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-lg text-gray-300 mb-10 max-w-sm font-medium leading-relaxed"
                                >
                                    {slides[currentSlide].description}
                                </motion.p>

                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Link href={slides[currentSlide].primaryLink} className="group relative bg-white text-gray-900 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest w-fit inline-flex items-center gap-3 overflow-hidden transition-all hover:pr-12">
                                        <span className="relative z-10">{slides[currentSlide].primaryBtn}</span>
                                        <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
                                        <div className="absolute inset-0 bg-green-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    </Link>
                                </motion.div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Slide Indicators */}
                    <div className="absolute bottom-10 left-10 md:left-20 z-20 flex gap-3 items-center">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className="relative flex items-center justify-center p-2"
                            >
                                <div className={`h-1 transition-all duration-300 rounded-full ${idx === currentSlide ? 'w-10 bg-white' : 'w-4 bg-white/30 hover:bg-white/50'}`} />
                            </button>
                        ))}
                    </div>

                    {/* Scroll Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="absolute bottom-8 right-10 hidden md:flex flex-col items-center gap-2 z-20"
                    >
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] transform rotate-90 origin-right mb-12">Scroll</span>
                        <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
