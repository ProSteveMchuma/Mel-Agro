import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { withActionUrls } from '@/lib/order-access';
import { sendTwilioWhatsApp, twilioWhatsAppConfigured } from '@/lib/whatsapp-send';
import {
    buildWhatsAppPaymentMessage,
    reminderBlockReason,
    whatsAppDeliveryPlan,
    whatsappDestination,
} from '@/lib/whatsapp-order';

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
        paymentStatus?: string;
        phone?: string;
        whatsappPhone?: string;
        userName?: string;
        total?: number;
        items?: Array<{ name?: string; quantity?: number }>;
    };
    const blocked = reminderBlockReason(order.paymentStatus);
    if (blocked) {
        return NextResponse.json({ success: false, message: blocked }, { status: 409 });
    }

    const destination = whatsappDestination(order);
    if (!destination) {
        return NextResponse.json({ success: false, message: 'Order has no phone number' }, { status: 400 });
    }

    const linked = await withActionUrls(order as any);
    const text = buildWhatsAppPaymentMessage({
        userName: order.userName,
        orderId: order.id,
        items: (order.items || []).map((item) => ({
            name: String(item.name || 'Item'),
            quantity: Number(item.quantity) || 1,
        })),
        total: Number(order.total) || 0,
        payUrl: linked.__actionUrls.pay,
    });
    const plan = whatsAppDeliveryPlan(twilioWhatsAppConfigured(), destination, text);
    const now = new Date().toISOString();

    if (plan.mode === 'draft') {
        await orderRef.update({
            lastWhatsAppPromptAt: now,
            lastWhatsAppPromptMode: 'draft',
            lastWhatsAppPromptOk: true,
            updatedAt: now,
        });
        return NextResponse.json({
            success: true,
            draft: true,
            url: plan.url,
            text: plan.message,
            message: 'WhatsApp draft ready',
        });
    }

    const sent = await sendTwilioWhatsApp(plan.to, plan.message);
    await orderRef.update({
        lastWhatsAppPromptAt: now,
        lastWhatsAppPromptMode: 'twilio',
        lastWhatsAppPromptOk: sent.ok,
        updatedAt: now,
    });
    if (!sent.ok) {
        const draft = whatsAppDeliveryPlan(false, destination, text);
        return NextResponse.json({
            success: false,
            draft: false,
            url: draft.mode === 'draft' ? draft.url : undefined,
            text,
            message: sent.reason || 'WhatsApp could not be sent',
        }, { status: 502 });
    }

    return NextResponse.json({
        success: true,
        draft: false,
        text,
        message: 'WhatsApp pay link sent',
    });
}
