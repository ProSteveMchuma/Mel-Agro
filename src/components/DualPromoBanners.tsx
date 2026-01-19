"use client";

import Link from "next/link";
import Image from "next/image";

export default function DualPromoBanners() {
    return (
        <section className="container-custom py-4">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Banner - New Arrivals */}
                <div className="flex-1 rounded-2xl overflow-hidden relative min-h-[220px] group shadow-sm hover:shadow-md transition-all">
                    <Image
                        src="https://images.unsplash.com/photo-1605000797499-95a0535bc265?q=80&w=1200&auto=format&fit=crop"
                        alt="New Arrivals"
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#6d5b4b]/90 to-[#6d5b4b]/40 mix-blend-multiply" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-center text-white">
                        <h3 className="text-3xl font-black mb-2">New Arrivals</h3>
                        <p className="text-white/90 mb-6 text-sm max-w-xs font-medium">Check out the latest tools, seeds, and equipment added to our catalog.</p>
                        <Link href="/products?sort=newest" className="inline-block bg-[#8b735b] hover:bg-[#a0856a] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-lg w-fit transition-colors">
                            Shop Now
                        </Link>
                    </div>
                </div>

                {/* Right Banner - Sell on Mel-Agri */}
                <div className="flex-1 bg-[#22c55e] rounded-2xl p-8 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                    <div className="relative z-10 flex flex-col h-full justify-center">
                        <h3 className="text-3xl font-black text-white mb-2">Sell on Mel-Agri</h3>
                        <p className="text-green-50 mb-6 text-sm max-w-xs font-medium">Reach millions of farmers across Kenya. Zero listings fees for the first month.</p>
                        <Link href="/sell" className="inline-block bg-white text-[#22c55e] hover:bg-green-50 text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-lg w-fit transition-colors">
                            Register Now
                        </Link>
                    </div>
                    {/* Decorative Icon */}
                    <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-white/10 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-20 h-20 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
        </section>
    );
}
