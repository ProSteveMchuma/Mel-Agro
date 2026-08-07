import type { Product } from '@/types';

export type SeoQualityResult = {
    productId: string;
    name: string;
    score: number;
    grade: 'strong' | 'improve' | 'critical';
    issues: string[];
};

export function assessProductSeo(product: Product): SeoQualityResult {
    const checks: Array<{ points: number; pass: boolean; issue: string }> = [
        { points: 10, pass: product.name.trim().length >= 3 && product.name.trim().length <= 90, issue: 'Use a specific product name between 3 and 90 characters.' },
        { points: 20, pass: String(product.description || '').trim().length >= 80, issue: 'Add at least 80 characters of original, useful description.' },
        { points: 10, pass: Boolean(product.category?.trim()), issue: 'Assign a catalogue category.' },
        { points: 10, pass: Boolean(product.brand?.trim()), issue: 'Add the verified manufacturer or brand.' },
        { points: 10, pass: Boolean(product.productCode?.trim()), issue: 'Add the genuine SKU or product code.' },
        { points: 15, pass: Boolean(product.image) && !/placehold|placeholder|no[+-]?image/i.test(product.image), issue: 'Replace the placeholder with a real product image.' },
        { points: 10, pass: Number(product.price) > 0, issue: 'Set a valid customer-facing price.' },
        { points: 5, pass: Array.isArray(product.features) && product.features.filter(Boolean).length >= 2, issue: 'Add at least two factual product features.' },
        { points: 5, pass: Boolean(product.howToUse?.trim()) || !/crop protection|veterinary|animal health|public health/i.test(product.category), issue: 'Add label-grounded usage and safety information.' },
        { points: 5, pass: Boolean(product.images?.filter(Boolean).length) || Boolean(product.image), issue: 'Add a product image.' },
    ];
    const score = checks.reduce((total, check) => total + (check.pass ? check.points : 0), 0);
    const issues = checks.filter(check => !check.pass).map(check => check.issue);
    return { productId: String(product.id), name: product.name, score, grade: score >= 85 ? 'strong' : score >= 60 ? 'improve' : 'critical', issues };
}

export function catalogueSeoSummary(products: Product[]) {
    const results = products.map(assessProductSeo).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    return {
        averageScore: results.length ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length) : 0,
        strong: results.filter(item => item.grade === 'strong').length,
        improve: results.filter(item => item.grade === 'improve').length,
        critical: results.filter(item => item.grade === 'critical').length,
        products: results,
    };
}
