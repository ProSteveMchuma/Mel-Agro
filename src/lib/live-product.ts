import type { Product } from '@/types';

const availabilityKeys = ['stockQuantity', 'inStock', 'variants', 'price'] as const;

export function applyLiveCatalogueProduct<T extends { id?: string | number }>(
    seed: T,
    live?: Product | null,
): T {
    if (!live || String(live.id) !== String(seed.id)) return seed;
    const overlay: Record<string, unknown> = {};
    for (const key of availabilityKeys) {
        if (live[key] !== undefined) overlay[key] = live[key];
    }
    return { ...seed, ...overlay, id: seed.id };
}
