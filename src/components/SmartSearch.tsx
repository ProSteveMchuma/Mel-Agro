"use client";

import { useState, useEffect, useRef, useMemo, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/context/ProductContext";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useBehavior } from "@/context/BehaviorContext";
import { searchProducts, didYouMean, getRecentSearches, saveRecentSearch, RecentSearch } from "@/lib/search";
import { AnalyticsService } from "@/lib/analytics";

// Re-export for legacy imports (e.g. ProductsClient still uses fuzzySearch)
export { searchProducts as fuzzySearch } from "@/lib/search";

const INTENT_MAP: Record<string, string[]> = {
    "Crop Protection": ["kill", "pest", "insect", "weed", "disease", "fungus", "spray", "herbicide", "insecticide", "fungicide", "protection", "poison"],
    "Animal Feeds": ["cow", "cattle", "chicken", "poultry", "pig", "dairy", "animal", "feed", "livestock", "dog", "cat", "nutrition"],
    "Veterinary Products": ["vet", "medicine", "vaccine", "treatment", "sick", "wound", "injection", "animal health"],
    "Seeds": ["seed", "maize", "bean", "grow", "yield", "hybrid", "planting", "crop"],
    "Fertilizers": ["fertilizer", "soil", "nutrient", "npk", "manure", "dap", "can", "top dress", "booster"],
    "Farm Tools": ["tool", "equipment", "jembes", "panga", "shovels", "sprayer", "pump"],
};

function detectIntents(searchTerm: string): string[] {
    const lowTerm = searchTerm.toLowerCase();
    return Object.entries(INTENT_MAP)
        .filter(([_, kws]) => kws.some(kw => lowTerm.includes(kw)))
        .map(([cat]) => cat);
}

export default function SmartSearch() {
    const { products } = useProducts();
    const router = useRouter();
    const { t } = useLanguage();
    const { trackAction } = useBehavior();

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [recent, setRecent] = useState<RecentSearch[]>([]);
    const [popular, setPopular] = useState<Array<{ term: string }>>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setRecent(getRecentSearches());
        AnalyticsService.getPopularSearches(5).then(setPopular).catch(() => {});
    }, []);

    const trimmed = query.trim();

    const { suggestions, intents, matchedBrands, corrections } = useMemo(() => {
        if (trimmed.length < 2) {
            return { suggestions: [], intents: [], matchedBrands: [], corrections: [] };
        }

        const detectedIntents = detectIntents(trimmed);
        const queryLower = trimmed.toLowerCase();

        const brandMatches = Array.from(new Set(
            products
                .filter(p => p.brand && p.brand.toLowerCase().includes(queryLower))
                .map(p => p.brand as string)
        )).slice(0, 3);

        let matches = searchProducts(products, trimmed).slice(0, 5);

        if (matches.length < 3 && detectedIntents.length > 0) {
            const intentProducts = products
                .filter(p => detectedIntents.includes(p.category) && !matches.find(m => m.id === p.id))
                .slice(0, 5 - matches.length);
            matches = [...matches, ...intentProducts];
        }

        const corrections = matches.length === 0 ? didYouMean(products, trimmed, 3) : [];

        return {
            suggestions: matches,
            intents: detectedIntents,
            matchedBrands: brandMatches,
            corrections,
        };
    }, [trimmed, products]);

    useEffect(() => {
        if (trimmed.length >= 2) {
            setIsOpen(true);
            setActiveIndex(-1);
            if (suggestions.length === 0 && intents.length === 0) {
                trackAction('empty_search', { query: trimmed });
            }
        }
    }, [trimmed, suggestions.length, intents.length, trackAction]);

    const flatNavItems = useMemo(() => {
        if (trimmed.length < 2) {
            return [
                ...recent.map(r => ({ kind: 'recent' as const, term: r.term })),
                ...popular.map(p => ({ kind: 'popular' as const, term: p.term })),
            ];
        }
        return [
            ...intents.map(intent => ({ kind: 'intent' as const, term: intent })),
            ...matchedBrands.map(brand => ({ kind: 'brand' as const, term: brand })),
            ...suggestions.map(p => ({ kind: 'product' as const, id: p.id as any, term: p.name })),
            ...corrections.map(c => ({ kind: 'correction' as const, term: c.correctedTerm })),
        ];
    }, [trimmed, recent, popular, intents, matchedBrands, suggestions, corrections]);

    const performSearch = (searchTerm: string) => {
        const term = searchTerm.trim();
        if (!term) return;
        AnalyticsService.logSearch(term);
        saveRecentSearch(term);
        setRecent(getRecentSearches());
        trackAction('search_performed', { query: term });
        router.push(`/products?search=${encodeURIComponent(term)}`);
        setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, flatNavItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setActiveIndex(-1);
        } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < flatNavItems.length) {
            e.preventDefault();
            const item = flatNavItems[activeIndex];
            if (item.kind === 'product' && (item as any).id) {
                router.push(`/products/${(item as any).id}`);
                setIsOpen(false);
            } else if (item.kind === 'intent') {
                router.push(`/products?category=${encodeURIComponent(item.term)}`);
                setIsOpen(false);
            } else if (item.kind === 'brand') {
                router.push(`/products?brand=${encodeURIComponent(item.term)}`);
                setIsOpen(false);
            } else {
                setQuery(item.term);
                performSearch(item.term);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(trimmed || '');
    };

    const startVoiceSearch = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            alert("Voice search isn't supported in this browser. Try Chrome or Edge.");
            return;
        }
        const recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            performSearch(transcript);
        };
        recognition.onerror = () => {
            alert("Could not hear you. Please try again.");
        };
    };

    const highlightMatch = (text: string, highlight: string) => {
        if (!highlight.trim() || !text) return text;
        const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="font-bold text-melagri-primary">{part}</span>
                    ) : part
                )}
            </span>
        );
    };

    let cursor = 0;
    const itemIndex = () => cursor++;

    const showEmptyDropdown = trimmed.length < 2 && (recent.length > 0 || popular.length > 0);
    const hasResults = suggestions.length > 0 || intents.length > 0 || matchedBrands.length > 0;
    const showCorrections = trimmed.length >= 2 && !hasResults && corrections.length > 0;

    return (
        <div ref={wrapperRef} className="relative w-full md:w-80 lg:w-96 z-50">
            <form onSubmit={handleSubmit} className="relative">
                <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-10 py-2.5 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-melagri-primary/50 focus:bg-white transition-all text-sm shadow-sm"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <button
                    type="button"
                    onClick={startVoiceSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-melagri-primary transition-colors"
                    title="Voice Search"
                    aria-label="Voice search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
            </form>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px] max-h-[70vh] overflow-y-auto" role="listbox">
                    {/* Empty state — recent + popular */}
                    {showEmptyDropdown && (
                        <div className="py-2">
                            {recent.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex justify-between items-center">
                                        <span>Recent Searches</span>
                                    </div>
                                    {recent.map(r => {
                                        const i = itemIndex();
                                        const active = i === activeIndex;
                                        return (
                                            <button
                                                key={`recent-${r.term}`}
                                                onClick={() => { setQuery(r.term); performSearch(r.term); }}
                                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${active ? 'bg-melagri-primary/10' : 'hover:bg-gray-50'}`}
                                                role="option"
                                                aria-selected={active}
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-sm text-gray-700">{r.term}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {popular.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Popular Right Now</div>
                                    {popular.map(p => {
                                        const i = itemIndex();
                                        const active = i === activeIndex;
                                        return (
                                            <button
                                                key={`popular-${p.term}`}
                                                onClick={() => { setQuery(p.term); performSearch(p.term); }}
                                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${active ? 'bg-melagri-primary/10' : 'hover:bg-gray-50'}`}
                                                role="option"
                                                aria-selected={active}
                                            >
                                                <svg className="w-4 h-4 text-melagri-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                                <span className="text-sm font-medium text-gray-700">{p.term}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Results state */}
                    {trimmed.length >= 2 && hasResults && (
                        <>
                            <div className="py-2">
                                {intents.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-2 text-[10px] font-black text-melagri-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-melagri-primary animate-pulse" />
                                            Recommended Solutions
                                        </div>
                                        {intents.map(intent => {
                                            const i = itemIndex();
                                            const active = i === activeIndex;
                                            return (
                                                <button
                                                    key={intent}
                                                    onClick={() => { setIsOpen(false); router.push(`/products?category=${encodeURIComponent(intent)}`); }}
                                                    className={`w-full text-left px-4 py-3 group flex items-center justify-between transition-all ${active ? 'bg-melagri-primary text-white' : 'hover:bg-melagri-primary hover:text-white'}`}
                                                    role="option"
                                                    aria-selected={active}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-white/20 text-white' : 'bg-green-50 text-melagri-primary group-hover:bg-white/20 group-hover:text-white'}`}>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        </div>
                                                        <div>
                                                            <span className={`block text-sm font-black transition-colors ${active ? 'text-white' : 'text-gray-800 group-hover:text-white'}`}>{intent}</span>
                                                            <span className={`block text-[10px] uppercase tracking-widest font-bold transition-colors ${active ? 'text-green-100' : 'text-gray-500 group-hover:text-green-100'}`}>View full category</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                    </div>
                                )}

                                {matchedBrands.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Trusted Brands</div>
                                        {matchedBrands.map(brand => {
                                            const i = itemIndex();
                                            const active = i === activeIndex;
                                            return (
                                                <button
                                                    key={brand}
                                                    onClick={() => { setIsOpen(false); router.push(`/products?brand=${encodeURIComponent(brand)}`); }}
                                                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors group ${active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                                    role="option"
                                                    aria-selected={active}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-melagri-primary/10 group-hover:text-melagri-primary transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m0 10h1m-1 4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700 group-hover:text-melagri-primary transition-colors">{highlightMatch(brand, trimmed)}</span>
                                                </button>
                                            );
                                        })}
                                        <div className="h-px bg-gray-50 mx-4 my-2" />
                                    </div>
                                )}

                                <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Matches</div>
                                {suggestions.map((product: any) => {
                                    const i = itemIndex();
                                    const active = i === activeIndex;
                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/products/${product.id}`}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 transition-colors group ${active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                            role="option"
                                            aria-selected={active}
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
                                                    {highlightMatch(product.name, trimmed)}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {product.brand && (
                                                        <>
                                                            <span className="font-bold text-gray-700">{highlightMatch(product.brand, trimmed)}</span>
                                                            {" • "}
                                                        </>
                                                    )}
                                                    {product.category} • <span className="text-green-600 font-medium">KES {product.price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 text-center">
                                <button onClick={() => performSearch(trimmed)} className="text-sm text-melagri-primary font-bold hover:underline">
                                    View all results for &ldquo;{trimmed}&rdquo;
                                </button>
                            </div>
                        </>
                    )}

                    {/* Did-you-mean state */}
                    {showCorrections && (
                        <div className="py-4 px-4">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">No exact matches — did you mean?</div>
                            <div className="space-y-1">
                                {corrections.map(({ correctedTerm }) => {
                                    const i = itemIndex();
                                    const active = i === activeIndex;
                                    return (
                                        <button
                                            key={correctedTerm}
                                            onClick={() => { setQuery(correctedTerm); performSearch(correctedTerm); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${active ? 'bg-melagri-primary/10 text-melagri-primary' : 'hover:bg-gray-50 text-gray-700'}`}
                                            role="option"
                                            aria-selected={active}
                                        >
                                            <svg className="w-4 h-4 text-melagri-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            <span className="text-sm font-bold">{correctedTerm}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {popular.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Or try popular searches</div>
                                    <div className="flex flex-wrap gap-2">
                                        {popular.slice(0, 5).map(p => (
                                            <button
                                                key={`pop-${p.term}`}
                                                onClick={() => { setQuery(p.term); performSearch(p.term); }}
                                                className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-melagri-primary hover:text-white text-xs font-bold text-gray-600 transition-colors"
                                            >
                                                {p.term}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Truly empty state */}
                    {trimmed.length >= 2 && !hasResults && corrections.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-sm">No products found for &ldquo;{trimmed}&rdquo;</p>
                            <p className="text-xs mt-1 text-gray-400">Try &ldquo;fertilizer&rdquo;, &ldquo;maize seeds&rdquo;, or browse <Link href="/products" className="text-melagri-primary font-bold hover:underline">all products</Link>.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
