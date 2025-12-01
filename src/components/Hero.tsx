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
    const { banners, loading } = useContent();
    const [currentSlide, setCurrentSlide] = useState(0);

    const activeBanners = banners.filter(b => b.active);

    const slides = activeBanners.length > 0 ? activeBanners.map(b => ({
        id: b.id,
        image: b.image,
        tag: b.subtitle, // Mapping subtitle to tag
        title: b.title,
        highlight: "", // Dynamic banners might not have highlight split
        description: b.description || "Discover our premium agricultural products.",
        primaryBtn: "Shop Now",
        primaryLink: b.link || "/products",
        secondaryBtn: "Contact Us",
        secondaryLink: "/contact"
    })) : DEFAULT_SLIDES;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    return (
        <section className="relative bg-gray-900 overflow-hidden h-[600px] md:h-[700px]">
            {/* Slides */}
            {slides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                        }`}
                >
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30 z-10" />
                        <div
                            className="w-full h-full bg-cover bg-center transform transition-transform duration-[10000ms] ease-linear scale-100"
                            style={{
                                backgroundImage: `url('${slide.image}')`,
                                transform: index === currentSlide ? "scale(110%)" : "scale(100%)"
                            }}
                        />
                    </div>

                    <div className="container-custom relative z-20 h-full flex items-center">
                        <div className="max-w-2xl text-white pt-16">
                            <div className={`inline-block px-4 py-1.5 rounded-full bg-melagro-secondary/20 border border-melagro-secondary/50 text-melagro-secondary font-medium text-sm mb-6 backdrop-blur-sm transform transition-all duration-700 delay-100 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                                }`}>
                                {slide.tag}
                            </div>
                            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 transform transition-all duration-700 delay-200 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                                }`}>
                                {slide.title} <span className="text-melagro-secondary">{slide.highlight}</span>
                            </h1>
                            <p className={`text-lg md:text-xl text-gray-200 mb-8 leading-relaxed transform transition-all duration-700 delay-300 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                                }`}>
                                {slide.description}
                            </p>
                            <div className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-700 delay-400 ${index === currentSlide ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                                }`}>
                                <Link href={slide.primaryLink} className="btn-primary text-center">
                                    {slide.primaryBtn}
                                </Link>
                                <Link href={slide.secondaryLink} className="btn-secondary bg-transparent text-white border-white hover:bg-white hover:text-melagro-primary text-center">
                                    {slide.secondaryBtn}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Navigation Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all hidden md:block group"
                aria-label="Previous slide"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all hidden md:block group"
                aria-label="Next slide"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dots Navigation */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide ? "bg-melagro-secondary w-8" : "bg-white/50 hover:bg-white"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-20" />
        </section>
    );
}
