import { didYouMean, searchProducts } from './search.ts';
import type { Product, ProductVariant } from '../types/index.ts';

const INTENT_MAP: Record<string, string[]> = {
    'Crop Protection': ['kill', 'pest', 'insect', 'weed', 'disease', 'fungus', 'spray', 'herbicide', 'insecticide', 'fungicide', 'protection', 'poison'],
    'Animal Feeds': ['cow', 'cattle', 'chicken', 'poultry', 'pig', 'dairy', 'animal', 'feed', 'livestock', 'dog', 'cat', 'nutrition'],
    'Veterinary Products': ['vet', 'medicine', 'vaccine', 'treatment', 'sick', 'wound', 'injection', 'animal health'],
    Seeds: ['seed', 'maize', 'bean', 'grow', 'yield', 'hybrid', 'planting', 'crop'],
    Fertilizers: ['fertilizer', 'soil', 'nutrient', 'npk', 'manure', 'dap', 'can', 'top dress', 'booster'],
    'Farm Tools': ['tool', 'equipment', 'jembes', 'panga', 'shovels', 'sprayer', 'pump'],
};

export function detectCatalogueIntents(searchTerm: string): string[] {
    const lowTerm = searchTerm.toLowerCase();
    return Object.entries(INTENT_MAP)
        .filter(([, keywords]) => keywords.some((keyword) => lowTerm.includes(keyword)))
        .map(([category]) => category);
}

export function slimCatalogueProduct(product: Product) {
    const variants = (product.variants || []).map((variant: ProductVariant) => ({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        stockQuantity: variant.stockQuantity,
        image: variant.image,
        sku: variant.sku,
    }));
    return {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        category: product.category || '',
        brand: product.brand || '',
        brandKey: product.brandKey || '',
        image: product.image || product.images?.[0] || '',
        images: (product.images || []).slice(0, 1),
        inStock: product.inStock,
        stockQuantity: Number(product.stockQuantity ?? product.stock ?? 0),
        lowStockThreshold: product.lowStockThreshold,
        rating: product.rating,
        reviews: product.reviews,
        productCode: product.productCode,
        variants,
    };
}

export function suggestCatalogue(products: Product[], query: string, limit = 5) {
    const trimmed = query.trim();
    const cap = Math.min(48, Math.max(1, limit));
    if (trimmed.length < 2) {
        return { suggestions: [], intents: [] as string[], brands: [] as string[], corrections: [] as Array<{ correctedTerm: string; name: string }> };
    }

    const intents = detectCatalogueIntents(trimmed);
    const queryLower = trimmed.toLowerCase();
    const brands = [...new Set(
        products
            .filter((product) => product.brand && product.brand.toLowerCase().includes(queryLower))
            .map((product) => String(product.brand)),
    )].slice(0, 3);

    let matches = searchProducts(products, trimmed);
    if (matches.length < 3 && intents.length > 0) {
        const extra = products.filter((product) => intents.includes(product.category) && !matches.some((match) => match.id === product.id));
        matches = [...matches, ...extra];
    }
    const suggestions = matches.slice(0, cap).map(slimCatalogueProduct);
    const corrections = suggestions.length === 0
        ? didYouMean(products, trimmed, 3).map((item) => ({ correctedTerm: item.correctedTerm, name: item.sample.name }))
        : [];

    return { suggestions, intents, brands, corrections };
}
