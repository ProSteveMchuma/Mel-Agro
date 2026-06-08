import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { sendServerSms, sendServerEmail } from '@/lib/server-notifications';

export async function POST(request: Request) {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
        console.error('Paystack Webhook: PAYSTACK_SECRET_KEY not configured — rejecting all webhooks');
        return NextResponse.json({ message: 'Webhook handler not configured' }, { status: 503 });
    }
    if (!signature) {
        console.error('Paystack Webhook: missing x-paystack-signature header — rejected');
        return NextResponse.json({ message: 'Missing signature' }, { status: 401 });
    }

    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (hash !== signature) {
        console.error('Paystack Webhook: invalid signature — rejected');
        return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    let event: any;
    try {
        event = JSON.parse(body);
    } catch {
        return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    try {
        const eventId = event?.data?.id ? String(event.data.id) : event?.id;
        const eventType = event?.event || 'unknown';

        if (eventId) {
            const dedupRef = adminDb.collection('paystackWebhookEvents').doc(String(eventId));
            const dedupSnap = await dedupRef.get();
            if (dedupSnap.exists) {
                console.log(`Paystack Webhook: idempotent skip — event ${eventId} already processed`);
                return NextResponse.json({ status: 'already_processed' });
            }
            await dedupRef.set({
                eventId: String(eventId),
                eventType,
                receivedAt: new Date().toISOString(),
            });
        }

        if (event.event === 'charge.success') {
            const { metadata, reference, id, amount, customer } = event.data || {};
            const orderId = metadata?.orderId;

            if (orderId) {
                const orderRef = adminDb.collection('orders').doc(orderId);
                const orderDoc = await orderRef.get();

                if (!orderDoc.exists) {
                    console.warn(`Paystack Webhook: Order ${orderId} not found`);
                    return NextResponse.json({ status: 'order_not_found' });
                }

                if (orderDoc.data()?.paymentStatus === 'Paid') {
                    console.log(`Paystack Webhook: order ${orderId} already Paid — idempotent skip`);
                    return NextResponse.json({ status: 'already_paid' });
                }

                await orderRef.update({
                    paymentStatus: 'Paid',
                    paymentMethod: 'Card',
                    paystackReference: reference,
                    paystackId: String(id),
                    transactionId: reference,
                    amountPaid: Number(amount) / 100,
                    paidAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    history: admin.firestore.FieldValue.arrayUnion({
                        status: 'Paid',
                        timestamp: new Date().toISOString(),
                        message: `Payment of ${Number(amount) / 100} KES confirmed via Paystack (Ref: ${reference})`,
                    }),
                });

                await adminDb.collection('transactions').add({
                    orderId,
                    userId: orderDoc.data()?.userId || null,
                    amount: Number(amount) / 100,
                    receipt: reference,
                    method: 'Card (Paystack)',
                    date: new Date().toISOString(),
                    status: 'Success',
                    recordedBy: 'System (Paystack Webhook)',
                    customerEmail: customer?.email || null,
                });

                // Fire-and-forget customer notification
                try {
                    const orderData = orderDoc.data();
                    const orderForTpl = {
                        ...orderData,
                        id: orderId,
                        paymentMethod: 'Card',
                        amountPaid: Number(amount) / 100,
                    } as any;
                    const tpl = CommunicationTemplates.getPaymentReceived(orderForTpl, {
                        receipt: reference,
                        method: 'Card (Paystack)',
                    });
                    if (orderData?.phone) sendServerSms(orderData.phone, tpl.smsBody).catch(() => { });
                    if (orderData?.userEmail || customer?.email) {
                        sendServerEmail(orderData?.userEmail || customer.email, tpl.subject, tpl.emailBody).catch(() => { });
                    }
                } catch (e) {
                    console.warn('Paystack payment-received notification failed (non-fatal):', e);
                }

                console.log(`Paystack Webhook: order ${orderId} marked Paid`);
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        console.error('Paystack Webhook Critical Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
