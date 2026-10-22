import { NextResponse } from 'next/server';
import type { DocumentReference } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { querySTKStatus } from '@/lib/mpesa-server';
import { checkoutIdsToQuery, decideMpesaQueryWrite, getMpesaErrorMessage, resolveStkQueryProbes } from '@/lib/mpesa';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notifications';

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
        let orderRef: DocumentReference | null = null;
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
            if (!order.paymentSmsSentAt) {
                void notifyCustomerPaymentReceived({
                    orderId,
                    order,
                    receipt: order.mpesaReceiptNumber || order.transactionId,
                    method: order.paymentMethod || 'M-Pesa',
                });
            }
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
        const now = new Date().toISOString();

        const applied = orderRef
            ? await adminDb.runTransaction(async (tx) => {
                const freshSnap = await tx.get(orderRef);
                const fresh = freshSnap.data() || order;
                const write = decideMpesaQueryWrite({
                    paymentStatus: fresh.paymentStatus,
                    checkoutRequestId: fresh.checkoutRequestId,
                    outcome: resolved.outcome,
                    resultCheckoutRequestId: resolved.checkoutRequestId,
                });
                if (write === 'mark-paid') {
                    const startedProcessing = fresh.status === 'Pending Payment' || !fresh.status;
                    tx.update(orderRef, {
                        paymentStatus: 'Paid',
                        paymentMethod: fresh.paymentMethod || 'M-Pesa',
                        status: startedProcessing ? 'Processing' : fresh.status,
                        processingAt: fresh.processingAt || now,
                        stockReservationStatus: 'committed',
                        paidAt: fresh.paidAt || now,
                        updatedAt: now,
                        paymentFailureReason: null,
                        paymentFailureCode: null,
                        paymentFailureMessage: null,
                        paymentResolvedVia: 'STK_QUERY',
                    });
                } else if (write === 'mark-failed' && resultCode) {
                    tx.update(orderRef, {
                        paymentStatus: 'Failed',
                        status: 'Pending Payment',
                        paymentFailureReason: resultDesc,
                        paymentFailureCode: resultCode,
                        paymentFailureMessage: getMpesaErrorMessage(resultCode),
                        updatedAt: now,
                    });
                }
                return { write, order: fresh };
            })
            : { write: 'none' as const, order };

        if (resolved.outcome === 'paid' || applied.order?.paymentStatus === 'Paid' || applied.write === 'mark-paid') {
            const paidOrder = applied.order || order;
            if (!paidOrder?.paymentSmsSentAt) {
                await notifyCustomerPaymentReceived({
                    orderId,
                    order: {
                        ...paidOrder,
                        paymentStatus: 'Paid',
                        paymentMethod: paidOrder?.paymentMethod || 'M-Pesa',
                    },
                    receipt: paidOrder?.mpesaReceiptNumber || paidOrder?.transactionId,
                    method: paidOrder?.paymentMethod || 'M-Pesa',
                });
            }
            return NextResponse.json({
                success: true,
                paid: true,
                paymentStatus: 'Paid',
                resultCode,
                receipt: paidOrder?.mpesaReceiptNumber || paidOrder?.transactionId || null,
                message: 'Payment confirmed',
            });
        }

        const staleFailure = resolved.outcome === 'failed' && applied.write !== 'mark-failed';
        return NextResponse.json({
            success: true,
            paid: false,
            paymentStatus: resolved.outcome === 'pending' || staleFailure ? 'Pending' : 'Failed',
            resultCode,
            message: staleFailure
                ? 'Waiting for the latest M-Pesa prompt'
                : getMpesaErrorMessage(resultCode || ''),
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
