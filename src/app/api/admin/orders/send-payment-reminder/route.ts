import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { withActionUrls } from '@/lib/order-access';
import { notifyCustomer } from '@/lib/customer-notifications';
import { sendServerEmail } from '@/lib/server-notifications';
import { sendTwilioWhatsApp, twilioWhatsAppConfigured } from '@/lib/whatsapp-send';
import {
    buildWhatsAppPaymentMessage,
    reminderBlockReason,
    whatsAppDeliveryPlan,
    whatsappDestination,
} from '@/lib/whatsapp-order';

type Channel = 'sms' | 'email' | 'whatsapp';

export async function POST(request: Request) {
    const auth = await requirePermission(request, 'orders.manage');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const orderId = body?.orderId as string | undefined;
        const requestedChannels = (Array.isArray(body?.channels) ? body.channels : ['sms']) as Channel[];
        const channels: Channel[] = requestedChannels.filter(c => c === 'sms' || c === 'email' || c === 'whatsapp');

        if (!orderId) {
            return NextResponse.json({ success: false, message: 'orderId is required' }, { status: 400 });
        }
        if (channels.length === 0) {
            return NextResponse.json({ success: false, message: 'At least one channel must be selected' }, { status: 400 });
        }

        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        const order = { id: orderSnap.id, ...orderSnap.data() } as any;

        const blocked = reminderBlockReason(order.paymentStatus);
        if (blocked) {
            return NextResponse.json({ success: false, message: blocked }, { status: 409 });
        }

        const linked = await withActionUrls(order);
        const tpl = CommunicationTemplates.getPaymentReminder(linked);

        const results: Record<string, { ok: boolean; reason?: string; draft?: boolean; url?: string; text?: string }> = {};

        if (channels.includes('sms')) {
            const phone = order.phone || order.mpesaPhoneNumber;
            const result = await notifyCustomer({
                userId: order.userId,
                phone,
                message: tpl.smsBody,
                orderId,
            });
            results.sms = result.sms;
        } else {
            await notifyCustomer({
                userId: order.userId,
                phone: null,
                message: tpl.smsBody,
                orderId,
                skipSms: true,
            });
        }

        if (channels.includes('email')) {
            const email = order.userEmail;
            if (!email) {
                results.email = { ok: false, reason: 'No email on order' };
            } else {
                results.email = await sendServerEmail(email, tpl.subject, tpl.emailBody);
            }
        }

        if (channels.includes('whatsapp')) {
            const destination = whatsappDestination(order);
            if (!destination) {
                results.whatsapp = { ok: false, reason: 'No customer phone' };
            } else {
                const text = buildWhatsAppPaymentMessage({
                    userName: order.userName,
                    orderId: order.id,
                    items: Array.isArray(order.items) ? order.items.map((item: { name?: string; quantity?: number }) => ({
                        name: String(item.name || 'Item'),
                        quantity: Number(item.quantity) || 1,
                    })) : [],
                    total: Number(order.total) || 0,
                    payUrl: linked.__actionUrls.pay,
                });
                const plan = whatsAppDeliveryPlan(twilioWhatsAppConfigured(), destination, text);
                if (plan.mode === 'draft') {
                    results.whatsapp = { ok: true, reason: 'draft', draft: true, url: plan.url, text: plan.message };
                } else {
                    const sent = await sendTwilioWhatsApp(plan.to, plan.message);
                    const draft = whatsAppDeliveryPlan(false, destination, text);
                    results.whatsapp = sent.ok
                        ? { ok: true, text: plan.message }
                        : {
                            ok: false,
                            reason: sent.reason,
                            draft: true,
                            url: draft.mode === 'draft' ? draft.url : undefined,
                            text: plan.message,
                        };
                }
            }
        }

        const anyOk = Object.values(results).some(r => r?.ok);
        const sentChannels = channels.filter(c => results[c]?.ok);

        await orderRef.update({
            reminders: admin.firestore.FieldValue.arrayUnion({
                sentAt: new Date().toISOString(),
                sentBy: auth.uid,
                sentByEmail: auth.email,
                channels: sentChannels,
                results,
            }),
            reminderCount: admin.firestore.FieldValue.increment(anyOk ? 1 : 0),
            lastReminderAt: anyOk ? new Date().toISOString() : (order.lastReminderAt || null),
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({
            success: anyOk,
            message: anyOk
                ? `Reminder sent via ${sentChannels.join(', ') || 'no channels'}`
                : 'Reminder could not be delivered on any channel',
            results,
        });
    } catch (error: any) {
        console.error('Send payment reminder error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
