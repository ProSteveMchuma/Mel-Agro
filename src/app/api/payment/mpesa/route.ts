import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { phoneNumber, amount } = await request.json();

        if (!phoneNumber || !amount) {
            return NextResponse.json({ success: false, message: 'Phone number and amount are required' }, { status: 400 });
        }

        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const passkey = process.env.MPESA_PASSKEY;
        const shortcode = process.env.MPESA_SHORTCODE; // e.g., 174379
        const callbackUrl = process.env.MPESA_CALLBACK_URL; // e.g., https://your-domain.com/api/payment/mpesa/callback

        if (!consumerKey || !consumerSecret || !passkey || !shortcode || !callbackUrl) {
            console.warn("Missing M-Pesa environment variables. Using mock response.");
            // For development without keys, return a mock success
            return NextResponse.json({
                success: true,
                message: "M-Pesa STK Push initiated (Mock Mode - Missing Keys)",
                checkoutRequestID: `ws_CO_${Date.now()}`
            });
        }

        // 1. Generate Access Token
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to generate M-Pesa access token');
        }

        const { access_token } = await tokenResponse.json();

        // 2. Generate Password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        // 3. Initiate STK Push
        const stkPushResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(amount), // Ensure integer
                PartyA: phoneNumber, // Phone number sending money
                PartyB: shortcode, // Shortcode receiving money
                PhoneNumber: phoneNumber,
                CallBackURL: callbackUrl,
                AccountReference: 'MelAgro',
                TransactionDesc: 'Order Payment',
            }),
        });

        const stkData = await stkPushResponse.json();

        if (stkData.ResponseCode === '0') {
            return NextResponse.json({
                success: true,
                message: 'M-Pesa STK Push initiated successfully',
                checkoutRequestID: stkData.CheckoutRequestID,
            });
        } else {
            return NextResponse.json({
                success: false,
                message: stkData.errorMessage || 'Failed to initiate M-Pesa payment',
            }, { status: 400 });
        }

    } catch (error) {
        console.error('M-Pesa API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
