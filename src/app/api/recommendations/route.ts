import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { KENYAN_COUNTIES } from '@/lib/delivery';
import { checkRateLimit, getClientAddress } from '@/lib/rate-limit';

export async function GET(request: Request) {
    const rate = checkRateLimit(`regional-recommendations:${getClientAddress(request)}`, { limit: 30, windowMs: 60_000 });
    if (!rate.allowed) return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    const county = new URL(request.url).searchParams.get('county')?.trim() || '';
    if (!KENYAN_COUNTIES.includes(county)) return NextResponse.json({ success: false, message: 'Unknown county' }, { status: 400 });

    const snapshot = await adminDb.collection('orders').where('paymentStatus', '==', 'Paid').limit(1000).get();
    const scores: Record<string, number> = {};
    let matchingOrders = 0;
    for (const doc of snapshot.docs) {
        const order = doc.data();
        if (String(order.shippingAddress?.county || '') !== county) continue;
        matchingOrders += 1;
        for (const item of Array.isArray(order.items) ? order.items : []) {
            const id = String(item.id || '');
            if (id) scores[id] = (scores[id] || 0) + Number(item.quantity || 0);
        }
    }
    return NextResponse.json({ success: true, county, matchingOrders, scores, sampleSize: snapshot.size });
}
