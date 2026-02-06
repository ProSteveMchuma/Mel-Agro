"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts } from "@/context/ProductContext";
import { CATEGORY_ICONS } from "@/components/SidebarCategories";

interface MobileFilterDrawerProps {
    currentCategory: string | null;
    onCategoryChange: (category: string | null) => void;
    onSortChange: (sort: string) => void;
    totalProducts: number;
}

export default function MobileFilterDrawer({
    currentCategory,
    onCategoryChange,
    onSortChange,
    totalProducts,
}: MobileFilterDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { products } = useProducts();
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        // Extract unique categories
        const cats = Array.from(new Set(products.map((p) => p.category)));
        setCategories(cats);
    }, [products]);

    const handleCategoryClick = (cat: string | null) => {
        onCategoryChange(cat);
        setIsOpen(false);
    };

    const handleSortClick = (sort: string) => {
        onSortChange(sort);
        setIsOpen(false);
    };

    return (
        <>
            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-40 bg-gray-900 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 active:scale-90 transition-transform"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                </svg>
                <span className="font-bold text-xs uppercase tracking-widest">Filter</span>
            </button>

            {/* Drawer Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
                        />

                        {/* Bottom Sheet */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100) setIsOpen(false);
                            }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh] overflow-hidden flex flex-col lg:hidden"
                        >
                            {/* Drag Handle */}
                            <div className="w-full flex justify-center pt-4 pb-2" onClick={() => setIsOpen(false)}>
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                    Filters
                                </h3>
                                <span className="text-sm font-medium text-gray-500">
                                    {totalProducts} Items
                                </span>
                            </div>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto p-6 space-y-8 pb-24">
                                {/* Categories */}
                                <div>
                                    <h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-4">
                                        Categories
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleCategoryClick(null)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${currentCategory === null
                                                ? "bg-gray-900 text-white border-gray-900"
                                                : "bg-white text-gray-600 border-gray-200 hover:border-green-500"
                                                }`}
                                        >
                                            All
                                        </button>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => handleCategoryClick(cat)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${currentCategory === cat
                                                    ? "bg-green-600 text-white border-green-600"
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-green-500"
                                                    }`}
                                            >
                                                <span>{CATEGORY_ICONS[cat] || "🌾"}</span>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sort Options */}
                                <div>
                                    <h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-4">
                                        Sort By
                                    </h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: "Newest Arrivals", value: "newest" },
                                            { label: "Price: Low to High", value: "price_asc" },
                                            { label: "Price: High to Low", value: "price_desc" },
                                            { label: "Most Popular", value: "popular" },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleSortClick(option.value)}
                                                className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-700 font-medium transition-colors flex justify-between items-center group"
                                            >
                                                {option.label}
                                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-green-500" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
