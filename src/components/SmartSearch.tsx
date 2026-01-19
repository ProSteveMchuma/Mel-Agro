"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/context/ProductContext";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Fuse from "fuse.js";

// Export reusable search function
export const fuzzySearch = (products: any[], query: string) => {
    const fuseOptions = {
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'tags', weight: 0.3 },
            { name: 'category', weight: 0.2 },
            { name: 'description', weight: 0.1 }
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
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

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

    // Initialize Fuse for fuzzy search
    // Options are now centralized in fuzzySearch export
    const fuseOptions = {
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'tags', weight: 0.3 },
            { name: 'category', weight: 0.2 },
            { name: 'description', weight: 0.1 }
        ],
        threshold: 0.3,
        includeScore: true
    };

    // Filter products based on query using Fuse
    useEffect(() => {
        if (query.trim().length > 1) {
            // Dynamically import Fuse to avoid server-side issues and reduce initial bundle
            import("fuse.js").then((Fuse) => {
                const fuse = new Fuse.default(products, fuseOptions);
                const result = fuse.search(query);

                // Extract items from Fuse result and limit to 5
                const matches = result.slice(0, 5).map(r => r.item);
                setSuggestions(matches);
                setIsOpen(true);
            });
        } else {
            setSuggestions([]);
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
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="font-bold text-melagro-primary">{part}</span>
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
                    className="w-full pl-10 pr-10 py-2.5 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-melagro-primary/50 focus:bg-white transition-all text-sm shadow-sm"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-melagro-primary transition-colors"
                    title="Voice Search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
            </form>

            {/* Suggestions Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {suggestions.length > 0 ? (
                        <>
                            <div className="py-2">
                                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Suggested Products
                                </div>
                                {suggestions.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.id}`}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0">
                                            {product.image ? (
                                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Img</div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate group-hover:text-melagro-primary transition-colors">
                                                {highlightMatch(product.name, query)}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {product.category} • <span className="text-green-600 font-medium">KES {product.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 text-center">
                                <button
                                    onClick={handleSearch}
                                    className="text-sm text-melagro-primary font-bold hover:underline"
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
