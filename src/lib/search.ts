import Fuse from 'fuse.js';
import { Product } from '@/types';

const FUSE_KEYS = [
    { name: 'name', weight: 0.4 },
    { name: 'brand', weight: 0.3 },
    { name: 'tags', weight: 0.2 },
    { name: 'category', weight: 0.1 },
] as const;

export const STRICT_FUSE_OPTIONS = {
    keys: FUSE_KEYS as any,
    threshold: 0.3,
    includeScore: true,
    ignoreLocation: true,
} as const;

export const LOOSE_FUSE_OPTIONS = {
    keys: FUSE_KEYS as any,
    threshold: 0.5,
    includeScore: true,
    ignoreLocation: true,
} as const;

export function searchProducts(products: Product[], query: string): Product[] {
    const trimmed = (query || '').trim();
    if (!trimmed || products.length === 0) return [];
    const fuse = new Fuse(products, STRICT_FUSE_OPTIONS);
    return fuse.search(trimmed).map(r => r.item);
}

export interface DidYouMeanResult {
    correctedTerm: string;
    sample: Product;
}

export function didYouMean(products: Product[], query: string, max = 3): DidYouMeanResult[] {
    const trimmed = (query || '').trim();
    if (trimmed.length < 3 || products.length === 0) return [];

    const fuse = new Fuse(products, LOOSE_FUSE_OPTIONS);
    const results = fuse.search(trimmed);

    const seen = new Set<string>();
    const out: DidYouMeanResult[] = [];

    for (const { item } of results) {
        const candidates: string[] = [item.name];
        if (item.brand) candidates.push(item.brand);
        if (item.category) candidates.push(item.category);

        for (const candidate of candidates) {
            const key = candidate.toLowerCase();
            if (!seen.has(key) && key !== trimmed.toLowerCase() && !key.includes(trimmed.toLowerCase())) {
                seen.add(key);
                out.push({ correctedTerm: candidate, sample: item });
                if (out.length >= max) return out;
            }
        }
    }

    return out;
}

export interface RecentSearch {
    term: string;
    timestamp: number;
}

const RECENT_KEY = 'melagri_recent_searches';
const RECENT_MAX = 5;

export function getRecentSearches(): RecentSearch[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as RecentSearch[];
        return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
    } catch {
        return [];
    }
}

export function saveRecentSearch(term: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
        const current = getRecentSearches().filter(r => r.term.toLowerCase() !== trimmed.toLowerCase());
        const next = [{ term: trimmed, timestamp: Date.now() }, ...current].slice(0, RECENT_MAX);
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
        // ignore quota / serialization issues
    }
}

export function clearRecentSearches(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(RECENT_KEY);
    } catch {
        // ignore
    }
}
