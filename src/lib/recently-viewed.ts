export type RecentView = { id: string; at: number };

const STORAGE_KEY = 'Mel-Agri_recently_viewed';
export const RECENTLY_VIEWED_LIMIT = 12;

export function readRecentlyViewed(): RecentView[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry) => entry && typeof entry.id === 'string' && entry.id)
            .map((entry) => ({ id: String(entry.id), at: Number(entry.at) || 0 }))
            .slice(0, RECENTLY_VIEWED_LIMIT);
    } catch {
        return [];
    }
}

export function recordRecentlyViewed(productId: string, now = Date.now()): RecentView[] {
    const id = String(productId || '').trim();
    if (!id || typeof window === 'undefined') return readRecentlyViewed();
    const next = [{ id, at: now }, ...readRecentlyViewed().filter((entry) => entry.id !== id)].slice(
        0,
        RECENTLY_VIEWED_LIMIT,
    );
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // ignore quota / private mode
    }
    return next;
}

export function recentlyViewedIds(limit = RECENTLY_VIEWED_LIMIT): string[] {
    return readRecentlyViewed().slice(0, limit).map((entry) => entry.id);
}
