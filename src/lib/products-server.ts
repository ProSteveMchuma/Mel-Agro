import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase-admin';
import type { Product } from '@/types';
import { brandKeyFrom, collapseBrandDisplays } from '@/lib/catalog-normalize';

function plainProduct(snapshot: FirebaseFirestore.DocumentSnapshot): Product {
    const data = snapshot.data() || {};
    const brand = String(data.brand || '');
    return JSON.parse(JSON.stringify({
        id: snapshot.id,
        ...data,
        brandKey: data.brandKey || brandKeyFrom(brand) || undefined,
        createdAt: (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.().toISOString(),
        updatedAt: (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.().toISOString(),
    })) as Product;
}

export const getAllProductsServerCached = unstable_cache(
    async (limitCount = 500): Promise<Product[]> => {
        const snapshot = await adminDb.collection('products').limit(Math.min(1000, Math.max(1, limitCount))).get();
        return snapshot.docs.filter(doc => doc.data().archived !== true).map(plainProduct);
    },
    ['all-products-server'],
    { revalidate: 3600, tags: ['products'] },
);

export const getProductsByTaxonomyCached = unstable_cache(
    async (field: 'category' | 'brand', value: string, limitCount = 200): Promise<Product[]> => {
        const cap = Math.min(500, Math.max(1, limitCount));
        if (field === 'brand') {
            const key = brandKeyFrom(value);
            if (!key) return [];
            const [byKey, byExact] = await Promise.all([
                adminDb.collection('products').where('brandKey', '==', key).limit(cap).get(),
                adminDb.collection('products').where('brand', '==', value).limit(cap).get(),
            ]);
            const merged = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
            for (const doc of [...byKey.docs, ...byExact.docs]) {
                if (doc.data().archived === true) continue;
                merged.set(doc.id, doc);
            }
            // Legacy spellings without brandKey: scan a bounded window
            if (merged.size < cap) {
                const scan = await adminDb.collection('products').select('brand', 'brandKey', 'archived').limit(1500).get();
                const needFull = scan.docs.filter((doc) => {
                    if (doc.data().archived === true || merged.has(doc.id)) return false;
                    const data = doc.data();
                    return brandKeyFrom(data.brandKey || data.brand) === key;
                });
                if (needFull.length) {
                    const fullDocs = await adminDb.getAll(...needFull.slice(0, cap - merged.size).map((doc) => adminDb.collection('products').doc(doc.id)));
                    for (const doc of fullDocs) {
                        if (doc.exists) merged.set(doc.id, doc as FirebaseFirestore.QueryDocumentSnapshot);
                    }
                }
            }
            return [...merged.values()].slice(0, cap).map(plainProduct);
        }

        const snapshot = await adminDb.collection('products').where(field, '==', value).limit(cap).get();
        return snapshot.docs.filter(doc => doc.data().archived !== true).map(plainProduct);
    },
    ['products-by-taxonomy'],
    { revalidate: 3600, tags: ['products'] },
);

export const getProductByIdServerCached = unstable_cache(
    async (id: string): Promise<Product | undefined> => {
        const snapshot = await adminDb.collection('products').doc(id).get();
        return snapshot.exists && snapshot.data()?.archived !== true ? plainProduct(snapshot) : undefined;
    },
    ['product-by-id-server'],
    { revalidate: 900, tags: ['products'] },
);

export const getUniqueBrandsCached = unstable_cache(
    async () => {
        const snapshot = await adminDb.collection('products').select('brand', 'brandKey', 'archived').limit(1500).get();
        return collapseBrandDisplays(
            snapshot.docs
                .filter(doc => doc.data().archived !== true)
                .map(doc => ({ brand: doc.data().brand, brandKey: doc.data().brandKey }))
        );
    },
    ['unique-brands'],
    { revalidate: 3600, tags: ['products'] }
);

export const getUniqueCategoriesCached = unstable_cache(
    async () => {
        const snapshot = await adminDb.collection('products').select('category').limit(1000).get();
        return [...new Set(snapshot.docs.filter(doc => doc.data().archived !== true).map(doc => String(doc.data().category || '').trim()).filter(Boolean))].sort();
    },
    ['unique-categories'],
    { revalidate: 3600, tags: ['products'] }
);

// Cached version of related products
export const getRelatedProductsCached = unstable_cache(
    async (category: string, currentId: string) => {
        const snapshot = await adminDb.collection('products').where('category', '==', category).limit(8).get();
        return snapshot.docs.filter(doc => doc.id !== currentId && doc.data().archived !== true).map(plainProduct).slice(0, 4);
    },
    ['related-products'],
    { revalidate: 3600, tags: ['products'] }
);

// Cached version of featured products
export const getFeaturedProductsCached = unstable_cache(
    async (limitCount: number) => {
        const snapshot = await adminDb.collection('products').where('featured', '==', true).limit(Math.min(12, Math.max(1, limitCount))).get();
        return snapshot.docs.filter(doc => doc.data().archived !== true).map(plainProduct);
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
