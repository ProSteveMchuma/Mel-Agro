import { getProducts } from './products';
import { searchProducts } from './search';
import { DELIVERY_ZONES, DeliveryZone } from './delivery';

export interface BotResponse {
    text: string;
    type: 'text' | 'product' | 'options';
    data?: any;
    options?: string[];
}

const GREETINGS = ['hi', 'hello', 'habari', 'hey', 'start'];
const PRODUCT_KEYWORDS = ['buy', 'price', 'cost', 'sell', 'need', 'looking for', 'check'];
const DELIVERY_KEYWORDS = ['delivery', 'shipping', 'transport', 'location'];

export const processMessage = async (message: string, deliveryZones: DeliveryZone[] = DELIVERY_ZONES): Promise<BotResponse> => {
    const lowerMsg = message.toLowerCase();

    // 1. Greetings
    if (GREETINGS.some(g => lowerMsg.includes(g))) {
        return {
            text: "Habari! 👋 I'm Mel-Agri's guided shopping assistant. I can search the live catalog, explain delivery zones, or connect you to a person.",
            type: 'options',
            options: ['Find Products', 'Delivery Info', 'Talk to Expert']
        };
    }

    // 2. Delivery / Shipping
    if (DELIVERY_KEYWORDS.some(k => lowerMsg.includes(k))) {
        const zones = deliveryZones.length ? deliveryZones : DELIVERY_ZONES;
        const minimum = Math.min(...zones.map(zone => zone.price));
        const maximum = Math.max(...zones.map(zone => zone.price));
        const fastest = Math.min(...zones.map(zone => zone.etaMinDays));
        const slowest = Math.max(...zones.map(zone => zone.etaMaxDays));
        return {
            text: `We deliver across Kenya. Current delivery charges range from KES ${minimum.toLocaleString()} to KES ${maximum.toLocaleString()}, with estimated delivery from ${fastest === 0 ? 'same day' : `${fastest} day`} to ${slowest} business days depending on your county. Your exact charge and ETA are shown at checkout.`,
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
                const products = await getProducts({ limitCount: 100 });
                const matches = searchProducts(products, searchTerms).filter(product => Number(product.stockQuantity ?? product.stock ?? 0) > 0).slice(0, 3);
                if (matches.length) {
                    return {
                        text: `I found some ${searchTerms || 'items'} for you:`,
                        type: 'product',
                        data: matches
                    };
                }
            } catch (e) {
                console.error("Bot Search Error", e);
            }
            return {
                text: `I couldn't find a close live-catalog match for “${searchTerms}”. Try a product name, brand, or category, or ask our team for help.`,
                type: 'options',
                options: ['Browse Shop', 'WhatsApp Expert'],
            };
        }
    }

    // 4. Fallback / Expert Handover
    return {
        text: "I'm still learning! 🎓 Would you like to browse our shop or chat with a human expert on WhatsApp?",
        type: 'options',
        options: ['Browse Shop', 'WhatsApp Expert']
    };
};
