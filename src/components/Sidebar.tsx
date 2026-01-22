"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface SidebarProps {
    categories?: string[];
    onCategoryChange?: (category: string) => void;
    onPriceChange?: (range: [number, number]) => void;
}

const defaultCategories = [
    "Animal Feeds",
    "Fertilizers",
    "Seeds",
    "Crop Protection Products",
    "Veterinary Products"
];

export default function Sidebar({ categories = defaultCategories, onCategoryChange, onPriceChange }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeCategory = searchParams.get("category");

    return (
        <aside className="w-64 bg-white border border-gray-100 rounded-3xl h-fit sticky top-24 hidden lg:block shadow-sm">
            <div className="p-8 space-y-10">
                {/* Categories */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Categories</h3>
                    <nav className="space-y-1">
                        <button
                            onClick={() => onCategoryChange?.("")}
                            className={`w-full text-left px-4 py-3 rounded-2xl transition-all text-sm font-bold ${!activeCategory
                                ? "bg-melagro-primary text-white shadow-lg shadow-green-100"
                                : "text-gray-600 hover:text-melagro-primary hover:bg-green-50"
                                }`}
                        >
                            All Products
                        </button>
                        {categories.map((category, idx) => {
                            const isActive = activeCategory === category;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onCategoryChange?.(category)}
                                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all text-sm font-bold ${isActive
                                        ? "bg-melagro-primary text-white shadow-lg shadow-green-100"
                                        : "text-gray-600 hover:text-melagro-primary hover:bg-green-50"
                                        }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Price Range Filter */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Price Range (KSh)</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Min</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    onChange={(e) => {
                                        const min = Number(e.target.value) || 0;
                                        const maxInput = (e.target.parentElement?.parentElement?.querySelector('input[placeholder="100,000+"]') as HTMLInputElement)?.value;
                                        const max = Number(maxInput) || 100000;
                                        onPriceChange?.([min, max]);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-melagro-primary/20 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Max</label>
                                <input
                                    type="number"
                                    placeholder="100,000+"
                                    onChange={(e) => {
                                        const max = Number(e.target.value) || 100000;
                                        const minInput = (e.target.parentElement?.parentElement?.querySelector('input[placeholder="0"]') as HTMLInputElement)?.value;
                                        const min = Number(minInput) || 0;
                                        onPriceChange?.([min, max]);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-melagro-primary/20 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Brands */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Popular Brands</h3>
                    <div className="space-y-3">
                        {["Syngenta", "Bayer", "Osho", "Kenya Seed Co."].map((brand, idx) => (
                            <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="peer w-5 h-5 rounded-lg border-gray-200 text-melagro-primary focus:ring-melagro-primary/20 transition-all cursor-pointer accent-melagro-primary"
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-600 group-hover:text-melagro-primary transition-colors">{brand}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Featured Section */}
                <div className="pt-8 border-t border-gray-100">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-[2rem] shadow-lg shadow-green-100 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-green-100 mb-2 uppercase tracking-widest">Special Offer</p>
                            <p className="text-lg font-black text-white leading-tight mb-4">Get 20% OFF on bulk orders</p>
                            <Link href="/bulk-orders" className="inline-block px-4 py-2 bg-white text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-50 transition-all">
                                Learn More
                            </Link>
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
