"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-fit sticky top-20 hidden lg:block">
            <div className="p-6 space-y-8">
                {/* Categories */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Categories</h3>
                    <nav className="space-y-2">
                        {categories.map((category, idx) => {
                            const isActive = pathname.includes(category.toLowerCase().replace(/\s+/g, "-"));
                            return (
                                <Link
                                    key={idx}
                                    href={`/products?category=${encodeURIComponent(category)}`}
                                    onClick={() => onCategoryChange?.(category)}
                                    className={`block px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${isActive
                                        ? "bg-melagro-primary/10 text-melagro-primary"
                                        : "text-gray-600 hover:text-melagro-primary hover:bg-gray-50"
                                        }`}
                                >
                                    {category}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Price Range Filter */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Price Range (KSh)</h3>
                    <div className="space-y-4">
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                placeholder="Min"
                                onChange={(e) => onPriceChange?.([Number(e.target.value), 50000])}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-melagro-primary"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                onChange={(e) => onPriceChange?.([0, Number(e.target.value)])}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-melagro-primary"
                            />
                        </div>
                        <button className="w-full py-2 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors">
                            Apply Filter
                        </button>
                    </div>
                </div>

                {/* Brands */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Brands</h3>
                    <div className="space-y-2">
                        {["Syngenta", "Bayer", "Osho", "Kenya Seed Co."].map((brand, idx) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded accent-melagro-primary"
                                />
                                <span className="text-sm text-gray-600 hover:text-gray-900">{brand}</span>
                            </label>
                        ))}
                    </div>
                </div>



                {/* Featured Section */}
                <div className="pt-6 border-t border-gray-200">
                    <div className="bg-gradient-to-br from-melagro-primary/10 to-melagro-secondary/10 p-4 rounded-lg border border-melagro-primary/20">
                        <p className="text-xs font-semibold text-melagro-primary mb-2">SPECIAL OFFER</p>
                        <p className="text-sm font-bold text-gray-900">Get up to 20% OFF on bulk orders</p>
                        <Link href="/bulk-orders" className="inline-block mt-3 px-3 py-1.5 bg-melagro-primary text-white text-xs font-bold rounded-lg hover:bg-melagro-secondary transition-colors">
                            Learn More
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}
