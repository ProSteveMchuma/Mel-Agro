"use client";

import Link from "next/link";
import ProductRow from "./ProductRow";

export default function FlashSaleStrip() {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-red-100">
            {/* Header */}
            <div className="bg-[#ef4444] px-6 py-3 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <span className="font-black text-lg tracking-wide uppercase">Flash Sales</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">Ends in:</span>
                    <div className="flex items-center gap-1 font-mono text-sm font-bold bg-white text-red-600 px-2 py-1 rounded">
                        <span>04</span>:<span>23</span>:<span>32</span>
                    </div>
                </div>

                <Link href="/flash-sale" className="text-xs font-bold uppercase tracking-wider hover:underline">
                    See All &rarr;
                </Link>
            </div>

            {/* Products Row */}
            <div className="p-6">
                <ProductRow title="" filter={(p) => p.price < 5000} />
            </div>
        </div>
    );
}
