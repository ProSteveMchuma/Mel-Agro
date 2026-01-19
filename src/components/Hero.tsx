"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { useContent } from "@/context/ContentContext";

const DEFAULT_SLIDES = [
    {
        id: '1',
        image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1740&auto=format&fit=crop",
        tag: "🌱 Premium Agricultural Solutions",
        title: "Cultivating Success for",
        highlight: "Every Harvest",
        description: "Discover top-quality seeds, fertilizers, and expert advice to maximize your yield. MelAgro is your trusted partner in modern farming.",
        primaryBtn: "Shop Seeds",
        primaryLink: "/products?category=seeds",
        secondaryBtn: "Contact Experts",
        secondaryLink: "/contact"
    },
    // ... other defaults can remain or be removed if we want pure dynamic
];

export default function Hero() {
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
        }
    ];

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const categories = [
        { name: "Seeds & Seedlings", icon: "🌱" },
        { name: "Fertilizers", icon: "📦" },
        { name: "Crop Protection", icon: "🛡️" },
        { name: "Farm Tools", icon: "🛠️" },
        { name: "Irrigation", icon: "💧" },
        { name: "Animal Feeds", icon: "🐄" },
        { name: "Vet Products", icon: "💊" },
        { name: "Bulk Orders", icon: "🚛" }
    ];

    return (
        <section className="bg-white py-6">
            <div className="container-custom">
                <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[480px]">
                    {/* Left Sidebar - Category Nav */}
                    <aside className="hidden lg:block w-64 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                        <nav className="flex flex-col h-full">
                            {categories.map((cat, idx) => (
                                <Link
                                    key={idx}
                                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                                    className="flex items-center gap-3 px-6 py-3.5 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 transition-all border-b border-gray-50 last:border-none"
                                >
                                    <span className="text-lg">{cat.icon}</span>
                                    {cat.name}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Middle - Main Slider */}
                    <div className="flex-grow relative rounded-2xl overflow-hidden group shadow-md min-h-[300px]">
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                            >
                                <div className="absolute inset-0">
                                    <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                                </div>
                                <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12 text-white max-w-xl">
                                    <span className="inline-block px-3 py-1 bg-orange-500 text-white text-[10px] font-bold rounded mb-4 w-fit uppercase tracking-widest">{slide.tag}</span>
                                    <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">{slide.title}</h2>
                                    <p className="text-sm md:text-lg text-gray-100 mb-8 max-w-sm font-medium">{slide.description}</p>
                                    <Link href={slide.primaryLink} className="bg-[#22c55e] hover:bg-green-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest w-fit transition-transform hover:scale-105 shadow-lg shadow-green-500/20">
                                        {slide.primaryBtn}
                                    </Link>
                                </div>
                            </div>
                        ))}

                        {/* Dots */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                            {slides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlide(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-6' : 'bg-white/40'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right - Static Banners */}
                    <aside className="hidden xl:flex flex-col gap-4 w-72 flex-shrink-0">
                        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-2">Mel-Agri Express</span>
                                <h3 className="text-xl font-black text-gray-900 mb-4 leading-tight">Fast<br />Delivery</h3>
                                <p className="text-[11px] text-gray-500 font-medium">To major towns</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-100 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                            <div className="absolute top-4 right-4 text-3xl">🚛</div>
                        </div>

                        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-2">Official Store</span>
                                <h3 className="text-xl font-black text-gray-900 mb-4 leading-tight">Certified<br />Genuine</h3>
                                <p className="text-[11px] text-gray-500 font-medium">Direct from manufacturers</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-100 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                            <div className="absolute top-4 right-4 text-3xl">⭐</div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
