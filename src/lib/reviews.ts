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
    status: 'pending' | 'approved' | 'rejected';
}

export async function getProductReviews(productId: string): Promise<Review[]> {
    try {
        const q = query(
            collection(db, 'reviews'),
            where('productId', '==', productId),
            where('status', '==', 'approved')
        );

        const snapshot = await getDocs(q);
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString(),
            // Helper for sorting
            timestamp: doc.data().createdAt?.toMillis() || 0
        })) as (Review & { timestamp: number })[];

        // Client-side sort
        return reviews.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return [];
    }
}

export async function addReview(review: Omit<Review, 'id' | 'date' | 'status'>) {
    try {
        await addDoc(collection(db, 'reviews'), {
            ...review,
            status: 'pending',
            createdAt: Timestamp.now()
        });
        return true;
    } catch (error) {
        console.error("Error adding review:", error);
        return false;
    }
}

export async function getAllReviewsForAdmin(): Promise<Review[]> {
    try {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString()
        })) as Review[];
    } catch (error) {
        console.error("Error fetching all reviews:", error);
        return [];
    }
}

export async function updateReviewStatus(reviewId: string, status: 'approved' | 'rejected') {
    const { doc, updateDoc } = await import('firebase/firestore');
    try {
        const reviewRef = doc(db, 'reviews', reviewId);
        await updateDoc(reviewRef, { status });
        return true;
    } catch (error) {
        console.error("Error updating review status:", error);
        return false;
    }
}
