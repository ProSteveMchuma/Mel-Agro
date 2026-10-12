import { NextResponse } from 'next/server';
import { suggestCatalogue } from '@/lib/catalogue-search';
import { getAllProductsServerCached } from '@/lib/products-server';
import { enforceRateLimit } from '@/lib/request-guard';

export async function GET(request: Request) {
    const limited = enforceRateLimit(request, 'catalogue-search', 40, 60_000);
    if (limited) return limited;

    const url = new URL(request.url);
    const q = String(url.searchParams.get('q') || '').trim();
    const limit = Number(url.searchParams.get('limit') || 5);
    if (q.length < 2) {
        return NextResponse.json({ success: true, suggestions: [], intents: [], brands: [], corrections: [] });
    }
    if (q.length > 80) {
        return NextResponse.json({ success: false, message: 'Search is too long' }, { status: 400 });
    }

    const products = await getAllProductsServerCached(500);
    const result = suggestCatalogue(products, q, Number.isFinite(limit) ? limit : 5);
    return NextResponse.json({ success: true, ...result }, {
        headers: { 'Cache-Control': 'public, max-age=30' },
    });
}
