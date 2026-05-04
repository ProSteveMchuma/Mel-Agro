"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'newest' | 'top-rated';

interface SidebarProps {
    categories?: string[];
    onCategoryChange?: (category: string) => void;
    onPriceChange?: (range: [number, number]) => void;
    brands?: string[];
    selectedBrands?: string[];
    onBrandChange?: (brand: string) => void;
    sortBy?: SortOption;
    onSortChange?: (sort: SortOption) => void;
    inStockOnly?: boolean;
    onInStockChange?: (value: boolean) => void;
    onClearAll?: () => void;
    initialMinPrice?: string;
    initialMaxPrice?: string;
}

const defaultCategories = [
    "Animal Feeds",
    "Fertilizers",
    "Seeds",
    "Crop Protection Products",
    "Veterinary Products",
    "Farm Tools"
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest first' },
    { value: 'price-asc', label: 'Price: Low → High' },
    { value: 'price-desc', label: 'Price: High → Low' },
    { value: 'top-rated', label: 'Top rated' },
];

export default function Sidebar({
    categories = [],
    onCategoryChange,
    onPriceChange,
    brands = [],
    selectedBrands = [],
    onBrandChange,
    sortBy = 'relevance',
    onSortChange,
    inStockOnly = false,
    onInStockChange,
    onClearAll,
    initialMinPrice = '',
    initialMaxPrice = '',
}: SidebarProps) {
    const categoriesToDisplay = categories.length > 0 ? categories : defaultCategories;
    const searchParams = useSearchParams();
    const activeCategory = searchParams.get("category");

    const [minPrice, setMinPrice] = useState<string>(initialMinPrice);
    const [maxPrice, setMaxPrice] = useState<string>(initialMaxPrice);

    // Keep inputs in sync if URL changes externally (e.g. clear-all)
    useEffect(() => {
        setMinPrice(initialMinPrice);
        setMaxPrice(initialMaxPrice);
    }, [initialMinPrice, initialMaxPrice]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const min = minPrice === "" ? 0 : Number(minPrice);
            const max = maxPrice === "" ? 1000000 : Number(maxPrice);
            onPriceChange?.([min, max]);
        }, 500);
        return () => clearTimeout(timer);
    }, [minPrice, maxPrice, onPriceChange]);

    const [showAllBrands, setShowAllBrands] = useState(false);
    const brandsToDisplay = showAllBrands ? brands : brands.slice(0, 10);

    const hasActiveFilters =
        !!activeCategory ||
        selectedBrands.length > 0 ||
        minPrice !== '' ||
        maxPrice !== '' ||
        inStockOnly ||
        (sortBy && sortBy !== 'relevance');

    return (
        <aside className="w-full lg:w-64 bg-white border border-gray-100 rounded-3xl h-fit sticky top-24 shadow-sm overflow-hidden">
            <div className="p-8 space-y-10">
                {/* Clear all */}
                {hasActiveFilters && onClearAll && (
                    <button
                        onClick={onClearAll}
                        className="w-full text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors py-2 rounded-xl border border-red-100"
                    >
                        Clear all filters
                    </button>
                )}

                {/* Sort */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center justify-between">
                        Sort by
                        <span className="w-8 h-[1px] bg-gray-100 flex-grow ml-4"></span>
                    </h3>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange?.(e.target.value as SortOption)}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-melagri-primary/20 transition-all"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* In stock toggle */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={inStockOnly}
                            onChange={(e) => onInStockChange?.(e.target.checked)}
                            className="peer w-5 h-5 rounded-lg border-gray-200 text-melagri-primary focus:ring-melagri-primary/20 cursor-pointer accent-melagri-primary"
                        />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-melagri-primary transition-colors">In stock only</span>
                    </label>
                </div>

                {/* Categories */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center justify-between">
                        Categories
                        <span className="w-8 h-[1px] bg-gray-100 flex-grow ml-4"></span>
                    </h3>
                    <nav className="space-y-1">
                        <button
                            onClick={() => onCategoryChange?.("")}
                            className={`w-full text-left px-4 py-3 rounded-2xl transition-all text-sm font-bold flex items-center gap-3 ${!activeCategory
                                ? "bg-melagri-primary text-white shadow-lg shadow-green-100"
                                : "text-gray-600 hover:text-melagri-primary hover:bg-green-50"
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${!activeCategory ? "bg-white" : "bg-gray-300"}`} />
                            All Products
                        </button>
                        {categoriesToDisplay.map((category, idx) => {
                            const isActive = activeCategory === category;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onCategoryChange?.(category)}
                                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all text-sm font-bold flex items-center gap-3 ${isActive
                                        ? "bg-melagri-primary text-white shadow-lg shadow-green-100"
                                        : "text-gray-600 hover:text-melagri-primary hover:bg-green-50"
                                        }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-gray-300"}`} />
                                    {category}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Price Range */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center justify-between">
                        Price Range
                        <span className="w-8 h-[1px] bg-gray-100 flex-grow ml-4"></span>
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Min (KSh)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-melagri-primary/20 transition-all placeholder:text-gray-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Max (KSh)</label>
                                <input
                                    type="number"
                                    placeholder="Any"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-melagri-primary/20 transition-all placeholder:text-gray-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Brands */}
                {brands.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center justify-between">
                            Popular Brands
                            <span className="w-8 h-[1px] bg-gray-100 flex-grow ml-4"></span>
                        </h3>
                        <div className="space-y-3">
                            {brandsToDisplay.map((brand, idx) => (
                                <label key={idx} className="flex items-center gap-4 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedBrands.includes(brand)}
                                            onChange={() => onBrandChange?.(brand)}
                                            className="peer w-5 h-5 rounded-lg border-gray-200 text-melagri-primary focus:ring-melagri-primary/20 transition-all cursor-pointer accent-melagri-primary"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-600 group-hover:text-melagri-primary transition-colors">{brand}</span>
                                </label>
                            ))}

                            {brands.length > 10 && (
                                <button
                                    onClick={() => setShowAllBrands(!showAllBrands)}
                                    className="text-[10px] font-black text-melagri-primary uppercase tracking-widest hover:underline pt-2 flex items-center gap-2"
                                >
                                    {showAllBrands ? (
                                        <>Show Less <span className="text-lg">↑</span></>
                                    ) : (
                                        <>View More ({brands.length - 10} more) <span className="text-lg">↓</span></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Bulk Order Card */}
                <div className="pt-8 border-t border-gray-50">
                    <div className="bg-gradient-to-br from-melagri-primary to-green-700 p-6 rounded-[2.5rem] shadow-xl shadow-green-100 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[9px] font-black text-green-100 mb-2 uppercase tracking-widest">Global Supply</p>
                            <p className="text-base font-black text-white leading-tight mb-4">Bulk orders available for cooperatives</p>
                            <Link href="/bulk" className="inline-block px-5 py-2.5 bg-white text-melagri-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-50 transition-all shadow-sm">
                                View Pricing
                            </Link>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="absolute -top-12 -left-12 w-24 h-24 bg-white/5 rounded-full" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
