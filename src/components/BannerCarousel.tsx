"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const BANNERS = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1625246333195-58197bd47a3a?q=80&w=1000&auto=format&fit=crop",
        title: "Big Harvest Sale",
        subtitle: "Up to 50% off on Fertilizers"
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?q=80&w=1000&auto=format&fit=crop",
        title: "Premium Seeds",
        subtitle: "Start your season right"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        title: "Farm Tools",
        subtitle: "Durable equipment for pros"
    }
];

export default function BannerCarousel() {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % BANNERS.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] overflow-hidden rounded-xl shadow-sm mb-6">
            {BANNERS.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === current ? "opacity-100" : "opacity-0"
                        }`}
                >
                    <Image
                        src={banner.image}
                        alt={banner.title}
                        fill
                        className="object-cover"
                        priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center px-8 md:px-16 text-white">
                        <h2 className="text-3xl md:text-5xl font-bold mb-2 transform transition-transform duration-700 translate-x-0">{banner.title}</h2>
                        <p className="text-lg md:text-xl text-gray-200">{banner.subtitle}</p>
                        <button className="mt-4 bg-melagri-primary hover:bg-melagri-secondary text-white px-6 py-2 rounded-full font-bold w-fit transition-all text-sm md:text-base">
                            Shop Now
                        </button>
                    </div>
                </div>
            ))}

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {BANNERS.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === current ? "w-6 bg-melagri-primary" : "w-2 bg-white/50"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
