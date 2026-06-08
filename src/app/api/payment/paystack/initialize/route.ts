import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { amount, email, orderId, items } = await request.json();
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL;

        if (!orderId) {
            return NextResponse.json({ success: false, message: 'orderId is required' }, { status: 400 });
        }

        const auth = await requireOrderOwnerOrAdmin(request, orderId);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        }

        const orderSnap = await adminDb.collection('orders').doc(orderId).get();
        if (!orderSnap.exists) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        const order: any = orderSnap.data();
        if (order.paymentStatus === 'Paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 409 });
        }

        const verifiedAmount = Number(order.total);
        if (Math.abs(verifiedAmount - Number(amount || 0)) > 1) {
            console.warn(`Paystack init amount mismatch: client ${amount} vs order ${verifiedAmount}; using server amount`);
        }
        const customerEmail = email || order.userEmail || `customer_${orderId}@melagri-temp.com`;

        if (!verifiedAmount || verifiedAmount <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
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
                email: customerEmail,
                amount: Math.round(verifiedAmount * 100),
                reference: `MEL_${orderId}_${Date.now()}`,
                callback_url: `${origin}/checkout/success?orderId=${orderId}`,
                metadata: {
                    orderId,
                    userId: order.userId || null,
                    items: (items || order.items || []).map((item: any) => ({
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
