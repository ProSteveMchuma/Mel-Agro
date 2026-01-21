"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductRow from "./ProductRow";
import { motion } from "framer-motion";

export default function FlashSaleStrip() {
    const [timeLeft, setTimeLeft] = useState({
        hours: 12,
        minutes: 45,
        seconds: 30
    });

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

    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-red-500/5 border border-red-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-5 flex flex-col md:flex-row justify-between items-center text-white gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-6 h-6 text-white animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-black text-2xl tracking-tighter uppercase leading-none">Flash Sales</h2>
                        <p className="text-[10px] font-bold text-red-100 uppercase tracking-widest mt-1">Limited Time Offers</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Ending in:</span>
                        <div className="flex items-center gap-2">
                            {[
                                { label: 'hrs', value: formatTime(timeLeft.hours) },
                                { label: 'min', value: formatTime(timeLeft.minutes) },
                                { label: 'sec', value: formatTime(timeLeft.seconds) }
                            ].map((unit, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <motion.div
                                        key={unit.value}
                                        initial={{ y: 5, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="bg-white text-red-600 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg"
                                    >
                                        {unit.value}
                                    </motion.div>
                                    <span className="text-[8px] font-bold uppercase mt-1 opacity-60">{unit.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-10 w-px bg-white/20 hidden md:block" />

                    <Link
                        href="/products?filter=sale"
                        className="group bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-white/20"
                    >
                        View All
                        <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            →
                        </motion.span>
                    </Link>
                </div>
            </div>

            {/* Products Row */}
            <div className="p-8">
                <ProductRow title="" filter={(p) => p.price < 5000} />
            </div>
        </div>
    );
}
