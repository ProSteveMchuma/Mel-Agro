import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { sendStaffOrderAlert } from '@/lib/staff-order-alert-server';

export async function POST(request: Request) {
    const actor = await requirePermission(request, 'orders.manage');
    if (!actor.ok) {
        return NextResponse.json({ success: false, message: actor.message }, { status: actor.message?.includes('Missing') ? 403 : 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.orderId || '').trim();
    if (!orderId) {
        return NextResponse.json({ success: false, message: 'orderId is required' }, { status: 400 });
    }

    const orderSnap = await adminDb.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as { id: string; staffOrderAlert?: { ok?: boolean } };
    if (order.staffOrderAlert?.ok) {
        return NextResponse.json({ success: false, message: 'Staff alert was already sent' }, { status: 409 });
    }

    const sent = await sendStaffOrderAlert(orderId, order);
    if (!sent.ok) {
        return NextResponse.json({
            success: false,
            message: sent.reason || 'Could not send the staff alert',
        }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Staff alert sent' });
}
