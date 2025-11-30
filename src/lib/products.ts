import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, limit } from 'firebase/firestore';

export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
    rating: number;
    reviews: number;
    inStock: boolean;
    stock?: number;
    features?: string[];
}

export async function getProducts(): Promise<Product[]> {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Product));
    } catch (error) {
        console.error("Error fetching products:", error);
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
        const q = query(
            collection(db, "products"),
            where("category", "==", category),
            limit(5)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Product))
            .filter(p => p.id !== currentId)
            .slice(0, 4);
    } catch (error) {
        console.error("Error fetching related products:", error);
        return [];
    }
}
