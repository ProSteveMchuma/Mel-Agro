"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function SideBanners() {
    return (
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
    );
}
