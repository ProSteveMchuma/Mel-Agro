import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import {
    bottleneckInsight,
    demandInsight,
    previousUtcDateKey,
    summariseFunnels,
    trafficDelta,
    utcDateKey,
    visitorToPaidRate,
    type FunnelDoc,
} from '@/lib/storefront-analytics';

async function settled<T>(promise: Promise<T>): Promise<T | null> {
    try {
        return await promise;
    } catch (error) {
        console.warn('Analytics overview query failed:', error);
        return null;
    }
}

export async function GET(request: Request) {
    const actor = await requirePermission(request, 'analytics.view');
    if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

    try {
        const today = utcDateKey();
        const yesterday = previousUtcDateKey();
        const dayStart = `${today}T00:00:00.000Z`;

        const [todayTraffic, yesterdayTraffic, searchesSnap, productsSnap, funnelsSnap, todayOrdersSnap] = await Promise.all([
            settled(adminDb.collection('analytics_traffic').doc(today).get()),
            settled(adminDb.collection('analytics_traffic').doc(yesterday).get()),
            settled(adminDb.collection('analytics_search_terms').orderBy('count', 'desc').limit(5).get()),
            settled(adminDb.collection('analytics_products').orderBy('views', 'desc').limit(5).get()),
            settled(adminDb.collection('analytics_funnels').limit(1500).get()),
            settled(adminDb.collection('orders').where('date', '>=', dayStart).limit(500).get()),
        ]);

        const searches = (searchesSnap?.docs || []).map(doc => ({
            term: String(doc.data().term || ''),
            count: Number(doc.data().count || 0),
        })).filter(item => item.term);

        const products = (productsSnap?.docs || []).map(doc => {
            const data = doc.data();
            return {
                productId: String(data.productId || doc.id),
                views: Number(data.views || 0),
                addToCartCount: Number(data.addToCartCount || 0),
                purchases: Number(data.purchases || 0),
            };
        });

        const funnel = summariseFunnels((funnelsSnap?.docs || []).map(doc => doc.data() as FunnelDoc));
        const traffic = trafficDelta(todayTraffic?.data(), yesterdayTraffic?.data());
        const paidToday = (todayOrdersSnap?.docs || []).filter(doc => doc.data()?.paymentStatus === 'Paid').length;
        const demand = demandInsight(searches[0] || null);
        const bottleneck = bottleneckInsight(funnel);

        return NextResponse.json({
            success: true,
            generatedAt: new Date().toISOString(),
            traffic: {
                today: { date: today, totalVisits: traffic.todayVisits, uniqueVisitors: traffic.todayUnique },
                yesterday: { date: yesterday, totalVisits: traffic.yesterdayVisits, uniqueVisitors: traffic.yesterdayUnique },
                visitDeltaPct: traffic.visitDeltaPct,
                uniqueDeltaPct: traffic.uniqueDeltaPct,
            },
            searches,
            products,
            funnel,
            demand,
            bottleneck,
            paidToday,
            visitorToPaidPct: visitorToPaidRate(paidToday, traffic.todayUnique),
            definitions: {
                searches: 'Lifetime search counts from /api/analytics',
                funnel: 'Signed-in checkout sessions in analytics_funnels',
                traffic: 'UTC calendar-day visits from analytics_traffic',
                paidToday: 'Orders with date today and paymentStatus Paid',
            },
        });
    } catch (error) {
        console.error('Admin analytics overview failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load live analytics.' }, { status: 500 });
    }
}
