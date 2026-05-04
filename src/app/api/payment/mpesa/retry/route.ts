import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { initiateSTKPush } from '@/lib/mpesa';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { orderId, phoneNumber: overridePhone } = await request.json();

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: 'orderId is required' },
                { status: 400 }
            );
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
            return NextResponse.json(
                { success: false, message: 'Order is already paid' },
                { status: 409 }
            );
        }

        const phoneNumber = overridePhone || order.phone;
        const amount = order.total;

        if (!phoneNumber) {
            return NextResponse.json(
                { success: false, message: 'Order has no phone number — provide phoneNumber in request' },
                { status: 400 }
            );
        }

        if (!process.env.MPESA_CONSUMER_KEY) {
            const mockId = `ws_CO_${Date.now()}_Mock`;
            await orderSnap.ref.update({
                checkoutRequestId: mockId,
                paymentInitiatedAt: new Date().toISOString(),
                paymentStatus: 'Unpaid',
                retryCount: (order.retryCount || 0) + 1,
            });
            return NextResponse.json({
                success: true,
                message: 'M-Pesa STK Push retry initiated (Mock)',
                checkoutRequestID: mockId,
            });
        }

        const stkData = await initiateSTKPush({
            phoneNumber,
            amount,
            accountReference: `Order-${String(orderId).slice(0, 8)}`,
            transactionDesc: `Mel-Agri Order ${String(orderId).slice(0, 8)} (retry)`,
        });

        if (stkData.ResponseCode === '0' && stkData.CheckoutRequestID) {
            await orderSnap.ref.update({
                checkoutRequestId: stkData.CheckoutRequestID,
                merchantRequestId: stkData.MerchantRequestID || null,
                paymentInitiatedAt: new Date().toISOString(),
                paymentStatus: 'Unpaid',
                paymentFailureReason: null,
                paymentFailureCode: null,
                retryCount: (order.retryCount || 0) + 1,
                ...(overridePhone && overridePhone !== order.phone ? { phone: overridePhone } : {}),
            });

            return NextResponse.json({
                success: true,
                message: 'STK Push re-initiated',
                checkoutRequestID: stkData.CheckoutRequestID,
            });
        }

        console.error('M-Pesa Retry STK Error:', stkData);
        return NextResponse.json(
            {
                success: false,
                message: stkData.errorMessage || stkData.ResponseDescription || 'Failed to retry M-Pesa payment',
                code: stkData.errorCode || stkData.ResponseCode,
            },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('M-Pesa Retry Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
