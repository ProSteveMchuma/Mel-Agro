import { auth } from './firebase';

async function sendEvent(payload: Record<string, unknown>) {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        keepalive: true,
    });
    if (!response.ok && response.status !== 400) throw new Error(`Analytics request failed (${response.status})`);
}

export const AnalyticsService = {
    /**
     * Log a search query to track demand.
     * Updates a counter for the term and adds a raw event.
     */
    logSearch: async (term: string) => {
        if (!term || term.trim().length < 2) return;
        const cleanTerm = term.trim().toLowerCase();

        try {
            await sendEvent({ event: 'search', term: cleanTerm });
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
            await sendEvent({ event: 'view', productId });
        } catch (error) {
            console.error("Failed to log view:", error);
        }
    },

    /**
     * Track a general website visit.
     * Records daily totals and unique visitor counts.
     */
    trackVisit: async (isUnique: boolean = false) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            await sendEvent({ event: 'visit', clientUniqueHint: isUnique, date: today });
        } catch (error) {
            console.error("Failed to track visit:", error);
        }
    },

    /**
     * Log an "Add to Cart" event.
     */
    logAddToCart: async (productId: string) => {
        if (!productId) return;
        try {
            await sendEvent({ event: 'add_to_cart', productId });
        } catch (error) {
            console.error("Failed to log add to cart:", error);
        }
    },

    /**
     * Log a successful purchase.
     */
    logPurchase: async (orderId: string, amount: number) => {
        if (!orderId) return;
        try {
            await sendEvent({ event: 'purchase', orderId, amount });
        } catch (error) {
            console.error("Failed to log purchase:", error);
        }
    },

    /**
     * Fetch the top N most-searched terms (descending by count).
     * Used to drive the "popular searches" UI in SmartSearch.
     */
    getPopularSearches: async (max = 5): Promise<Array<{ term: string; count: number }>> => {
        try {
            const response = await fetch(`/api/analytics?limit=${Math.min(10, Math.max(1, max))}`);
            if (!response.ok) throw new Error(`Popular searches request failed (${response.status})`);
            const data = await response.json();
            return Array.isArray(data.searches) ? data.searches : [];
        } catch (error) {
            console.error("Failed to fetch popular searches:", error);
            return [];
        }
    },
};
