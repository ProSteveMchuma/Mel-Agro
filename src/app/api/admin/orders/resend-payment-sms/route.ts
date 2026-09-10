import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notifications';

export async function POST(request: Request) {
    const auth = await requirePermission(request, 'orders.manage');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const { orderId } = await request.json();
        if (!orderId) {
            return NextResponse.json({ success: false, message: 'orderId is required' }, { status: 400 });
        }

        const orderSnap = await adminDb.collection('orders').doc(orderId).get();
        if (!orderSnap.exists) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        const order = orderSnap.data() || {};
        if (order.paymentStatus !== 'Paid') {
            return NextResponse.json({ success: false, message: 'Order is not paid yet' }, { status: 409 });
        }

        const result = await notifyCustomerPaymentReceived({
            orderId,
            order: { ...order, id: orderId },
            receipt: order.mpesaReceiptNumber || order.transactionId,
            method: order.paymentMethod || 'M-Pesa',
            force: true,
        });

        return NextResponse.json({
            success: result.sms.ok,
            message: result.sms.ok
                ? 'Payment confirmation SMS sent'
                : (result.sms.reason || 'Could not send SMS'),
        });
    } catch (error: any) {
        console.error('Resend payment SMS error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 },
        );
    }
}
