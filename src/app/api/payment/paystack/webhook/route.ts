import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notifications';
import { reportIncident } from '@/lib/incident-reporting';

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

        if (event.event !== 'charge.success') {
            if (eventId) {
                await adminDb.collection('paystackWebhookEvents').doc(String(eventId)).set({
                    eventId: String(eventId),
                    eventType,
                    receivedAt: new Date().toISOString(),
                    status: 'ignored',
                }, { merge: true });
            }
            return NextResponse.json({ status: 'ignored' });
        }

        const { metadata, reference, id, amount, customer } = event.data || {};
        const orderId = metadata?.orderId;
        if (!orderId) {
            return NextResponse.json({ status: 'missing_order' }, { status: 400 });
        }

        const orderRef = adminDb.collection('orders').doc(orderId);
        const dedupRef = eventId
            ? adminDb.collection('paystackWebhookEvents').doc(String(eventId))
            : null;
        const amountPaid = Number(amount) / 100;
        const receipt = String(reference || id || '');

        const outcome = await adminDb.runTransaction(async (transaction) => {
            if (dedupRef) {
                const dedupSnap = await transaction.get(dedupRef);
                if (dedupSnap.exists && dedupSnap.data()?.status === 'applied') {
                    return { kind: 'already_processed' as const };
                }
            }

            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                return { kind: 'order_not_found' as const };
            }

            const order = orderDoc.data() || {};
            if (order.paymentStatus === 'Paid') {
                if (dedupRef) {
                    transaction.set(dedupRef, {
                        eventId: String(eventId),
                        eventType,
                        orderId,
                        receivedAt: new Date().toISOString(),
                        status: 'applied',
                        note: 'order_already_paid',
                    }, { merge: true });
                }
                return { kind: 'already_paid' as const, order };
            }

            const orderTotal = Number(order.total || 0);
            if (!orderTotal || Math.abs(amountPaid - orderTotal) > 1) {
                transaction.update(orderRef, {
                    paymentStatus: 'Pending Verification',
                    status: 'Pending Payment',
                    amountPaid,
                    paystackReference: reference,
                    paymentFailureReason: `Amount mismatch: received KES ${amountPaid}, expected KES ${orderTotal}`,
                    updatedAt: new Date().toISOString(),
                });
                if (dedupRef) {
                    transaction.set(dedupRef, {
                        eventId: String(eventId),
                        eventType,
                        orderId,
                        receivedAt: new Date().toISOString(),
                        status: 'amount_mismatch',
                    }, { merge: true });
                }
                return { kind: 'amount_mismatch' as const };
            }

            const now = new Date().toISOString();
            transaction.update(orderRef, {
                paymentStatus: 'Paid',
                processingAt: now,
                paymentMethod: 'Card',
                paystackReference: reference,
                paystackId: String(id),
                transactionId: reference,
                amountPaid,
                status: 'Processing',
                stockReservationStatus: 'committed',
                paidAt: now,
                updatedAt: now,
                history: admin.firestore.FieldValue.arrayUnion({
                    status: 'Paid',
                    timestamp: now,
                    message: `Payment of ${amountPaid} KES confirmed via Paystack (Ref: ${reference})`,
                }),
            });

            if (receipt) {
                transaction.set(adminDb.collection('transactions').doc(`PAYSTACK_${receipt}`.slice(0, 150)), {
                    orderId,
                    userId: order.userId || null,
                    amount: amountPaid,
                    receipt,
                    method: 'Card (Paystack)',
                    date: now,
                    status: 'Success',
                    recordedBy: 'System (Paystack Webhook)',
                    customerEmail: customer?.email || null,
                }, { merge: true });
            }

            if (dedupRef) {
                transaction.set(dedupRef, {
                    eventId: String(eventId),
                    eventType,
                    orderId,
                    receivedAt: now,
                    status: 'applied',
                }, { merge: true });
            }

            return { kind: 'paid' as const, order };
        });

        if (outcome.kind === 'paid') {
            void notifyCustomerPaymentReceived({
                orderId,
                order: {
                    ...outcome.order,
                    amountPaid,
                    paymentMethod: 'Card (Paystack)',
                    transactionId: reference,
                },
                receipt,
                method: 'Card (Paystack)',
            });
            console.log(`Paystack Webhook: order ${orderId} marked Paid`);
        }

        if (outcome.kind === 'order_not_found') {
            return NextResponse.json({ status: 'order_not_found' }, { status: 404 });
        }

        return NextResponse.json({ status: outcome.kind === 'paid' ? 'success' : outcome.kind });
    } catch (error: any) {
        console.error('Paystack Webhook Critical Error:', error);
        void reportIncident({
            type: 'callback_error',
            severity: 'critical',
            source: 'paystack-webhook',
            message: error?.message || 'Webhook processing failed',
        });
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
