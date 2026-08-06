export interface RateLimitOptions {
    limit: number;
    windowMs: number;
    now?: number;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function getClientAddress(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')?.trim()
        || 'unknown';
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
    const now = options.now ?? Date.now();
    const current = store.get(key);
    const entry = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : current;

    entry.count += 1;
    store.set(key, entry);

    // Avoid unbounded growth in long-running processes.
    if (store.size > 10_000) {
        for (const [storedKey, storedEntry] of store) {
            if (storedEntry.resetAt <= now) store.delete(storedKey);
        }
    }

    return {
        allowed: entry.count <= options.limit,
        limit: options.limit,
        remaining: Math.max(0, options.limit - entry.count),
        resetAt: entry.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
}

export function resetRateLimitsForTests() {
    store.clear();
}
