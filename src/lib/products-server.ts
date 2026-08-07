import { unstable_cache } from 'next/cache';
import { getUniqueBrands, getUniqueCategories, getRelatedProducts, getFeaturedProducts } from './products';
import { adminDb } from './firebase-admin';
import type { Product } from '@/types';

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

const hazardousCategory = (category: unknown) => /crop protection|pesticide|herbicide|fungicide|insecticide|veterinary/i.test(String(category || ''));

export const getSafeCoPurchaseProductsCached = unstable_cache(
    async (currentId: string, currentCategory: string): Promise<Product[]> => {
        // Never infer treatment combinations. Those require explicit agronomic review.
        if (hazardousCategory(currentCategory)) return [];
        const orders = await adminDb.collection('orders').where('paymentStatus', '==', 'Paid').limit(1000).get();
        const counts = new Map<string, number>();
        for (const order of orders.docs) {
            const items = Array.isArray(order.data().items) ? order.data().items : [];
            if (!items.some((item: Record<string, unknown>) => String(item.id) === currentId)) continue;
            for (const item of items) {
                const id = String(item.id || '');
                if (id && id !== currentId) counts.set(id, (counts.get(id) || 0) + Number(item.quantity || 1));
            }
        }
        const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
        if (!ids.length) return [];
        const snapshots = await adminDb.getAll(...ids.map(id => adminDb.collection('products').doc(id)));
        return snapshots.flatMap(snapshot => {
            if (!snapshot.exists) return [];
            const product = { id: snapshot.id, ...snapshot.data() } as Product;
            if (hazardousCategory(product.category) || product.inStock === false || Number(product.stockQuantity ?? product.stock ?? 0) <= 0) return [];
            return [product];
        }).slice(0, 4);
    },
    ['safe-co-purchase-products'],
    { revalidate: 3600, tags: ['products', 'orders'] },
);
