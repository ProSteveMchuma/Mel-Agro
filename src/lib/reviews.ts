import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore';

export interface Review {
    id: string;
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    verifiedPurchase?: boolean;
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
            timestamp: doc.data().createdAt?.toMillis() || 0
        })) as (Review & { timestamp: number })[];

        return reviews.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return [];
    }
}

async function hasUserAlreadyReviewed(productId: string, userId: string): Promise<boolean> {
    const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('userId', '==', userId),
        limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

async function userHasPurchased(productId: string, userId: string): Promise<boolean> {
    const q = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        where('paymentStatus', '==', 'Paid')
    );
    const snap = await getDocs(q);
    for (const doc of snap.docs) {
        const items = (doc.data().items || []) as Array<{ id: string | number }>;
        if (items.some(i => String(i.id) === String(productId))) return true;
    }
    return false;
}

export async function addReview(review: Omit<Review, 'id' | 'date' | 'status'>): Promise<{ ok: boolean; error?: string; verifiedPurchase?: boolean }> {
    if (!review.userId) {
        return { ok: false, error: 'You must be signed in to leave a review.' };
    }
    if (!review.productId) {
        return { ok: false, error: 'Product ID missing.' };
    }
    if (!review.rating || review.rating < 1 || review.rating > 5) {
        return { ok: false, error: 'Rating must be between 1 and 5.' };
    }
    if (!review.comment || review.comment.trim().length < 5) {
        return { ok: false, error: 'Please write at least a few words.' };
    }
    if (review.comment.length > 2000) {
        return { ok: false, error: 'Review is too long (max 2000 characters).' };
    }

    try {
        if (await hasUserAlreadyReviewed(review.productId, review.userId)) {
            return { ok: false, error: 'You have already reviewed this product.' };
        }

        const verifiedPurchase = await userHasPurchased(review.productId, review.userId);

        await addDoc(collection(db, 'reviews'), {
            ...review,
            comment: review.comment.trim(),
            status: verifiedPurchase ? 'approved' : 'pending',
            verifiedPurchase,
            createdAt: Timestamp.now(),
        });

        return { ok: true, verifiedPurchase };
    } catch (error: any) {
        console.error("Error adding review:", error);
        return { ok: false, error: error?.message || 'Failed to submit review.' };
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
