import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { isValidMpesaReceipt, normalizeMpesaReceipt } from '@/lib/mpesa';
import { markOrderPaidWithReceipt } from '@/lib/mpesa-orders';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { queryTransactionStatus } from '@/lib/mpesa-server';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'mpesa-claim-receipt', 8, 10 * 60_000);
    if (limited) return limited;

    try {
        const { orderId, transactionCode } = await request.json();

        if (!orderId) {
            return NextResponse.json({ success: false, message: 'orderId is required' }, { status: 400 });
        }

        const owner = await requireOrderOwnerOrAdmin(request, orderId);
        if (!owner.ok) {
            return NextResponse.json({ success: false, message: owner.message }, { status: 401 });
        }

        const receipt = normalizeMpesaReceipt(transactionCode);
        if (!isValidMpesaReceipt(receipt)) {
            return NextResponse.json(
                { success: false, message: 'Enter a valid M-Pesa code from your SMS, e.g. TJK7H8K9L0' },
                { status: 400 },
            );
        }

        const orderSnap = await adminDb.collection('orders').doc(orderId).get();
        if (!orderSnap.exists) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        const order = orderSnap.data() || {};

        if (order.paymentStatus === 'Paid') {
            return NextResponse.json({
                success: true,
                paid: true,
                paymentStatus: 'Paid',
                message: 'This order is already paid',
            });
        }

        if (order.status === 'Cancelled') {
            return NextResponse.json({ success: false, message: 'This order was cancelled' }, { status: 409 });
        }

        const dupSnap = await adminDb.collection('transactions').where('receipt', '==', receipt).limit(1).get();
        if (!dupSnap.empty) {
            const existing = dupSnap.docs[0].data();
            if (existing.orderId !== orderId) {
                return NextResponse.json(
                    { success: false, message: 'This M-Pesa code is already linked to another order' },
                    { status: 409 },
                );
            }
        }

        const c2bSnap = await adminDb.collection('c2bPayments').where('transID', '==', receipt).limit(1).get();
        if (!c2bSnap.empty) {
            const c2b = c2bSnap.docs[0].data();
            if (c2b.matchedOrderId && c2b.matchedOrderId !== orderId) {
                return NextResponse.json(
                    { success: false, message: 'This M-Pesa code is already linked to another order' },
                    { status: 409 },
                );
            }

            const amount = Number(c2b.amount || 0);
            const orderTotal = Number(order.total || 0);
            const amountMatches = orderTotal > 0 && Math.abs(amount - orderTotal) < 1;

            if (amountMatches) {
                await markOrderPaidWithReceipt({
                    orderId,
                    order,
                    receipt,
                    amountPaid: amount,
                    phone: c2b.phone || order.phone,
                    transactionDate: c2b.transTime || undefined,
                    paymentMethod: order.paymentMethod || 'M-Pesa',
                    paymentResolvedVia: 'CUSTOMER_RECEIPT_C2B',
                    recordedBy: `Customer receipt (${owner.email || owner.uid})`,
                    extraOrderFields: {
                        claimedReceiptBy: owner.uid,
                        claimedReceiptAt: new Date().toISOString(),
                    },
                });
                await c2bSnap.docs[0].ref.update({
                    status: 'Matched',
                    matchedOrderId: orderId,
                    matchReason: 'CustomerClaimedReceipt',
                    matchedAt: new Date().toISOString(),
                });
                return NextResponse.json({
                    success: true,
                    paid: true,
                    paymentStatus: 'Paid',
                    message: 'Payment confirmed. Thank you.',
                });
            }
        }

        const now = new Date().toISOString();
        const pendingUpdate: Record<string, unknown> = {
            claimedMpesaReceipt: receipt,
            claimedReceiptBy: owner.uid,
            claimedReceiptAt: now,
            paymentStatus: 'Pending Verification',
            status: 'Pending Payment',
            paymentFailureMessage: null,
            updatedAt: now,
        };

        if (process.env.MPESA_INITIATOR_NAME && process.env.MPESA_INITIATOR_PASSWORD && process.env.MPESA_CONSUMER_KEY) {
            try {
                const data = await queryTransactionStatus({
                    transactionId: receipt,
                    remarks: `Customer claim for order ${String(orderId).slice(0, 8)}`,
                });
                if (data.ResponseCode === '0') {
                    pendingUpdate.statusQueryConversationId = data.ConversationID || null;
                    pendingUpdate.statusQueryOriginatorConversationId = data.OriginatorConversationID || null;
                    pendingUpdate.statusQueryInitiatedAt = now;
                    pendingUpdate.statusQueryInitiatedBy = owner.uid;
                    pendingUpdate.statusQueryCode = receipt;
                    pendingUpdate.manualVerificationAction = 'customer-claim-pending';
                }
            } catch (error) {
                console.warn('Customer receipt auto-verify skipped:', error);
            }
        }

        await orderSnap.ref.update(pendingUpdate);
        await adminDb.collection('adminAuditLog').add({
            action: 'customer_mpesa_receipt_claimed',
            actorId: owner.uid,
            actorEmail: owner.email || null,
            targetId: orderId,
            after: { receipt, paymentStatus: 'Pending Verification' },
            createdAt: now,
        });

        return NextResponse.json({
            success: true,
            paid: false,
            paymentStatus: 'Pending Verification',
            message: 'We received your M-Pesa code. If the payment matches this order, it will be confirmed shortly.',
        });
    } catch (error: any) {
        console.error('Claim receipt error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Could not submit the M-Pesa code' },
            { status: 500 },
        );
    }
}
