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

                const orderTotal = Number(orderDoc.data()?.total || 0);
                const amountPaid = Number(amount) / 100;
                if (!orderTotal || Math.abs(amountPaid - orderTotal) > 1) {
                    await orderRef.update({
                        paymentStatus: 'Pending Verification',
                        status: 'Pending Payment',
                        amountPaid,
                        paystackReference: reference,
                        paymentFailureReason: `Amount mismatch: received KES ${amountPaid}, expected KES ${orderTotal}`,
                        updatedAt: new Date().toISOString(),
                    });
                    console.warn(`Paystack amount mismatch for order ${orderId}: received ${amountPaid}, expected ${orderTotal}`);
                    return NextResponse.json({ status: 'amount_mismatch' });
                }

                await orderRef.update({
                    paymentStatus: 'Paid',
                    paymentMethod: 'Card',
                    paystackReference: reference,
                    paystackId: String(id),
                    transactionId: reference,
                    amountPaid,
                    paidAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    history: admin.firestore.FieldValue.arrayUnion({
                        status: 'Paid',
                        timestamp: new Date().toISOString(),
                        message: `Payment of ${amountPaid} KES confirmed via Paystack (Ref: ${reference})`,
                    }),
                });

                await adminDb.collection('transactions').add({
                    orderId,
                    userId: orderDoc.data()?.userId || null,
                    amount: amountPaid,
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
                        amountPaid,
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
