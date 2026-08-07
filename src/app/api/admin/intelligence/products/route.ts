import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { buildInventoryRecommendations, findSearchDemandGaps } from '@/lib/product-intelligence';
import type { Order, Product } from '@/types';
import { catalogueSeoSummary } from '@/lib/seo-quality';

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    const [ordersSnap, productsSnap, searchesSnap, performanceSnap] = await Promise.all([
        adminDb.collection('orders').orderBy('date', 'desc').limit(1500).get(),
        adminDb.collection('products').limit(1000).get(),
        adminDb.collection('analytics_search_terms').orderBy('count', 'desc').limit(100).get(),
        adminDb.collection('analytics_products').limit(1000).get(),
    ]);
    const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    const searches = searchesSnap.docs.map(doc => ({ term: String(doc.data().term || ''), count: Number(doc.data().count || 0) }));
    const performance = performanceSnap.docs.map(doc => {
        const data = doc.data();
        const views = Number(data.views || 0);
        const carts = Number(data.addToCartCount || 0);
        return { productId: String(data.productId || doc.id), views, carts, cartRate: views > 0 ? (carts / views) * 100 : 0 };
    }).sort((a, b) => b.views - a.views);
    return NextResponse.json({
        success: true,
        generatedAt: new Date().toISOString(),
        sourceWindow: { orders: orders.length, products: products.length, searches: searches.length },
        demandGaps: findSearchDemandGaps(searches, products).slice(0, 30),
        inventory: buildInventoryRecommendations(orders, products).slice(0, 100).map(item => ({ ...item, daysOfCover: Number.isFinite(item.daysOfCover) ? item.daysOfCover : null })),
        performance: performance.slice(0, 50),
        seo: catalogueSeoSummary(products),
    });
}
