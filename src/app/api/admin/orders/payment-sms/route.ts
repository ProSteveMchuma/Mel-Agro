import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { withActionUrls } from '@/lib/order-access';
import { notifyCustomer } from '@/lib/customer-notifications';
import { customerPayPhone, paymentLinkSms, reminderBlockReason } from '@/lib/whatsapp-order';

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

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as {
        id: string;
        userId?: string;
        paymentStatus?: string;
        phone?: string;
        whatsappPhone?: string;
        mpesaPhoneNumber?: string;
        userName?: string;
        total?: number;
        items?: Array<{ name?: string; quantity?: number }>;
    };
    const blocked = reminderBlockReason(order.paymentStatus);
    if (blocked) {
        return NextResponse.json({ success: false, message: blocked }, { status: 409 });
    }

    const phone = customerPayPhone(order, body?.phoneNumber);
    if (!phone) {
        return NextResponse.json({ success: false, message: 'Order has no phone number' }, { status: 400 });
    }

    const linked = await withActionUrls(order as any);
    const text = paymentLinkSms({
        userName: order.userName,
        orderId: order.id,
        items: (order.items || []).map((item) => ({
            name: String(item.name || 'Item'),
            quantity: Number(item.quantity) || 1,
        })),
        total: Number(order.total) || 0,
        payUrl: linked.__actionUrls.pay,
    });
    const sent = await notifyCustomer({
        userId: order.userId,
        phone,
        message: text,
        orderId,
    });
    const now = new Date().toISOString();
    await orderRef.update({
        lastPaymentLinkSmsAt: now,
        lastPaymentLinkSmsOk: sent.sms.ok,
        updatedAt: now,
    });

    if (!sent.sms.ok) {
        return NextResponse.json({
            success: false,
            text,
            message: sent.sms.reason || 'Could not send the pay-link SMS',
        }, { status: 502 });
    }

    return NextResponse.json({
        success: true,
        text,
        message: 'Pay link sent by SMS',
    });
}
