import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-paystack-signature');

        // Verification is highly recommended for production
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (secret && signature) {
            const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
            if (hash !== signature) {
                console.error("Paystack Webhook: Invalid Signature detected.");
                return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
            }
        }

        const event = JSON.parse(body);

        // Handle successful charge
        if (event.event === 'charge.success') {
            const { metadata, reference, id, amount, customer } = event.data;
            const orderId = metadata?.orderId;

            console.log(`Paystack Webhook: Received successful payment for Order ${orderId}. Reference: ${reference}`);

            if (orderId) {
                const orderRef = adminDb.collection('orders').doc(orderId);
                const orderDoc = await orderRef.get();

                if (orderDoc.exists) {
                    await orderRef.update({
                        paymentStatus: 'Paid',
                        paymentMethod: 'Card',
                        paystackReference: reference,
                        paystackId: id,
                        updatedAt: new Date().toISOString(),
                        'history': admin.firestore.FieldValue.arrayUnion({
                            status: 'Paid',
                            timestamp: new Date().toISOString(),
                            message: `Payment of ${amount / 100} KES confirmed via Paystack (Ref: ${reference})`
                        })
                    });

                    console.log(`Order ${orderId} updated to 'Paid' via Webhook.`);
                } else {
                    console.warn(`Paystack Webhook: Order ${orderId} not found in Firestore.`);
                }
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        console.error('Paystack Webhook Critical Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
