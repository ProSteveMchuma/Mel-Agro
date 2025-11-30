"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const SLIDES = [
    {
        id: 1,
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
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1000&auto=format&fit=crop",
        tag: "⚡ Boost Your Productivity",
        title: "Quality Nutrition for",
        highlight: "Better Yields",
        description: "Enhance soil health and crop growth with our range of premium fertilizers and soil conditioners tailored for local soils.",
        primaryBtn: "Shop Fertilizers",
        primaryLink: "/products?category=fertilizers",
        secondaryBtn: "View Guide",
        secondaryLink: "/about"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        tag: "🚜 Modern Farming Tools",
        title: "Efficiency in",
        highlight: "Every Acre",
        description: "Streamline your operations with durable, high-performance agricultural tools and equipment designed for the modern farmer.",
        primaryBtn: "Shop Equipment",
        primaryLink: "/products?category=equipment",
        secondaryBtn: "Learn More",
        secondaryLink: "/products"
    }
];

export default function Hero() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    };

    return (
        <section className="relative bg-gray-900 overflow-hidden h-[600px] md:h-[700px]">
            {/* Slides */}
            {SLIDES.map((slide, index) => (
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
                {SLIDES.map((_, index) => (
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
