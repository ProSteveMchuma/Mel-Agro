import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';

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
    const carts = snapshot.docs.flatMap(doc => {
        const data = doc.data();
        const updatedAt = isoDate(data.updatedAt);
        const items = Array.isArray(data.items) ? data.items : [];
        if (!updatedAt || new Date(updatedAt).getTime() >= cutoff || items.length === 0) return [];
        return [{
            id: doc.id,
            userId: String(data.userId || doc.id),
            userName: String(data.userName || 'Customer'),
            userEmail: String(data.userEmail || ''),
            userPhone: String(data.userPhone || ''),
            items: items.map((item: Record<string, unknown>) => ({ id: String(item.id || ''), name: String(item.name || 'Product'), quantity: Number(item.quantity || 1), price: Number(item.price || 0) })),
            total: Number(data.total || 0),
            updatedAt,
            status: 'active',
        }];
    });
    carts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), carts: carts.slice(0, 100) });
}
