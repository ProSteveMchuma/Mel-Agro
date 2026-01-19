"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    categories?: string[];
    onCategoryChange?: (category: string) => void;
}

const defaultCategories = [
    "Seeds & Seedlings",
    "Fertilizers",
    "Crop Protection",
    "Farm Tools",
    "Irrigation",
    "Animal Feeds",
    "Vet Products",
    "Bulk Orders"
];

export default function Sidebar({ categories = defaultCategories, onCategoryChange }: SidebarProps) {
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
                                    className={`block px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                                        isActive
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
                    <div className="space-y-3">
                        <div>
                            <input
                                type="range"
                                min="0"
                                max="50000"
                                defaultValue="0"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-melagro-primary"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Min: 100</span>
                                <span>Max: 10,000+</span>
                            </div>
                        </div>
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

                {/* Availability */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Availability</h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                defaultChecked
                                className="w-4 h-4 rounded accent-melagro-primary"
                            />
                            <span className="text-sm text-gray-600 hover:text-gray-900">In Stock (42)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded accent-melagro-primary"
                            />
                            <span className="text-sm text-gray-600 hover:text-gray-900">On Sale (15)</span>
                        </label>
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
