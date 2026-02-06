"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProducts, Product } from "@/lib/products";
import { CATEGORY_ICONS } from "./SidebarCategories";
import { useBehavior } from "@/context/BehaviorContext";

const TRENDING_SEARCHES = [
    { term: "Hybrid Maize Seeds", icon: "🌱" },
    { term: "DAP Fertilizer", icon: "📦" },
    { term: "Knapsack Sprayer", icon: "🚿" },
    { term: "Chicken Feed", icon: "🐔" },
];
interface EnhancedSearchProps {
    className?: string;
    autoFocus?: boolean;
    variant?: 'default' | 'mobile';
}

export default function EnhancedSearch({ className = "", autoFocus = false, variant = 'default' }: EnhancedSearchProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [popularProducts, setPopularProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { getTopAffinity } = useBehavior();

    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const topAffinity = getTopAffinity();

            // Fetch a larger set of products for fuzzy matching
            const products = await getProducts({ limitCount: 50 });
            setAllProducts(products);

            // Prioritize fetching products from the top affinity category for the initial view
            const affinityProducts = products
                .filter(p => topAffinity !== 'General' ? p.category === topAffinity : true)
                .slice(0, 3);
            setPopularProducts(affinityProducts);

            // Get some categories for quick access
            const cats = Array.from(new Set(products.map(p => p.category))).slice(0, 4);
            setCategories(cats);
        };
        fetchData();
    }, [getTopAffinity]);

    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            import("fuse.js").then((Fuse) => {
                const fuse = new Fuse.default(allProducts, {
                    keys: ['name', 'category', 'tags'],
                    threshold: 0.3
                });
                const results = fuse.search(searchQuery).map(r => r.item).slice(0, 3);
                setSuggestions(results);
            });
        } else {
            setSuggestions([]);
        }
    }, [searchQuery, allProducts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
            setIsFocused(false);
        }
    };

    const handleQuickSearch = (term: string) => {
        setSearchQuery(term);
        router.push(`/products?search=${encodeURIComponent(term)}`);
        setIsFocused(false);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-4xl mx-auto z-50">
            {/* Search Input Area */}
            <div className={`
                relative transition-all duration-300 ease-out border
                ${isFocused
                    ? "bg-white shadow-2xl rounded-t-[1.5rem] md:rounded-t-[2.5rem] rounded-b-none border-green-500/30"
                    : variant === 'mobile'
                        ? "bg-gray-100/80 backdrop-blur-md rounded-[1.5rem] border-gray-200"
                        : "bg-gray-900/40 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] border-white/20 hover:border-white/30 shadow-lg"
                }
            `}>
                <form onSubmit={handleSearch} className="relative flex items-center p-1.5 md:p-2">
                    <div className="flex-grow relative pl-2 md:pl-6">
                        <svg className={`w-5 h-5 md:w-6 md:h-6 absolute left-4 md:left-6 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isFocused || variant === 'mobile' ? "text-green-600" : "text-white/40"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            autoFocus={autoFocus}
                            onFocus={() => setIsFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="What are you planting today?"
                            className={`
                                w-full pl-10 md:pl-10 pr-4 md:pr-6 py-3.5 md:py-5 bg-transparent border-none focus:ring-0 text-base md:text-lg transition-colors duration-300
                                ${isFocused || variant === 'mobile' ? "text-gray-900 placeholder:text-gray-400" : "text-white placeholder:text-white/40"}
                            `}
                        />
                    </div>
                    {!isFocused && (
                        <div className="hidden md:flex gap-2 mr-4">
                            {['Maize', 'Tools'].map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleQuickSearch(tag)}
                                    className="px-4 py-2 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        type="submit"
                        className={`
                            px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all mr-1
                            ${isFocused
                                ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20"
                                : "bg-white text-gray-900 hover:scale-105"}
                        `}
                    >
                        Search
                    </button>
                </form>
            </div>

            {/* Intelligent Dropdown */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-b-[1.5rem] md:rounded-b-[2.5rem] border-x border-b border-green-500/20 overflow-hidden"
                    >
                        <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 max-h-[70vh] md:max-h-none overflow-y-auto">
                            {/* Left Column: Trending & Categories */}
                            <div className="md:col-span-4 space-y-6 md:space-y-10">
                                <div>
                                    <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-3 md:mb-4">Trending Now</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3">
                                        {TRENDING_SEARCHES.map((item) => (
                                            <button
                                                key={item.term}
                                                onClick={() => handleQuickSearch(item.term)}
                                                className="flex items-center gap-2 md:gap-3 w-full text-left p-2 md:p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-gray-50 md:border-transparent"
                                            >
                                                <span className="text-lg md:text-xl group-hover:scale-125 transition-transform">{item.icon}</span>
                                                <span className="text-xs md:text-sm font-bold text-gray-700 truncate">{item.term}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4">Quick Categories</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {categories.map((cat) => (
                                            <Link
                                                key={cat}
                                                href={`/products?category=${encodeURIComponent(cat)}`}
                                                className="px-4 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all border border-gray-100"
                                            >
                                                {CATEGORY_ICONS[cat] || "🌾"} {cat}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Popular Products or Fuzzy Suggestions */}
                            <div className="md:col-span-8">
                                <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4 md:mb-6">
                                    {(searchQuery.length > 1 && suggestions.length > 0) ? "Intelligent Suggestions" : "Popular Right Now"}
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                                    {(searchQuery.length > 1 && suggestions.length > 0 ? suggestions : popularProducts).map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/products/${product.id}`}
                                            className="group space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:border-green-500/20 transition-all"
                                        >
                                            <div className="relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm">
                                                <Image
                                                    src={product.image || (product.images && product.images[0]) || ""}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-black text-gray-900 line-clamp-1 group-hover:text-green-600 transition-colors uppercase tracking-tight">
                                                    {product.name}
                                                </h5>
                                                <p className="font-bold text-green-600 text-sm mt-1">
                                                    KSh {Number(product.price).toLocaleString()}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <Link href="/products" className="text-xs font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-widest inline-flex items-center gap-2">
                                        See all products
                                        <span className="text-lg">→</span>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Footer Hint */}
                        <div className="bg-gray-50 p-4 text-center">
                            <p className="text-[10px] font-medium text-gray-400">
                                Press <kbd className="font-sans px-1.5 py-0.5 rounded border border-gray-200 bg-white">Enter</kbd> to search for <span className="text-green-600 font-bold">"{searchQuery || "..."}"</span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
