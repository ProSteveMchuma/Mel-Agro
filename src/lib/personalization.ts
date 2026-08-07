import type { Product } from '@/types';

export const RECOMMENDATION_MODEL_VERSION = 'affinity-v1';

export interface RankedProduct {
    product: Product;
    score: number;
    reason: string;
}

function isAvailable(product: Product) {
    return product.inStock !== false && Number(product.stockQuantity ?? product.stock ?? 0) > 0;
}

export function rankProductsForUser(
    products: Product[],
    affinityIndex: Record<string, number>,
    enabled = true,
    max = 12,
    regionalPopularity: Record<string, number> = {},
    county?: string,
): RankedProduct[] {
    const available = products.filter(isAvailable);
    const highestAffinity = Math.max(1, ...Object.values(affinityIndex));
    const hasAffinity = enabled && Object.keys(affinityIndex).length > 0;
    const highestRegional = Math.max(1, ...Object.values(regionalPopularity));

    return available.map(product => {
        const affinity = hasAffinity ? Number(affinityIndex[product.category] || 0) / highestAffinity : 0;
        const quality = Math.min(1, Math.max(0, Number(product.rating || 0) / 5));
        const trust = Math.min(1, Math.log10(Number(product.reviews || 0) + 1) / 3);
        const featured = product.featured ? 1 : 0;
        const regional = Number(regionalPopularity[String(product.id)] || 0) / highestRegional;
        const score = affinity * 45 + regional * 15 + quality * 25 + trust * 10 + featured * 5;
        const reason = affinity >= 0.65
            ? `Based on your interest in ${product.category}`
            : regional >= 0.5 && county
                ? `Popular with customers in ${county}`
            : product.featured
                ? 'Featured by Mel-Agri'
                : Number(product.rating || 0) >= 4
                    ? 'Highly rated by customers'
                    : 'Available in the catalog';
        return { product, score, reason };
    }).sort((a, b) => b.score - a.score || String(a.product.name).localeCompare(String(b.product.name))).slice(0, max);
}
