import { db } from './firebase';
import { Product } from '@/types';
export type { Product };
import { collection, getDocs, doc, getDoc, query, where, limit, orderBy, startAfter, QueryConstraint } from 'firebase/firestore';

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

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Product));
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
        const constraints: QueryConstraint[] = [];

        if (category && category !== 'All') {
            constraints.push(where("category", "==", category));
        }

        if (brands && brands.length > 0) {
            constraints.push(where("brand", "in", brands));
        }

        // Sorting Logic - Only add if explicitly requested to avoid index requirements for simple filters
        if (sortBy === 'price-low') {
            constraints.push(orderBy("price", "asc"));
        } else if (sortBy === 'price-high') {
            constraints.push(orderBy("price", "desc"));
        } else if (sortBy === 'newest' && !category && (!brands || brands.length === 0)) {
            // Only force newest if no other filters are present to avoid index issues
            // Unless the user explicitly selected 'newest'? 
            // For now, let's be more lenient to ensure products actually show up.
            constraints.push(orderBy("createdAt", "desc"));
        } else if (sortBy !== 'newest' && sortBy !== 'default') {
            constraints.push(orderBy("name", "asc"));
        }

        constraints.push(limit(pageSize));

        if (lastVisible) {
            constraints.push(startAfter(lastVisible));
        }

        const q = query(collection(db, "products"), ...constraints);
        const querySnapshot = await getDocs(q);
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

        const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Product));

        return { products, lastVisible: lastDoc };
    } catch (error) {
        console.error("Error fetching products page:", error);
        return { products: [], lastVisible: null };
    }
}

export async function getUniqueBrands(): Promise<string[]> {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        const brands = new Set<string>();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.brand && typeof data.brand === 'string') {
                brands.add(data.brand);
            }
        });
        return Array.from(brands).sort();
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
            if (data.category && typeof data.category === 'string') {
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

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as Product;
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
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
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
            crossSellProducts = crossSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Product));
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
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Product));
    } catch (error) {
        console.error("Error fetching featured products:", error);
        return [];
    }
}
