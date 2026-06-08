import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { querySTKStatus } from '@/lib/mpesa-server';
import { getMpesaErrorMessage } from '@/lib/mpesa';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { orderId, checkoutRequestID } = await request.json();

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

        let order: any = null;
        let orderRef: any = null;
        let crid = checkoutRequestID as string | undefined;

        if (orderId) {
            const snap = await adminDb.collection('orders').doc(orderId).get();
            if (!snap.exists) {
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }
            order = snap.data();
            orderRef = snap.ref;
            crid = crid || order.checkoutRequestId;
        }

        if (order?.paymentStatus === 'Paid') {
            return NextResponse.json({
                success: true,
                paid: true,
                paymentStatus: 'Paid',
                receipt: order.mpesaReceiptNumber || order.transactionId || null,
                message: 'Already paid',
            });
        }

        if (!crid) {
            return NextResponse.json(
                { success: false, message: 'No checkoutRequestID associated with this order' },
                { status: 400 }
            );
        }

        if (!process.env.MPESA_CONSUMER_KEY) {
            return NextResponse.json({
                success: true,
                paid: false,
                paymentStatus: 'Unpaid',
                message: 'M-Pesa not configured (mock mode)',
                mock: true,
            });
        }

        const data = await querySTKStatus(crid);

        const resultCode = data.ResultCode !== undefined ? String(data.ResultCode) : undefined;
        const resultDesc = data.ResultDesc || data.errorMessage || 'Unknown';

        if (resultCode === '0') {
            if (orderRef && order && order.paymentStatus !== 'Paid') {
                await orderRef.update({
                    paymentStatus: 'Paid',
                    paymentMethod: 'M-Pesa',
                    status: 'Processing',
                    paidAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    paymentResolvedVia: 'STK_QUERY',
                });
            }
            return NextResponse.json({
                success: true,
                paid: true,
                paymentStatus: 'Paid',
                resultCode,
                message: 'Payment confirmed via STK Query',
            });
        }

        const stillPending = ['1037', '1032', '500.001.1001'].includes(resultCode || '') ||
            data.errorCode === '500.001.1001';

        if (resultCode && resultCode !== '0' && !stillPending && orderRef && order?.paymentStatus !== 'Paid') {
            await orderRef.update({
                paymentStatus: 'Failed',
                paymentFailureReason: resultDesc,
                paymentFailureCode: resultCode,
                paymentFailureMessage: getMpesaErrorMessage(resultCode),
                updatedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            paid: false,
            paymentStatus: stillPending ? 'Pending' : (resultCode === '0' ? 'Paid' : 'Failed'),
            resultCode,
            message: getMpesaErrorMessage(resultCode || ''),
            raw: data,
        });
    } catch (error: any) {
        console.error('M-Pesa Query Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
