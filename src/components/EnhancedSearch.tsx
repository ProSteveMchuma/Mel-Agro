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
    variant?: 'default' | 'mobile' | 'mobile-bar';
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
            const products = await getProducts({ limitCount: 50 });
            setAllProducts(products);
            const affinityProducts = products
                .filter(p => topAffinity !== 'General' ? p.category === topAffinity : true)
                .slice(0, 3);
            setPopularProducts(affinityProducts);
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

    const startVoiceSearch = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.start();

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setSearchQuery(transcript);
                router.push(`/products?search=${encodeURIComponent(transcript)}`);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                alert("Could not hear you. Please try again.");
            };
        } else {
            alert("Voice search is not supported in this browser.");
        }
    };

    const highlightMatch = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="font-bold text-green-600 bg-green-50">{part}</span>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    const isMobileBar = variant === 'mobile-bar';

    return (
        <div ref={searchRef} className={`relative w-full z-50 ${isMobileBar ? '' : 'max-w-4xl mx-auto'}`}>
            {/* Search Input Area */}
            <div className={`
                relative transition-all duration-300 ease-out border
                ${isFocused
                    ? "bg-white shadow-2xl border-green-500/30 z-[60]"
                    : isMobileBar
                        ? "bg-gray-100 border-transparent"
                        : variant === 'mobile'
                            ? "bg-gray-100/80 backdrop-blur-md border-gray-200"
                            : "bg-gray-900/40 backdrop-blur-xl border-white/20 hover:border-white/30 shadow-lg"
                }
                ${isFocused
                    ? (isMobileBar ? "rounded-b-2xl rounded-t-2xl" : "rounded-t-[1.5rem] md:rounded-t-[2.5rem] rounded-b-none")
                    : (isMobileBar ? "rounded-lg" : "rounded-[1.5rem] md:rounded-[2.5rem]")
                }
            `}>
                <form onSubmit={handleSearch} className={`relative flex items-center ${isMobileBar ? 'p-1' : 'p-1.5 md:p-2'}`}>
                    <div className={`flex-grow relative ${isMobileBar ? 'pl-2' : 'pl-2 md:pl-6'}`}>
                        <svg className={`
                            absolute top-1/2 -translate-y-1/2 transition-colors duration-300
                            ${isMobileBar ? 'left-2 w-4 h-4' : 'left-4 md:left-6 w-5 h-5 md:w-6 md:h-6'}
                            ${isFocused || variant.includes('mobile') ? "text-green-600" : "text-white/40"}
                        `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            autoFocus={autoFocus}
                            onFocus={() => setIsFocused(true)}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isMobileBar ? "Search products..." : "What are you planting today?"}
                            className={`
                                w-full bg-transparent border-none focus:ring-0 transition-colors duration-300
                                ${isMobileBar
                                    ? "py-2 pl-8 pr-8 text-sm text-gray-900 placeholder:text-gray-500 font-medium"
                                    : "py-3.5 md:py-5 pl-10 md:pl-10 pr-4 md:pr-6 text-base md:text-lg " +
                                    (isFocused || variant === 'mobile' ? "text-gray-900 placeholder:text-gray-400" : "text-white placeholder:text-white/40")
                                }
                            `}
                        />
                        {/* Voice Search Icon */}
                        <button
                            type="button"
                            onClick={startVoiceSearch}
                            className={`
                                absolute top-1/2 -translate-y-1/2 hover:text-green-600 transition-colors
                                ${isMobileBar ? 'right-2 p-1' : 'right-4 p-2'}
                                ${isFocused || variant.includes('mobile') ? "text-gray-400" : "text-white/60"}
                            `}
                        >
                            <svg className={isMobileBar ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    </div>

                    {!isMobileBar && !isFocused && (
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

                    {!isMobileBar && (
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
                    )}
                </form>
            </div>

            {/* Intelligent Dropdown */}
            <AnimatePresence>
                {isFocused && (
                    <>
                        {/* Backdrop for mobile focus */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFocused(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className={`
                                absolute left-0 right-0 bg-white shadow-2xl border-x border-b border-green-500/20 overflow-hidden z-50
                                ${isMobileBar
                                    ? "top-[110%] rounded-xl w-[95vw] -left-[2.5vw] md:w-full md:left-0"
                                    : "top-full rounded-b-[1.5rem] md:rounded-b-[2.5rem]"}
                            `}
                        >
                            <div className={`
                                grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 overflow-y-auto
                                ${isMobileBar ? "max-h-[60vh] p-4" : "p-4 md:p-8 max-h-[70vh] md:max-h-none"}
                            `}>
                                {/* Suggestions / Popular Products */}
                                <div className="col-span-1 md:col-span-12">
                                    <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4 md:mb-6">
                                        {(searchQuery.length > 1 && suggestions.length > 0) ? "Intelligent Suggestions" : "Popular Right Now"}
                                    </h4>
                                    <div className={`grid ${isMobileBar ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-3 md:gap-6'}`}>
                                        {(searchQuery.length > 1 && suggestions.length > 0 ? suggestions : popularProducts).map((product) => (
                                            <Link
                                                key={product.id}
                                                href={`/products/${product.id}`}
                                                className={`
                                                    group bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-green-500/20 transition-all flex 
                                                    ${isMobileBar ? 'items-center p-2 gap-3' : 'flex-col p-4 space-y-3'}
                                                `}
                                            >
                                                <div className={`relative overflow-hidden bg-white shadow-sm flex-shrink-0 ${isMobileBar ? 'w-12 h-12 rounded-lg' : 'aspect-square rounded-xl w-full'}`}>
                                                    <Image
                                                        src={product.image || (product.images && product.images[0]) || ""}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-black text-gray-900 line-clamp-1 group-hover:text-green-600 transition-colors uppercase tracking-tight">
                                                        {highlightMatch(product.name, searchQuery)}
                                                    </h5>
                                                    <p className="font-bold text-green-600 text-sm mt-0.5">
                                                        KSh {Number(product.price).toLocaleString()}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <button onClick={(e) => handleSearch(e)} className="text-xs font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-widest inline-flex items-center gap-2">
                                            See all products
                                            <span className="text-lg">→</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
