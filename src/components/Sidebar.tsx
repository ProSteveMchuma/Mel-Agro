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
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    // We need to know the current max, but we don't have it in props.
                                    // Ideally Sidebar should receive the current range as a prop.
                                    // For now, let's assume a default high max if we don't have one, or better yet,
                                    // let's change the component to using a ref or state if we want to be independent.
                                    // ACTUALLY: The best way is to not use 0 or 50000 hardcoded but use the existing known values.
                                    // Since this is a simple sidebar, let's use a local variable for the inputs and trigger the callback with both.
                                    const maxInput = document.getElementById('price-max') as HTMLInputElement;
                                    const currentMax = maxInput ? Number(maxInput.value) || 50000 : 50000;
                                    onPriceChange?.([val, currentMax]);
                                }}
                                id="price-min"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-melagro-primary"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const minInput = document.getElementById('price-min') as HTMLInputElement;
                                    const currentMin = minInput ? Number(minInput.value) || 0 : 0;
                                    onPriceChange?.([currentMin, val || 50000]);
                                }}
                                id="price-max"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-melagro-primary"
                            />
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
