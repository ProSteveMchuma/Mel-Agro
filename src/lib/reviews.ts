import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

export interface Review {
    id: string;
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
}

export async function getProductReviews(productId: string): Promise<Review[]> {
    try {
        const q = query(
            collection(db, 'reviews'),
            where('productId', '==', productId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert timestamp to string if needed, or keep as is. 
            // For simplicity in UI, we often store a formatted date string or convert here.
            date: doc.data().createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString()
        })) as Review[];
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return [];
    }
}

export async function addReview(review: Omit<Review, 'id' | 'date'>) {
    try {
        await addDoc(collection(db, 'reviews'), {
            ...review,
            createdAt: Timestamp.now()
        });
        return true;
    } catch (error) {
        console.error("Error adding review:", error);
        return false;
    }
}
