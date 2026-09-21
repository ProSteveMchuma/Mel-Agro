import { NextResponse } from 'next/server';
import { isValidMpesaReceipt, normalizeMpesaReceipt } from '@/lib/mpesa';
import { markOrderPaidWithReceipt } from '@/lib/mpesa-orders';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-pay-claim', 8, 10 * 60_000);
    if (limited) return limited;

    try {
        const { id: orderId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const accessToken = body.accessToken || body.t;
        const receipt = normalizeMpesaReceipt(body.transactionCode);

        const auth = await authorizeOrderAction({
            request,
            orderId,
            action: 'pay',
            accessToken,
        });
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        if (!isValidMpesaReceipt(receipt)) {
            return NextResponse.json({
                success: false,
                message: 'Enter a valid M-Pesa code from your SMS, e.g. TJK7H8K9L0',
            }, { status: 400 });
        }

        const order = auth.order.data;
        if (order.paymentStatus === 'Paid') {
            return NextResponse.json({ success: true, message: 'Order is already paid', alreadyPaid: true });
        }
        if (order.status === 'Cancelled') {
            return NextResponse.json({ success: false, message: 'This order was cancelled' }, { status: 409 });
        }

        const c2bSnap = await adminDb.collection('c2bPayments').where('transID', '==', receipt).limit(1).get();
        if (!c2bSnap.empty) {
            const c2b = c2bSnap.docs[0].data();
            if (c2b.matchedOrderId && c2b.matchedOrderId !== orderId) {
                return NextResponse.json({
                    success: false,
                    message: 'This M-Pesa code is already linked to another order',
                }, { status: 409 });
            }

            const amount = Number(c2b.amount || 0);
            const orderTotal = Number(order.total || 0);
            if (orderTotal > 0 && Math.abs(amount - orderTotal) < 1) {
                await markOrderPaidWithReceipt({
                    orderId,
                    order,
                    receipt,
                    amountPaid: amount,
                    phone: c2b.phone || order.phone,
                    transactionDate: c2b.transTime || undefined,
                    paymentMethod: order.paymentMethod || 'M-Pesa',
                    paymentResolvedVia: 'ORDER_LINK_RECEIPT_C2B',
                    recordedBy: 'Customer order link',
                });
                return NextResponse.json({ success: true, message: 'Payment confirmed' });
            }
        }

        await auth.order.ref.update({
            paymentStatus: 'Pending Verification',
            claimedMpesaReceipt: receipt,
            claimedMpesaReceiptAt: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            pending: true,
            message: 'Code submitted for verification. We will confirm shortly.',
        });
    } catch (error: any) {
        console.error('[order-pay-claim]', error);
        return NextResponse.json({ success: false, message: error?.message || 'Claim failed' }, { status: 500 });
    }
}
