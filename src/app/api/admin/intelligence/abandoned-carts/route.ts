import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import { FieldValue } from 'firebase-admin/firestore';
import { scoreCartRecovery } from '@/lib/recovery-intelligence';

function isoDate(value: unknown): string | null {
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }
    return null;
}

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });

    const snapshot = await adminDb.collection('carts').where('status', '==', 'active').limit(250).get();
    const cutoff = Date.now() - 30 * 60 * 1000;
    const cartDocs = snapshot.docs.filter(doc => {
        const updatedAt = isoDate(doc.data().updatedAt);
        return updatedAt && new Date(updatedAt).getTime() < cutoff && Array.isArray(doc.data().items) && doc.data().items.length > 0;
    });
    const [funnels, users, orderSnapshot] = await Promise.all([
        cartDocs.length ? adminDb.getAll(...cartDocs.map(doc => adminDb.collection('analytics_funnels').doc(String(doc.data().userId || doc.id)))) : [],
        cartDocs.length ? adminDb.getAll(...cartDocs.map(doc => adminDb.collection('users').doc(String(doc.data().userId || doc.id)))) : [],
        adminDb.collection('orders').orderBy('date', 'desc').limit(1500).get(),
    ]);
    const carts = cartDocs.flatMap((doc, index) => {
        const data = doc.data();
        const updatedAt = isoDate(data.updatedAt);
        const items = Array.isArray(data.items) ? data.items : [];
        if (!updatedAt) return [];
        const userData = users[index]?.data() || {};
        const funnelData = funnels[index]?.data() || {};
        const lastContactAt = isoDate(data.lastRecoveryContactAt);
        const cartTime = new Date(updatedAt).getTime();
        const relatedOrders = orderSnapshot.docs.map(order => order.data()).filter(order => String(order.userId || '') === String(data.userId || doc.id));
        const purchasedAfterCart = relatedOrders.some(order => order.paymentStatus === 'Paid' && new Date(order.date || order.createdAt || '').getTime() > cartTime);
        const paymentAttempted = relatedOrders.some(order => ['Failed', 'Unpaid', 'Pending Verification'].includes(String(order.paymentStatus || '')) && new Date(order.date || order.createdAt || '').getTime() >= cartTime - 60 * 60 * 1000);
        const recovery = scoreCartRecovery({
            total: Number(data.total || 0), idleMinutes: (Date.now() - cartTime) / 60_000,
            checkoutStep: String(funnelData.lastStep || ''), paymentAttempted,
            hasPhone: Boolean(data.userPhone || userData.phone), consent: userData.cartRecoveryConsent === true,
            contactCount: Number(data.recoveryContactCount || 0),
            hoursSinceLastContact: lastContactAt ? (Date.now() - new Date(lastContactAt).getTime()) / 3_600_000 : null,
            purchasedAfterCart,
        });
        return [{
            id: doc.id,
            userId: String(data.userId || doc.id),
            userName: String(data.userName || 'Customer'),
            userEmail: String(data.userEmail || ''),
            userPhone: String(data.userPhone || userData.phone || ''),
            items: items.map((item: Record<string, unknown>) => ({ id: String(item.id || ''), name: String(item.name || 'Product'), quantity: Number(item.quantity || 1), price: Number(item.price || 0) })),
            total: Number(data.total || 0),
            updatedAt,
            status: 'active',
            recovery,
            recoveryContactCount: Number(data.recoveryContactCount || 0),
            lastRecoveryContactAt: lastContactAt,
        }];
    });
    carts.sort((a, b) => b.recovery.score - a.recovery.score || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), carts: carts.slice(0, 100) });
}

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const cartId = typeof body.cartId === 'string' && !body.cartId.includes('/') ? body.cartId : '';
    if (!cartId || !['contacted', 'outcome'].includes(body.action)) return NextResponse.json({ success: false, message: 'Invalid recovery update' }, { status: 400 });
    const cartRef = adminDb.collection('carts').doc(cartId);
    const cart = await cartRef.get();
    if (!cart.exists) return NextResponse.json({ success: false, message: 'Cart not found' }, { status: 404 });
    const data = cart.data() || {};
    const user = await adminDb.collection('users').doc(String(data.userId || cartId)).get();
    if (body.action === 'contacted') {
        const lastContact = isoDate(data.lastRecoveryContactAt);
        if (user.data()?.cartRecoveryConsent !== true) return NextResponse.json({ success: false, message: 'Customer has not consented to cart recovery messages' }, { status: 409 });
        if (Number(data.recoveryContactCount || 0) >= 3) return NextResponse.json({ success: false, message: 'Maximum contact attempts reached' }, { status: 409 });
        if (lastContact && Date.now() - new Date(lastContact).getTime() < 72 * 3_600_000) return NextResponse.json({ success: false, message: '72-hour contact cooldown is still active' }, { status: 409 });
        await cartRef.set({ lastRecoveryContactAt: FieldValue.serverTimestamp(), recoveryContactCount: FieldValue.increment(1), recoveryHistory: FieldValue.arrayUnion({ action: 'contacted', channel: 'whatsapp', by: auth.email || auth.uid, at: new Date().toISOString() }) }, { merge: true });
    } else {
        const outcome = typeof body.outcome === 'string' ? body.outcome.slice(0, 200) : '';
        if (!outcome) return NextResponse.json({ success: false, message: 'Outcome is required' }, { status: 400 });
        await cartRef.set({ recoveryOutcome: outcome, recoveryOutcomeAt: FieldValue.serverTimestamp(), recoveryHistory: FieldValue.arrayUnion({ action: 'outcome', outcome, by: auth.email || auth.uid, at: new Date().toISOString() }) }, { merge: true });
    }
    return NextResponse.json({ success: true });
}
