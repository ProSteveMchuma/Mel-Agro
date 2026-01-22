import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
    apiVersion: '2025-11-17.clover' as any,
}) : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
        if (!stripe) {
            console.error("❌ Stripe is not initialized (Missing Secret Key)");
            return NextResponse.json({ message: "Stripe configuration missing" }, { status: 500 });
        }

        if (!webhookSecret) {
            console.warn("⚠️ Stripe Webhook Secret is missing. Skipping signature verification (Not for production!)");
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        }
    } catch (err: any) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
            console.log(`✅ Payment successful for Order: ${orderId}`);

            try {
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    await updateDoc(orderRef, {
                        paymentStatus: 'Paid',
                        paymentMethod: 'Card',
                        stripeSessionId: session.id,
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error(`❌ Error updating order ${orderId}:`, error);
                return NextResponse.json({ message: "Error updating order" }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
