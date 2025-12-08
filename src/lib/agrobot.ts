import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface BotResponse {
    text: string;
    type: 'text' | 'product' | 'options';
    data?: any;
    options?: string[];
}

const GREETINGS = ['hi', 'hello', 'habari', 'hey', 'start'];
const HELP_KEYWORDS = ['help', 'support', 'assist'];
const PRODUCT_KEYWORDS = ['buy', 'price', 'cost', 'sell', 'need', 'looking for', 'check'];
const DELIVERY_KEYWORDS = ['delivery', 'shipping', 'transport', 'location'];

export const processMessage = async (message: string): Promise<BotResponse> => {
    const lowerMsg = message.toLowerCase();

    // 1. Greetings
    if (GREETINGS.some(g => lowerMsg.includes(g))) {
        return {
            text: "Habari! 👋 Welcome to MelAgro. I'm your AgroBot assistant. How can I help you today?",
            type: 'options',
            options: ['Find Products', 'Delivery Info', 'Talk to Expert']
        };
    }

    // 2. Delivery / Shipping
    if (DELIVERY_KEYWORDS.some(k => lowerMsg.includes(k))) {
        return {
            text: "We deliver countrywide! 🚚\n\n- Nairobi & Environs: Same day delivery.\n- Upcountry: 24-48 hours via Wells Fargo or G4S.\n- Shipping cost depends on your location (approx KES 200 - 500).",
            type: 'text'
        };
    }

    // 3. Product Search (Simple Keyword Match)
    if (PRODUCT_KEYWORDS.some(k => lowerMsg.includes(k)) || lowerMsg.length > 3) {
        // Extract potential product name (very naive approach)
        const commonWords = [...PRODUCT_KEYWORDS, 'i', 'want', 'to', 'can', 'you', 'please', 'me', 'have', 'do'];
        const searchTerms = lowerMsg.split(' ').filter(w => !commonWords.includes(w)).join(' ');

        if (searchTerms.length > 2) {
            try {
                // Try to find products
                const productsRef = collection(db, 'products');
                // Note: Firestore doesn't do native full-text search. 
                // We'll use a simple approach: if we had a proper search engine (Algolia/Typesense) we'd use that.
                // For now, we mimic "smart" behavior by checking category or name startsWith (limiting to avoid massive reads)

                // Let's just return a generic "I can help you find X" and maybe some featured items if we can't search easily
                // Or try to match categories

                let q = query(productsRef, where('category', '>=', searchTerms.charAt(0).toUpperCase() + searchTerms.slice(1)), limit(3));

                // Fallback: Just return recent products to mimic "suggestions"
                if (lowerMsg.includes('fertilizer')) {
                    q = query(productsRef, where('category', '==', 'Fertilizers'), limit(3));
                } else if (lowerMsg.includes('seed')) {
                    q = query(productsRef, where('category', '==', 'Seeds'), limit(3));
                } else {
                    q = query(productsRef, limit(3));
                }

                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    return {
                        text: `I found some ${searchTerms || 'items'} for you:`,
                        type: 'product',
                        data: products
                    };
                }
            } catch (e) {
                console.error("Bot Search Error", e);
            }
        }
    }

    // 4. Fallback / Expert Handover
    return {
        text: "I'm still learning! 🎓 Would you like to browse our shop or chat with a human expert on WhatsApp?",
        type: 'options',
        options: ['Browse Shop', 'WhatsApp Expert']
    };
};
