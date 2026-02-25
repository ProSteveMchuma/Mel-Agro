import { NextResponse } from 'next/server';
import { getAccessToken, generatePassword } from '@/lib/mpesa';

export async function POST(request: Request) {
    try {
        const { phoneNumber, amount } = await request.json();

        if (!phoneNumber || !amount) {
            return NextResponse.json({ success: false, message: 'Phone number and amount are required' }, { status: 400 });
        }

        // Handle format: 0722... -> 254722...
        const formattedPhone = phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber;

        // Dev Mode / Mock Mode Check
        if (!process.env.MPESA_CONSUMER_KEY) {
            console.warn("M-Pesa: Running in mock mode due to missing keys.");
            return NextResponse.json({
                success: true,
                message: "M-Pesa STK Push initiated (Mock)",
                checkoutRequestID: `ws_CO_${Date.now()}_Mock`
            });
        }

        const accessToken = await getAccessToken();
        const { password, timestamp, shortcode } = generatePassword();
        const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/mpesa/callback`;

        const baseUrl = process.env.MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        const stkPushResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerBuyGoodsOnline',
                Amount: Math.round(amount),
                PartyA: formattedPhone,
                PartyB: process.env.MPESA_TILL_NUMBER || shortcode,
                PhoneNumber: formattedPhone,
                CallBackURL: callbackUrl,
                AccountReference: 'Mel-Agri',
                TransactionDesc: 'Order Payment',
            }),
        });

        const stkData = await stkPushResponse.json();

        if (stkPushResponse.ok && stkData.ResponseCode === '0') {
            return NextResponse.json({
                success: true,
                message: 'STK Push initiated successfully',
                checkoutRequestID: stkData.CheckoutRequestID,
            });
        } else {
            console.error("M-Pesa STK Error:", stkData);
            return NextResponse.json({
                success: false,
                message: stkData.errorMessage || 'Failed to initiate M-Pesa payment',
            }, { status: 400 });
        }

    } catch (error) {
        console.error('M-Pesa API Critical Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
