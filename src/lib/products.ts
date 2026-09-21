import { db } from './firebase';
import { Product } from '@/types';
export type { Product };
import { collection, getDocs, doc, getDoc, query, where, limit, orderBy, startAfter, QueryConstraint } from 'firebase/firestore';
import { brandKeyFrom, collapseBrandDisplays } from '@/lib/catalog-normalize';

function toPlainValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }

    if (Array.isArray(value)) return value.map(toPlainValue);

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toPlainValue(entry)])
    );
}

function productFromSnapshot(snapshot: { id: string; data: () => Record<string, unknown> }): Product {
    const data = snapshot.data();
    const brand = String(data.brand || '');
    return toPlainValue({
        id: snapshot.id,
        ...data,
        brandKey: data.brandKey || brandKeyFrom(brand) || undefined,
    }) as Product;
}

function isActiveProduct(snapshot: { data: () => Record<string, unknown> }) {
    return snapshot.data().archived !== true;
}

export async function getProducts(options: {
    category?: string,
    limitCount?: number,
    sortBy?: string
} = {}): Promise<Product[]> {
    try {
        const constraints: QueryConstraint[] = [];

        if (options.category && options.category !== 'All') {
            constraints.push(where("category", "==", options.category));
        }

        if (options.sortBy) {
            constraints.push(orderBy(options.sortBy));
        }

        constraints.push(limit(options.limitCount || 50));

        const q = query(collection(db, "products"), ...constraints);
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.filter(isActiveProduct).map(productFromSnapshot);
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

export async function getProductsPage(
    pageSize: number = 12,
    lastVisible?: any,
    category?: string,
    sortBy: string = 'newest',
    brands?: string[]
): Promise<{ products: Product[], lastVisible: any }> {
    try {
        const brandKeys = brands && brands.length > 0
            ? [...new Set(brands.map((brand) => brandKeyFrom(brand)).filter(Boolean))].slice(0, 10)
            : [];
        const brandDisplays = brands && brands.length > 0
            ? [...new Set(brands.map((brand) => String(brand || '').trim()).filter(Boolean))].slice(0, 10)
            : [];

        const buildConstraints = (brandMode: 'key' | 'display' | 'none'): QueryConstraint[] => {
            const constraints: QueryConstraint[] = [];
            if (category && category !== 'All') {
                constraints.push(where("category", "==", category));
            }
            if (brandMode === 'key' && brandKeys.length > 0) {
                constraints.push(where("brandKey", "in", brandKeys));
            } else if (brandMode === 'display' && brandDisplays.length > 0) {
                constraints.push(where("brand", "in", brandDisplays));
            }
            if (sortBy === 'price-low') {
                constraints.push(orderBy("price", "asc"));
            } else if (sortBy === 'price-high') {
                constraints.push(orderBy("price", "desc"));
            } else if (sortBy === 'newest' && !category && brandKeys.length === 0) {
                constraints.push(orderBy("createdAt", "desc"));
            } else if (sortBy !== 'newest' && sortBy !== 'default') {
                constraints.push(orderBy("name", "asc"));
            }
            constraints.push(limit(pageSize));
            if (lastVisible) {
                constraints.push(startAfter(lastVisible));
            }
            return constraints;
        };

        if (brandKeys.length > 0) {
            const [byKeySnap, byDisplaySnap] = await Promise.all([
                getDocs(query(collection(db, "products"), ...buildConstraints('key'))),
                getDocs(query(collection(db, "products"), ...buildConstraints('display'))),
            ]);
            const merged = new Map<string, Product>();
            let lastDoc: any = null;
            for (const docSnap of [...byKeySnap.docs, ...byDisplaySnap.docs]) {
                if (!isActiveProduct(docSnap)) continue;
                if (!merged.has(docSnap.id)) {
                    merged.set(docSnap.id, productFromSnapshot(docSnap));
                    lastDoc = docSnap;
                }
            }
            return { products: [...merged.values()].slice(0, pageSize), lastVisible: lastDoc };
        }

        const querySnapshot = await getDocs(query(collection(db, "products"), ...buildConstraints('none')));
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        const products = querySnapshot.docs.filter(isActiveProduct).map(productFromSnapshot);
        return { products, lastVisible: lastDoc };
    } catch (error) {
        console.error("Error fetching products page:", error);
        return { products: [], lastVisible: null };
    }
}

export async function getUniqueBrands(): Promise<string[]> {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        return collapseBrandDisplays(
            snapshot.docs
                .filter((docSnap) => docSnap.data().archived !== true)
                .map((docSnap) => {
                    const data = docSnap.data();
                    return { brand: data.brand, brandKey: data.brandKey };
                })
        );
    } catch (error) {
        console.error("Error fetching unique brands:", error);
        return [];
    }
}

export async function getUniqueCategories(): Promise<string[]> {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        const categories = new Set<string>();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.archived !== true && data.category && typeof data.category === 'string') {
                categories.add(data.category);
            }
        });
        return Array.from(categories).sort();
    } catch (error) {
        console.error("Error fetching unique categories:", error);
        return [];
    }
}

export async function getProductById(id: string): Promise<Product | undefined> {
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().archived !== true) {
            return productFromSnapshot(docSnap);
        } else {
            return undefined;
        }
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        return undefined;
    }
}

export async function getRelatedProducts(category: string, currentId: string): Promise<Product[]> {
    try {
        const complementaryCategories: Record<string, string> = {
            "Seeds": "Fertilizers",
            "Fertilizers": "Seeds",
            "Tools": "Crop Protection",
            "Crop Protection": "Tools",
            "Animal Feeds": "Tools",
        };

        const targetComplement = complementaryCategories[category];

        const qDirect = query(
            collection(db, "products"),
            where("category", "==", category),
            limit(4)
        );
        const directSnapshot = await getDocs(qDirect);
        const directProducts = directSnapshot.docs
            .filter(isActiveProduct)
            .map(productFromSnapshot)
            .filter(p => p.id !== currentId)
            .slice(0, targetComplement ? 2 : 4);

        let crossSellProducts: Product[] = [];
        if (targetComplement) {
            const qCross = query(
                collection(db, "products"),
                where("category", "==", targetComplement),
                limit(2)
            );
            const crossSnapshot = await getDocs(qCross);
            crossSellProducts = crossSnapshot.docs.filter(isActiveProduct).map(productFromSnapshot);
        }

        return [...directProducts, ...crossSellProducts];
    } catch (error) {
        console.error("Error fetching related products:", error);
        return [];
    }
}

export async function getFeaturedProducts(limitCount: number = 6): Promise<Product[]> {
    try {
        const q = query(
            collection(db, "products"),
            where("featured", "==", true),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.filter(isActiveProduct).map(productFromSnapshot);
    } catch (error) {
        console.error("Error fetching featured products:", error);
        return [];
    }
}


