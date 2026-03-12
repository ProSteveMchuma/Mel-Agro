"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/context/ProductContext";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Fuse from "fuse.js";
import { useBehavior } from "@/context/BehaviorContext";

// Export reusable search function
export const fuzzySearch = (products: any[], query: string) => {
    const fuseOptions = {
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'brand', weight: 0.3 },
            { name: 'tags', weight: 0.2 },
            { name: 'category', weight: 0.1 }
        ],
        threshold: 0.3,
        includeScore: true
    };
    const fuse = new Fuse(products, fuseOptions);
    return fuse.search(query).map(r => r.item);
};

export default function SmartSearch() {
    const { products } = useProducts();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<typeof products>([]);
    const [intents, setIntents] = useState<string[]>([]);
    const [matchedBrands, setMatchedBrands] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();
    const { trackAction } = useBehavior();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fuseOptions = {
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'brand', weight: 0.3 },
            { name: 'tags', weight: 0.2 },
            { name: 'category', weight: 0.1 }
        ],
        threshold: 0.3,
        includeScore: true
    };

    // Intent Mapping for "Understanding" the Customer
    const INTENT_MAP: Record<string, string[]> = {
        "Crop Protection": ["kill", "pest", "insect", "weed", "disease", "fungus", "spray", "herbicide", "insecticide", "fungicide", "protection", "poison"],
        "Animal Feeds": ["cow", "cattle", "chicken", "poultry", "pig", "dairy", "animal", "feed", "livestock", "dog", "cat", "nutrition"],
        "Veterinary Products": ["vet", "medicine", "vaccine", "treatment", "sick", "wound", "injection", "animal health"],
        "Seeds": ["seed", "maize", "bean", "grow", "yield", "hybrid", "planting", "crop"],
        "Fertilizers": ["fertilizer", "soil", "nutrient", "npk", "manure", "dap", "can", "top dress", "booster"],
        "Farm Tools": ["tool", "equipment", "jembes", "panga", "shovels", "sprayer", "pump"]
    };

    const detectIntents = (searchTerm: string) => {
        const detected: string[] = [];
        const lowTerm = searchTerm.toLowerCase();
        for (const [category, keywords] of Object.entries(INTENT_MAP)) {
            if (keywords.some(kw => lowTerm.includes(kw))) {
                detected.push(category);
            }
        }
        return detected;
    };

    // Filter products based on query using Fuse
    useEffect(() => {
        if (query.trim().length > 1) {
            // Dynamically import Fuse to avoid server-side issues and reduce initial bundle
            import("fuse.js").then((Fuse) => {
                const fuse = new Fuse.default(products, fuseOptions);
                const result = fuse.search(query);

                // Detect semantic intent
                const detectedIntents = detectIntents(query);
                setIntents(detectedIntents);

                // Extract unique brands that match the query
                const brandMatches = Array.from(new Set(
                    products
                        .filter(p => p.brand && p.brand.toLowerCase().includes(query.toLowerCase()))
                        .map(p => p.brand as string)
                )).slice(0, 3);
                
                setMatchedBrands(brandMatches);

                // Extract items from Fuse result and limit to 5
                // Priority: Direct matches + Intent matches
                let matches = result.slice(0, 5).map(r => r.item);

                // If no direct matches but we have intents, find products in those categories
                if (matches.length < 3 && detectedIntents.length > 0) {
                    const intentProducts = products
                        .filter(p => detectedIntents.includes(p.category) && !matches.find(m => m.id === p.id))
                        .slice(0, 5 - matches.length);
                    matches = [...matches, ...intentProducts];
                }

                if (matches.length === 0 && detectedIntents.length === 0) {
                    trackAction('empty_search', { query });
                }

                setSuggestions(matches);
                setIsOpen(true);
            });
        } else {
            setSuggestions([]);
            setIntents([]);
            setMatchedBrands([]);
            setIsOpen(false);
        }
    }, [query, products]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(query);
    };

    const performSearch = (searchTerm: string) => {
        if (searchTerm.trim()) {
            // Log the search query for analytics
            import('@/lib/analytics').then(({ AnalyticsService }) => {
                AnalyticsService.logSearch(searchTerm);
            });

            router.push(`/products?search=${encodeURIComponent(searchTerm)}`);
            setIsOpen(false);
        }
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
                setQuery(transcript);
                performSearch(transcript);
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
        if (!highlight.trim() || !text) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="font-bold text-melagri-primary">{part}</span>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    return (
        <div ref={wrapperRef} className="relative w-full md:w-80 lg:w-96 z-50">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim().length > 1 && setIsOpen(true)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-melagri-primary/50 focus:bg-white transition-all text-sm shadow-sm"
                />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>

                {/* Microphone Icon */}
                <button
                    type="button"
                    onClick={startVoiceSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-melagri-primary transition-colors"
                    title="Voice Search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
            </form>

            {/* Suggestions Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px]">
                    {intents.length > 0 || matchedBrands.length > 0 || suggestions.length > 0 ? (
                        <>
                            <div className="py-2">
                                {/* Intent-Based Solutions */}
                                {intents.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-2 text-[10px] font-black text-melagri-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-melagri-primary animate-pulse" />
                                            Recommended Solutions
                                        </div>
                                        {intents.map(intent => (
                                            <button
                                                key={intent}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    router.push(`/products?category=${encodeURIComponent(intent)}`);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-melagri-primary group flex items-center justify-between transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-melagri-primary group-hover:bg-white/20 group-hover:text-white transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                    <div>
                                                        <span className="block text-sm font-black text-gray-800 group-hover:text-white transition-colors">{intent}</span>
                                                        <span className="block text-[10px] text-gray-500 group-hover:text-green-100 transition-colors uppercase tracking-widest font-bold">View full category</span>
                                                    </div>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        ))}
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                    </div>
                                )}

                                {/* Brand Matches */}
                                {matchedBrands.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                            Trusted Brands
                                        </div>
                                        {matchedBrands.map(brand => (
                                            <button
                                                key={brand}
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    router.push(`/products?search=${encodeURIComponent(brand)}`);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-melagri-primary/10 group-hover:text-melagri-primary transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m0 10h1m-1 4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-melagri-primary transition-colors">{highlightMatch(brand, query)}</span>
                                            </button>
                                        ))}
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                    </div>
                                )}

                                <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    Product Matches
                                </div>
                                {suggestions.map((product: any) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0">
                                            {product.image ? (
                                                <Image
                                                    src={product.image}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized={typeof product.image === 'string' && product.image.includes('firebasestorage')}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Img</div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate group-hover:text-melagri-primary transition-colors">
                                                {highlightMatch(product.name, query)}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {product.brand && (
                                                    <>
                                                        <span className="font-bold text-gray-700">{highlightMatch(product.brand, query)}</span>
                                                        {" • "}
                                                    </>
                                                )}
                                                {product.category} • <span className="text-green-600 font-medium">KES {product.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 text-center">
                                <button
                                    onClick={handleSearch}
                                    className="text-sm text-melagri-primary font-bold hover:underline"
                                >
                                    View all results for "{query}"
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-sm">No products found for "{query}"</p>
                            <p className="text-xs mt-1 text-gray-400">Try searching for "fertilizer" or "seeds"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
