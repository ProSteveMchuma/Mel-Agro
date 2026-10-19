import { NextResponse } from 'next/server';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';

const HIDDEN_FIELDS = new Set(['internalNotes', 'internalHistory']);

function serializable(value: unknown): unknown {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (Array.isArray(value)) return value.map(serializable);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !HIDDEN_FIELDS.has(key))
                .map(([key, entry]) => [key, serializable(entry)]),
        );
    }
    return value;
}

function toOrder(id: string, data: Record<string, unknown>) {
    return {
        ...(serializable(data) as Record<string, unknown>),
        id,
        userId: data.userId,
    };
}

export async function GET(request: Request) {
    const limited = enforceRateLimit(request, 'orders-mine', 60, 60_000);
    if (limited) return limited;

    const auth = await requireUser(request);
    if (!auth.ok || !auth.uid) {
        return NextResponse.json({ success: false, message: auth.message || 'Unauthorized' }, { status: 401 });
    }

    const orderId = new URL(request.url).searchParams.get('orderId')?.trim() || '';
    if (orderId) {
        const snap = await adminDb.collection('orders').doc(orderId).get();
        if (!snap.exists || snap.data()?.userId !== auth.uid) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            orders: [toOrder(snap.id, snap.data() || {})],
        });
    }

    const PAGE = 100;
    const all: Array<Record<string, unknown> & { id: string }> = [];
    let cursor: QueryDocumentSnapshot | undefined;
    for (let page = 0; page < 20; page += 1) {
        let query = adminDb.collection('orders').where('userId', '==', auth.uid).limit(PAGE);
        if (cursor) query = query.startAfter(cursor);
        const snap = await query.get();
        all.push(...snap.docs.map((doc) => toOrder(doc.id, doc.data() || {}) as Record<string, unknown> & { id: string }));
        if (snap.size < PAGE) break;
        cursor = snap.docs[snap.docs.length - 1];
    }
    all.sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

    return NextResponse.json({ success: true, orders: all });
}
