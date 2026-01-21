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

export async function getProductsPage(pageSize: number = 12, lastVisible?: any, category?: string): Promise<{ products: Product[], lastVisible: any }> {
    try {
        const constraints: QueryConstraint[] = [];

        if (category && category !== 'All') {
            constraints.push(where("category", "==", category));
        }

        constraints.push(orderBy("name"));
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
        // 1. Define Complementary Categories (Smart Logic)
        const complementaryCategories: Record<string, string> = {
            "Seeds": "Fertilizers",
            "Fertilizers": "Seeds",
            "Tools": "Crop Protection",
            "Crop Protection": "Tools",
            "Animal Feeds": "Tools",
            // Default fallbacks handled by main logic
        };

        const targetComplement = complementaryCategories[category];

        // 2. Fetch Direct Alternatives (Same Category) - Limit 2-3
        const qDirect = query(
            collection(db, "products"),
            where("category", "==", category),
            limit(4) // Fetch a few more to filter current
        );
        const directSnapshot = await getDocs(qDirect);
        const directProducts = directSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
            .filter(p => p.id !== currentId)
            .slice(0, targetComplement ? 2 : 4); // If cross-sell available, take 2, else take all 4

        // 3. Fetch Cross-Sells (Complementary Category) - Limit 2
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

        // 4. Combine Results
        return [...directProducts, ...crossSellProducts];

    } catch (error) {
        console.error("Error fetching related products:", error);
        return [];
    }
}
