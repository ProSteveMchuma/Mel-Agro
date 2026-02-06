import { unstable_cache } from 'next/cache';
import { getUniqueBrands, getUniqueCategories, getRelatedProducts, getFeaturedProducts } from './products';

export const getUniqueBrandsCached = unstable_cache(
    async () => getUniqueBrands(),
    ['unique-brands'],
    { revalidate: 3600, tags: ['products'] }
);

export const getUniqueCategoriesCached = unstable_cache(
    async () => getUniqueCategories(),
    ['unique-categories'],
    { revalidate: 3600, tags: ['products'] }
);

// Cached version of related products
export const getRelatedProductsCached = unstable_cache(
    async (category: string, currentId: string) => getRelatedProducts(category, currentId),
    ['related-products'],
    { revalidate: 3600, tags: ['products'] }
);

// Cached version of featured products
export const getFeaturedProductsCached = unstable_cache(
    async (limitCount: number) => getFeaturedProducts(limitCount),
    ['featured-products'],
    { revalidate: 3600, tags: ['products'] }
);
