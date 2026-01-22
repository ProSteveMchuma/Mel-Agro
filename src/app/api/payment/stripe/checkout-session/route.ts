import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
    try {
        const { items, orderId, email } = await request.json(); // Expect cart items and orderId
        const origin = request.headers.get('origin');

        if (!items || !orderId) {
            return NextResponse.json({ success: false, message: 'Items and Order ID are required' }, { status: 400 });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            console.warn("Missing Stripe Secret Key. Using mock response.");
            return NextResponse.json({
                success: true,
                url: `${origin}/checkout/success?orderId=${orderId}&mock_payment=true` // Mock redirect
            });
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-11-17.clover' as any, // Use latest or pinned version
        });

        // Transform cart items to Stripe line items
        const lineItems = items.map((item: any) => ({
            price_data: {
                currency: 'kes',
                product_data: {
                    name: item.name,
                    images: item.image ? [item.image] : [],
                },
                unit_amount: Math.round(item.price * 100), // Amount in cents
            },
            quantity: item.quantity,
        }));

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${origin}/checkout/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout?canceled=true`,
            customer_email: email,
            metadata: {
                orderId: orderId
            }
        });

        return NextResponse.json({
            success: true,
            url: session.url,
            sessionId: session.id
        });

    } catch (error) {
        console.error('Stripe Session Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
