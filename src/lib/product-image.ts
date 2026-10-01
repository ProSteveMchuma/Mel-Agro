/**
 * Remote catalogue photos must load in the browser as-is.
 * Next/Image otherwise rewrites them to `/_next/image`, which the live
 * host rejects with HTTP 402.
 */
export function skipImageOptimizer(src: unknown): boolean {
    if (typeof src !== 'string') return false;
    return /^https?:\/\//i.test(src.trim());
}
