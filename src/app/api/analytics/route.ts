import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth-server';
import { checkRateLimit, getClientAddress } from '@/lib/rate-limit';

type AnalyticsEvent = 'search' | 'view' | 'add_to_cart' | 'visit' | 'purchase' | 'recommendation_impression' | 'recommendation_click' | 'recommendation_add_to_cart';
const ANALYTICS_SCHEMA_VERSION = 1;

function cleanSearchTerm(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const term = value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
    if (term.length < 2) return null;
    // Do not retain likely phone numbers or email addresses in demand analytics.
    if (/\b[\w.+-]+@[\w.-]+\.\w{2,}\b/.test(term) || /(?:\+?254|0)\d{9}/.test(term.replace(/[\s-]/g, ''))) return null;
    return term;
}

function safeProductId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    return id && id.length <= 128 && !id.includes('/') ? id : null;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const max = Math.min(10, Math.max(1, Number(url.searchParams.get('limit')) || 5));
    const snapshot = await adminDb.collection('analytics_search_terms').orderBy('count', 'desc').limit(max).get();
    return NextResponse.json({
        searches: snapshot.docs.map(doc => ({
            term: String(doc.data().term || ''),
            count: Number(doc.data().count || 0),
        })).filter(item => item.term),
    });
}

export async function POST(request: Request) {
    const client = getClientAddress(request);
    const rate = checkRateLimit(`analytics:${client}`, { limit: 120, windowMs: 60_000 });
    if (!rate.allowed) {
        return NextResponse.json({ success: false, message: 'Too many analytics events' }, { status: 429 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const event = body?.event as AnalyticsEvent | undefined;
    if (!event || !['search', 'view', 'add_to_cart', 'visit', 'purchase', 'recommendation_impression', 'recommendation_click', 'recommendation_add_to_cart'].includes(event)) {
        return NextResponse.json({ success: false, message: 'Invalid analytics event' }, { status: 400 });
    }

    if (event === 'search') {
        const term = cleanSearchTerm(body?.term);
        if (!term) return NextResponse.json({ success: false, message: 'Search term was not eligible for analytics' }, { status: 400 });
        const id = createHash('sha256').update(term).digest('hex');
        await adminDb.collection('analytics_search_terms').doc(id).set({
            schemaVersion: ANALYTICS_SCHEMA_VERSION,
            term,
            count: FieldValue.increment(1),
            lastSearched: FieldValue.serverTimestamp(),
        }, { merge: true });
    } else if (event === 'view' || event === 'add_to_cart') {
        const productId = safeProductId(body?.productId);
        if (!productId) return NextResponse.json({ success: false, message: 'Invalid product ID' }, { status: 400 });
        const field = event === 'view' ? 'views' : 'addToCartCount';
        const timeField = event === 'view' ? 'lastViewed' : 'lastAdded';
        await adminDb.collection('analytics_products').doc(productId).set({
            schemaVersion: ANALYTICS_SCHEMA_VERSION,
            productId,
            [field]: FieldValue.increment(1),
            [timeField]: FieldValue.serverTimestamp(),
        }, { merge: true });
    } else if (event === 'recommendation_impression' || event === 'recommendation_click' || event === 'recommendation_add_to_cart') {
        const source = typeof body?.source === 'string' ? body.source.slice(0, 40) : 'unknown';
        const productIds = event !== 'recommendation_impression'
            ? [safeProductId(body?.productId)].filter((id): id is string => Boolean(id))
            : (Array.isArray(body?.productIds) ? body.productIds.map(safeProductId).filter((id): id is string => Boolean(id)).slice(0, 12) : []);
        if (!productIds.length) return NextResponse.json({ success: false, message: 'No valid recommendation products' }, { status: 400 });
        const field = event === 'recommendation_click' ? 'clicks' : event === 'recommendation_add_to_cart' ? 'addToCarts' : 'impressions';
        const batch = adminDb.batch();
        for (const productId of productIds) {
            const ref = adminDb.collection('analytics_recommendations').doc(`${source}_${productId}`.replace(/[^a-zA-Z0-9_-]/g, '_'));
            batch.set(ref, { schemaVersion: ANALYTICS_SCHEMA_VERSION, source, productId, [field]: FieldValue.increment(1), lastEventAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        await batch.commit();
    } else if (event === 'visit') {
        const today = new Date().toISOString().slice(0, 10);
        const visitorKey = createHash('sha256').update(`${today}:${client}:${request.headers.get('user-agent') || ''}`).digest('hex');
        const visitRef = adminDb.collection('analytics_visit_dedup').doc(visitorKey);
        const trafficRef = adminDb.collection('analytics_traffic').doc(today);
        await adminDb.runTransaction(async transaction => {
            const existing = await transaction.get(visitRef);
            transaction.set(trafficRef, {
                schemaVersion: ANALYTICS_SCHEMA_VERSION,
                date: today,
                totalVisits: FieldValue.increment(1),
                ...(existing.exists ? {} : { uniqueVisitors: FieldValue.increment(1) }),
                lastActive: FieldValue.serverTimestamp(),
            }, { merge: true });
            if (!existing.exists) transaction.set(visitRef, { date: today, createdAt: FieldValue.serverTimestamp() });
        });
    } else {
        const auth = await requireUser(request);
        if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        const orderId = safeProductId(body?.orderId);
        if (!orderId) return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 });
        const order = await adminDb.collection('orders').doc(orderId).get();
        if (!order.exists || order.data()?.userId !== auth.uid) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        if (order.data()?.paymentStatus !== 'Paid') {
            return NextResponse.json({ success: false, message: 'Only paid orders can be recorded' }, { status: 409 });
        }
        // Order ID is the document ID, making repeated success-page calls harmless.
        const purchaseRef = adminDb.collection('analytics_purchases').doc(orderId);
        await adminDb.runTransaction(async transaction => {
            const existing = await transaction.get(purchaseRef);
            if (!existing.exists) {
                transaction.create(purchaseRef, {
                    schemaVersion: ANALYTICS_SCHEMA_VERSION,
                    orderId,
                    userId: auth.uid,
                    amount: Number(order.data()?.total || 0),
                    timestamp: FieldValue.serverTimestamp(),
                });
            }
        });
    }

    return NextResponse.json({ success: true });
}
