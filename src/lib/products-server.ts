import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase-admin';
import type { Product } from '@/types';

function plainProduct(snapshot: FirebaseFirestore.DocumentSnapshot): Product {
    const data = snapshot.data() || {};
    return JSON.parse(JSON.stringify({
        id: snapshot.id,
        ...data,
        createdAt: (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.().toISOString(),
        updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.().toISOString(),
    })) as Product;
}

export const getAllProductsServerCached = unstable_cache(
    async (limitCount = 500): Promise<Product[]> => {
        const snapshot = await adminDb.collection('products').limit(Math.min(1000, Math.max(1, limitCount))).get();
        return snapshot.docs.map(plainProduct);
    },
    ['all-products-server'],
    { revalidate: 3600, tags: ['products'] },
);

export const getProductsByTaxonomyCached = unstable_cache(
    async (field: 'category' | 'brand', value: string, limitCount = 48): Promise<Product[]> => {
        const snapshot = await adminDb.collection('products').where(field, '==', value).limit(Math.min(100, Math.max(1, limitCount))).get();
        return snapshot.docs.map(plainProduct);
    },
    ['products-by-taxonomy'],
    { revalidate: 3600, tags: ['products'] },
);

export const getProductByIdServerCached = unstable_cache(
    async (id: string): Promise<Product | undefined> => {
        const snapshot = await adminDb.collection('products').doc(id).get();
        return snapshot.exists ? plainProduct(snapshot) : undefined;
    },
    ['product-by-id-server'],
    { revalidate: 900, tags: ['products'] },
);

export const getUniqueBrandsCached = unstable_cache(
    async () => {
        const snapshot = await adminDb.collection('products').select('brand').limit(1000).get();
        const counts = new Map<string, number>();
        snapshot.docs.forEach(doc => {
            const brand = String(doc.data().brand || '').trim();
            if (brand) counts.set(brand, (counts.get(brand) || 0) + 1);
        });
        return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([brand]) => brand);
    },
    ['unique-brands'],
    { revalidate: 3600, tags: ['products'] }
);

export const getUniqueCategoriesCached = unstable_cache(
    async () => {
        const snapshot = await adminDb.collection('products').select('category').limit(1000).get();
        return [...new Set(snapshot.docs.map(doc => String(doc.data().category || '').trim()).filter(Boolean))].sort();
    },
    ['unique-categories'],
    { revalidate: 3600, tags: ['products'] }
);

// Cached version of related products
export const getRelatedProductsCached = unstable_cache(
    async (category: string, currentId: string) => {
        const snapshot = await adminDb.collection('products').where('category', '==', category).limit(8).get();
        return snapshot.docs.filter(doc => doc.id !== currentId).map(plainProduct).slice(0, 4);
    },
    ['related-products'],
    { revalidate: 3600, tags: ['products'] }
);

// Cached version of featured products
export const getFeaturedProductsCached = unstable_cache(
    async (limitCount: number) => {
        const snapshot = await adminDb.collection('products').where('featured', '==', true).limit(Math.min(12, Math.max(1, limitCount))).get();
        return snapshot.docs.map(plainProduct);
    },
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
