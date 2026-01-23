"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useContent } from "@/context/ContentContext";
import Image from "next/image";

interface HeroProps {
    categories?: string[];
}

const CATEGORY_ICONS: Record<string, string> = {
    "Animal Feeds": "🐄",
    "Fertilizers": "📦",
    "Seeds": "🌱",
    "Seeds & Seedlings": "🌱",
    "Crop Protection": "🛡️",
    "Crop Protection Products": "🛡️",
    "Farm Tools": "🛠️",
    "Veterinary Products": "💊",
    "Veterinary": "💊",
    "Bulk Orders": "🚛"
};

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
            description: "Get up to 20% OFF on all planting fertilizers and certified hybrid maize seeds.",
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

    const categories = dynamicCategories.length > 0
        ? dynamicCategories.map(name => ({ name, icon: CATEGORY_ICONS[name] || "🌾" }))
        : [
            { name: "Seeds & Seedlings", icon: "🌱" },
            { name: "Fertilizers", icon: "📦" },
            { name: "Crop Protection", icon: "🛡️" },
            { name: "Farm Tools", icon: "🛠️" },
            { name: "Animal Feeds", icon: "🐄" },
            { name: "Veterinary Products", icon: "💊" },
            { name: "Bulk Orders", icon: "🚛" }
        ];

    return (
        <section className="bg-white py-4 md:py-6">
            <div className="container-custom">
                <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[500px]">

                    {/* Left Sidebar - Category Nav */}
                    <aside className="hidden lg:block w-72 bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex-shrink-0">
                        <div className="px-8 py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-widest">
                            Categories
                        </div>
                        <nav className="flex flex-col py-2">
                            {categories.map((cat, idx) => (
                                <Link
                                    key={idx}
                                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                                    className="flex items-center group px-8 py-3 text-[13px] font-bold text-gray-600 hover:text-green-600 hover:translate-x-2 transition-all duration-300"
                                >
                                    <span className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-green-50 flex items-center justify-center mr-3 transition-colors text-lg">
                                        {cat.icon}
                                    </span>
                                    {cat.name}
                                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                    </span>
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Middle - Main Slider */}
                    <div className="flex-grow relative rounded-[2.5rem] overflow-hidden group shadow-2xl min-h-[400px]">
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

                    {/* Right Banners */}
                    <aside className="hidden xl:flex flex-col gap-4 w-80 flex-shrink-0">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="flex-1 bg-green-50 rounded-[2rem] p-8 relative overflow-hidden group shadow-sm border border-green-100"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 4" /></svg>
                            </div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-1">Official Support</span>
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight mb-4 tracking-tighter">Fast Order<br />Processing</h3>
                                </div>
                                <Link href="/products" className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                                    Shop Now <span className="text-lg">→</span>
                                </Link>
                            </div>
                            <div className="absolute bottom-4 right-4 text-5xl opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 text-green-600">📦</div>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="flex-1 bg-gray-900 rounded-[2rem] p-8 relative overflow-hidden group shadow-sm text-white"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg width="120" height="120" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="8 8" className="rotate-45 origin-center" /></svg>
                            </div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Store Quality</span>
                                    <h3 className="text-2xl font-black leading-tight mb-4 tracking-tighter">Certified<br />Genuine</h3>
                                </div>
                                <Link href="/about" className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                                    Our Legacy <span className="text-lg">→</span>
                                </Link>
                            </div>
                            <div className="absolute bottom-4 right-4 text-5xl opacity-10 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 text-orange-400">⭐</div>
                        </motion.div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
