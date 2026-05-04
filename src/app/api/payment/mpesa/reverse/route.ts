import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import { reverseTransaction } from '@/lib/mpesa-server';

export async function POST(request: Request) {
    try {
        const auth = await requireAdmin(request);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        }

        const { orderId, amount: overrideAmount, remarks } = await request.json();

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: 'orderId is required' },
                { status: 400 }
            );
        }

        const orderSnap = await adminDb.collection('orders').doc(orderId).get();
        if (!orderSnap.exists) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        const order: any = orderSnap.data();

        if (order.paymentStatus !== 'Paid') {
            return NextResponse.json(
                { success: false, message: 'Cannot refund an unpaid order' },
                { status: 400 }
            );
        }

        if (order.refundStatus === 'Reversed' || order.refundStatus === 'Pending') {
            return NextResponse.json(
                { success: false, message: `Refund already ${order.refundStatus}` },
                { status: 409 }
            );
        }

        const transactionId = order.mpesaReceiptNumber || order.transactionId;
        if (!transactionId) {
            return NextResponse.json(
                { success: false, message: 'Order has no M-Pesa transaction ID to reverse' },
                { status: 400 }
            );
        }

        const amount = overrideAmount || order.amountPaid || order.total;

        if (!process.env.MPESA_INITIATOR_NAME || !process.env.MPESA_INITIATOR_PASSWORD) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Reversal not configured. Set MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD, and place ProductionCertificate.cer at src/lib/mpesa-certs/ (or set MPESA_PUBLIC_CERT_PATH).',
                    configurationRequired: true,
                },
                { status: 503 }
            );
        }

        const data = await reverseTransaction({
            transactionId,
            amount,
            remarks: remarks || `Refund for order ${String(orderId).slice(0, 8)}`,
        });

        if (data.ResponseCode === '0') {
            await orderSnap.ref.update({
                refundStatus: 'Pending',
                refundAmount: amount,
                refundInitiatedAt: new Date().toISOString(),
                refundInitiatedBy: auth.uid,
                refundConversationId: data.ConversationID || null,
                refundOriginatorConversationId: data.OriginatorConversationID || null,
                refundRemarks: remarks || null,
                updatedAt: new Date().toISOString(),
            });

            await adminDb.collection('refunds').add({
                orderId,
                userId: order.userId || null,
                amount,
                originalReceipt: transactionId,
                status: 'Pending',
                initiatedBy: auth.uid,
                initiatedByEmail: auth.email,
                initiatedAt: new Date().toISOString(),
                conversationId: data.ConversationID || null,
                originatorConversationId: data.OriginatorConversationID || null,
            });

            return NextResponse.json({
                success: true,
                message: 'Reversal initiated. Final status will be confirmed by Safaricom callback.',
                conversationId: data.ConversationID,
            });
        }

        console.error('M-Pesa Reversal Error:', data);
        return NextResponse.json(
            {
                success: false,
                message: data.errorMessage || data.ResponseDescription || 'Reversal request failed',
                code: data.errorCode || data.ResponseCode,
            },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('M-Pesa Reverse Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
