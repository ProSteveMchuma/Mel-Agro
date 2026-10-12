import { NextResponse } from 'next/server';
import { slimCatalogueProduct } from '@/lib/catalogue-search';
import { adminDb } from '@/lib/firebase-admin';
import { brandKeyFrom } from '@/lib/catalog-normalize';
import { enforceRateLimit } from '@/lib/request-guard';
import type { Product } from '@/types';

export async function GET(request: Request) {
    const limited = enforceRateLimit(request, 'catalogue-lookup', 60, 60_000);
    if (limited) return limited;

    const ids = [...new Set(
        String(new URL(request.url).searchParams.get('ids') || '')
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0 && id.length <= 128),
    )].slice(0, 24);

    if (ids.length === 0) {
        return NextResponse.json({ success: true, products: [] });
    }

    const docs = await adminDb.getAll(...ids.map((id) => adminDb.collection('products').doc(id)));
    const products = docs
        .filter((doc) => doc.exists && doc.data()?.archived !== true)
        .map((doc) => {
            const data = doc.data() || {};
            const brand = String(data.brand || '');
            return slimCatalogueProduct({
                id: doc.id,
                ...data,
                brandKey: data.brandKey || brandKeyFrom(brand) || undefined,
            } as Product);
        });

    return NextResponse.json({ success: true, products }, {
        headers: { 'Cache-Control': 'private, max-age=15' },
    });
}
