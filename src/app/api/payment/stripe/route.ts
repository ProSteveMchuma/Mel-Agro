import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
    try {
        const { amount, currency = 'kes' } = await request.json();

        if (!amount) {
            return NextResponse.json({ success: false, message: 'Amount is required' }, { status: 400 });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            console.warn("Missing Stripe Secret Key. Using mock response.");
            return NextResponse.json({
                success: true,
                clientSecret: "mock_client_secret_" + Date.now(),
                message: "Stripe Payment Intent created (Mock Mode - Missing Key)"
            });
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-11-17.clover' as any, // Use latest or pinned version
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amount in cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                integration_check: 'accept_a_payment',
            },
        });

        return NextResponse.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error('Stripe API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
