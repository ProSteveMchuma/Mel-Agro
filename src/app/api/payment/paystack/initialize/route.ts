import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { amount, email, orderId, items } = await request.json();
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL;

        if (!amount || !email || !orderId) {
            return NextResponse.json({ success: false, message: 'Missing required payment data' }, { status: 400 });
        }

        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

        // Mock Mode if no API Key
        if (!paystackSecretKey) {
            console.warn("Paystack: Running in mock mode due to missing PAYSTACK_SECRET_KEY.");
            return NextResponse.json({
                success: true,
                url: `${origin}/checkout/success?orderId=${orderId}&mock_payment=true`,
                reference: `MOCK_REF_${Date.now()}`
            });
        }

        // Initialize Paystack Transaction
        // Paystack expects amount in kobo/cents (multiply by 100)
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                amount: Math.round(amount * 100),
                reference: `MEL_${orderId}_${Date.now()}`,
                callback_url: `${origin}/checkout/success?orderId=${orderId}`,
                metadata: {
                    orderId,
                    items: items.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            }),
        });

        const data = await response.json();

        if (data.status) {
            return NextResponse.json({
                success: true,
                url: data.data.authorization_url,
                reference: data.data.reference
            });
        } else {
            console.error("Paystack Initialization Error:", data);
            return NextResponse.json({
                success: false,
                message: data.message || "Failed to initialize payment"
            }, { status: 400 });
        }

    } catch (error) {
        console.error("Paystack API Error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
