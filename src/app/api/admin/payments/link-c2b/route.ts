import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';

// Manually link an unmatched M-Pesa C2B payment to an order. Used by the
// admin payments hub when the auto-match (BillRefNumber / phone+amount)
// missed but the operator has identified the right order.
//
// Idempotency: refuses if the c2bPayment is already 'Matched'. Refuses if
// the order is already 'Paid' AND the existing receipt differs from the
// one we're about to attach (prevents double-credit). If the existing
// receipt matches, we treat it as a no-op success.
export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    }

    let body: any = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const c2bPaymentId = String(body?.c2bPaymentId || '').trim();
    const orderId = String(body?.orderId || '').trim();
    const action = String(body?.action || 'link').trim();

    if (!c2bPaymentId) {
        return NextResponse.json({ success: false, message: 'c2bPaymentId is required' }, { status: 400 });
    }

    const c2bRef = adminDb.collection('c2bPayments').doc(c2bPaymentId);
    const c2bSnap = await c2bRef.get();
    if (!c2bSnap.exists) {
        return NextResponse.json({ success: false, message: 'C2B payment not found' }, { status: 404 });
    }
    const c2b = c2bSnap.data() as any;

    if (action === 'ignore') {
        await c2bRef.update({
            status: 'Ignored',
            ignoredBy: auth.uid,
            ignoredByEmail: auth.email || null,
            ignoredAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, action: 'ignore' });
    }

    if (!orderId) {
        return NextResponse.json({ success: false, message: 'orderId is required to link' }, { status: 400 });
    }
    if (c2b.status === 'Matched' && c2b.matchedOrderId === orderId) {
        return NextResponse.json({ success: true, action: 'noop', message: 'Already matched to this order' });
    }
    if (c2b.status === 'Matched') {
        return NextResponse.json({
            success: false,
            message: `This payment is already matched to order ${c2b.matchedOrderId}`,
        }, { status: 409 });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }
    const order = orderSnap.data() as any;
    const incomingReceipt = String(c2b.transID || '');
    const existingReceipt = String(order.mpesaReceiptNumber || order.transactionId || '');

    if (order.paymentStatus === 'Paid' && existingReceipt && incomingReceipt && existingReceipt !== incomingReceipt) {
        return NextResponse.json({
            success: false,
            message: `Order ${orderId} is already Paid with a different receipt (${existingReceipt}). Refusing to overwrite.`,
        }, { status: 409 });
    }

    const now = new Date().toISOString();
    const internalEntry = {
        date: now,
        author: auth.email || auth.uid || 'admin',
        note: `Manually linked M-Pesa Till payment ${incomingReceipt || c2bPaymentId} (${Number(c2b.amount) || 0} KES) to this order via Payments hub.`,
    };

    const batch = adminDb.batch();
    batch.update(orderRef, {
        paymentStatus: 'Paid',
        paymentMethod: order.paymentMethod || 'M-Pesa',
        transactionId: incomingReceipt || order.transactionId || null,
        mpesaReceiptNumber: incomingReceipt || order.mpesaReceiptNumber || null,
        mpesaPhoneNumber: c2b.phone || order.mpesaPhoneNumber || null,
        amountPaid: Number(c2b.amount) || order.amountPaid || order.total || null,
        paymentResolvedVia: 'Manual_Admin_Link',
        paidAt: order.paidAt || now,
        updatedAt: now,
        internalHistory: [...(Array.isArray(order.internalHistory) ? order.internalHistory : []), internalEntry],
    });
    batch.update(c2bRef, {
        status: 'Matched',
        matchedOrderId: orderId,
        matchReason: 'Manual_Admin_Link',
        matchedBy: auth.uid,
        matchedByEmail: auth.email || null,
        matchedAt: now,
    });

    try {
        await batch.commit();
        return NextResponse.json({ success: true, action: 'link' });
    } catch (e: any) {
        console.error('link-c2b failed:', e);
        return NextResponse.json({ success: false, message: e?.message || 'Update failed' }, { status: 500 });
    }
}
