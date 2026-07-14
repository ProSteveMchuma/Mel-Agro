import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { initiateSTKPush } from '@/lib/mpesa-server';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { orderId, phoneNumber } = await request.json();

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: 'orderId is required' },
                { status: 400 }
            );
        }
        if (!phoneNumber) {
            return NextResponse.json(
                { success: false, message: 'phoneNumber is required' },
                { status: 400 }
            );
        }

        const auth = await requireOrderOwnerOrAdmin(request, orderId);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        }

        const snap = await adminDb.collection('orders').doc(orderId).get();
        if (!snap.exists) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        const order = snap.data();
        const verifiedAmount = Number(order?.total);
        if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
        }
        if (order?.paymentStatus === 'Paid') {
            return NextResponse.json(
                { success: false, message: 'Order is already paid' },
                { status: 409 }
            );
        }

        if (!process.env.MPESA_CONSUMER_KEY) {
            console.warn("M-Pesa: Running in mock mode due to missing keys.");
            const mockId = `ws_CO_${Date.now()}_Mock`;
            await adminDb.collection('orders').doc(orderId).update({
                checkoutRequestId: mockId,
                paymentInitiatedAt: new Date().toISOString(),
                paymentStatus: 'Unpaid',
            }).catch(() => { });
            return NextResponse.json({
                success: true,
                message: "M-Pesa STK Push initiated (Mock)",
                checkoutRequestID: mockId,
            });
        }

        const stkData = await initiateSTKPush({
            phoneNumber,
            amount: verifiedAmount,
            accountReference: `Order-${String(orderId).slice(0, 8)}`,
            transactionDesc: `Mel-Agri Order ${String(orderId).slice(0, 8)}`,
        });

        if (stkData.ResponseCode === '0' && stkData.CheckoutRequestID) {
            await adminDb.collection('orders').doc(orderId).update({
                checkoutRequestId: stkData.CheckoutRequestID,
                merchantRequestId: stkData.MerchantRequestID || null,
                paymentInitiatedAt: new Date().toISOString(),
                paymentStatus: 'Unpaid',
                paymentFailureReason: null,
                paymentFailureCode: null,
            });
            return NextResponse.json({
                success: true,
                message: 'STK Push initiated successfully',
                checkoutRequestID: stkData.CheckoutRequestID,
                merchantRequestID: stkData.MerchantRequestID,
            });
        }

        console.error("M-Pesa STK Error:", stkData);
        return NextResponse.json(
            {
                success: false,
                message: stkData.errorMessage || stkData.ResponseDescription || 'Failed to initiate M-Pesa payment',
                code: stkData.errorCode || stkData.ResponseCode,
            },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('M-Pesa API Critical Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
