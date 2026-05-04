import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { sendServerSms, sendServerEmail } from '@/lib/server-notifications';

type Channel = 'sms' | 'email';

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const orderId = body?.orderId as string | undefined;
        const requestedChannels = (Array.isArray(body?.channels) ? body.channels : ['sms', 'email']) as Channel[];
        const channels: Channel[] = requestedChannels.filter(c => c === 'sms' || c === 'email');

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

        if (order.paymentStatus === 'Paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid — nothing to remind' }, { status: 409 });
        }
        if (order.paymentStatus === 'Refunded') {
            return NextResponse.json({ success: false, message: 'Order has been refunded' }, { status: 409 });
        }

        const tpl = CommunicationTemplates.getPaymentReminder(order);

        const results: Record<Channel, { ok: boolean; reason?: string }> = {} as any;

        if (channels.includes('sms')) {
            const phone = order.phone || order.mpesaPhoneNumber;
            if (!phone) {
                results.sms = { ok: false, reason: 'No phone number on order' };
            } else {
                results.sms = await sendServerSms(phone, tpl.smsBody);
            }
        }

        if (channels.includes('email')) {
            const email = order.userEmail;
            if (!email) {
                results.email = { ok: false, reason: 'No email on order' };
            } else {
                results.email = await sendServerEmail(email, tpl.subject, tpl.emailBody);
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
