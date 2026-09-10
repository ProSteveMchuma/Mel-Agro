import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { querySTKStatus } from '@/lib/mpesa-server';
import { checkoutIdsToQuery, getMpesaErrorMessage, resolveStkQueryProbes } from '@/lib/mpesa';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'mpesa-query', 30, 10 * 60_000);
    if (limited) return limited;

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
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json(
                    { success: false, paid: false, message: 'M-Pesa is temporarily unavailable' },
                    { status: 503 },
                );
            }
            return NextResponse.json({
                success: true,
                paid: false,
                paymentStatus: 'Unpaid',
                message: 'M-Pesa not configured (mock mode)',
                mock: true,
            });
        }

        const ids = checkoutIdsToQuery(order || {}, crid);
        const probes = [];
        for (const id of ids) {
            const data = await querySTKStatus(id);
            probes.push({
                checkoutRequestId: id,
                resultCode: data.ResultCode !== undefined && data.ResultCode !== null ? String(data.ResultCode) : undefined,
                resultDesc: data.ResultDesc || data.errorMessage || 'Unknown',
                data,
            });
        }

        const resolved = resolveStkQueryProbes(probes);
        const resultCode = resolved.resultCode;
        const resultDesc = resolved.resultDesc || 'Unknown';
        const data = resolved.data;

        if (resolved.outcome === 'paid') {
            if (orderRef && order?.paymentStatus !== 'Paid') {
                await orderRef.update({
                    paymentStatus: 'Paid',
                    paymentMethod: order.paymentMethod || 'M-Pesa',
                    status: order.status === 'Pending Payment' || !order.status ? 'Processing' : order.status,
                    processingAt: new Date().toISOString(),
                    stockReservationStatus: 'committed',
                    paidAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    paymentFailureReason: null,
                    paymentFailureCode: null,
                    paymentFailureMessage: null,
                    paymentResolvedVia: 'STK_QUERY',
                });
            }
            return NextResponse.json({
                success: true,
                paid: true,
                paymentStatus: 'Paid',
                resultCode,
                receipt: order?.mpesaReceiptNumber || order?.transactionId || null,
                message: 'Payment confirmed',
            });
        }

        if (resolved.outcome === 'failed' && resultCode && orderRef && order?.paymentStatus !== 'Paid') {
            await orderRef.update({
                paymentStatus: 'Failed',
                status: 'Pending Payment',
                paymentFailureReason: resultDesc,
                paymentFailureCode: resultCode,
                paymentFailureMessage: getMpesaErrorMessage(resultCode),
                updatedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            paid: false,
            paymentStatus: resolved.outcome === 'pending' ? 'Pending' : 'Failed',
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
