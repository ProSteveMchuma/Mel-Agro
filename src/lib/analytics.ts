import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

export const AnalyticsService = {
    /**
     * Log a search query to track demand.
     * Updates a counter for the term and adds a raw event.
     */
    logSearch: async (term: string) => {
        if (!term || term.trim().length < 2) return;
        const cleanTerm = term.trim().toLowerCase();

        try {
            // 1. Update Aggregate Count
            const termRef = doc(db, 'analytics_search_terms', cleanTerm);
            await setDoc(termRef, {
                term: cleanTerm,
                count: increment(1),
                lastSearched: serverTimestamp()
            }, { merge: true });

            // 2. Log Raw Event (Optional, good for timeline)
            // await addDoc(collection(db, 'analytics_events'), {
            //     type: 'search',
            //     term: cleanTerm,
            //     timestamp: serverTimestamp()
            // });
        } catch (error) {
            console.error("Failed to log search:", error);
        }
    },

    /**
     * Log a product view.
     * Updates the product's view count in 'analytics_products'.
     */
    logView: async (productId: string) => {
        if (!productId) return;

        try {
            const statsRef = doc(db, 'analytics_products', productId);
            await setDoc(statsRef, {
                productId,
                views: increment(1),
                lastViewed: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Failed to log view:", error);
        }
    },

    /**
     * Log when an item is added to cart.
     */
    logAddToCart: async (productId: string) => {
        if (!productId) return;

        try {
            const statsRef = doc(db, 'analytics_products', productId);
            await setDoc(statsRef, {
                productId,
                addsToCart: increment(1),
                lastAdded: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Failed to log add to cart:", error);
        }
    }
};
