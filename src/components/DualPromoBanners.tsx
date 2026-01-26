"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function DualPromoBanners() {
    return (
        <section className="container-custom py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Banner - New Arrivals */}
                <motion.div
                    whileHover={{ y: -8 }}
                    className="flex-1 rounded-[2.5rem] overflow-hidden relative min-h-[300px] group shadow-xl"
                >
                    <img
                        src="https://images.unsplash.com/photo-1622383529984-601460aa30aa?q=80&w=1200&auto=format&fit=crop"
                        alt="New Arrivals"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute inset-0 p-12 flex flex-col justify-end text-white">
                        <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400 mb-2"
                        >
                            Fresh Stock
                        </motion.span>
                        <h3 className="text-4xl font-black mb-4 tracking-tighter">Newest Arrivals</h3>
                        <p className="text-gray-300 mb-8 text-sm max-w-sm font-medium leading-relaxed">
                            Discover the latest seed varieties and precision tools just landed in our warehouse.
                        </p>
                        <Link href="/products?sort=newest" className="group relative bg-white text-gray-900 px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest w-fit overflow-hidden">
                            <span className="relative z-10">Shop Collection</span>
                            <div className="absolute inset-0 bg-green-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20"></div>
                        </Link>
                    </div>
                </motion.div>

                {/* Right Banner - Sell on Mel-Agri */}
                <motion.div
                    whileHover={{ y: -8 }}
                    className="flex-1 bg-gradient-to-br from-green-600 to-green-500 rounded-[2.5rem] p-12 relative overflow-hidden group shadow-xl text-white"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg width="200" height="200" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="5 5" className="animate-spin-slow" /></svg>
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-center">
                        <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            className="text-[10px] font-black uppercase tracking-[0.3em] text-green-100 mb-2"
                        >
                            Global Marketplace
                        </motion.span>
                        <h3 className="text-4xl font-black mb-4 tracking-tighter">Sell on Mel-Agri</h3>
                        <p className="text-green-50 mb-8 text-sm max-w-sm font-medium leading-relaxed">
                            Reach millions of farmers across Africa. Join our network of verified suppliers today.
                        </p>
                        <Link href="/dashboard/admin/products/new" className="group relative bg-gray-900 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest w-fit overflow-hidden">
                            <span className="relative z-10">Start Selling</span>
                            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20"></div>
                        </Link>
                    </div>

                    {/* Decorative Element */}
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                </motion.div>
            </div>
        </section>
    );
}
