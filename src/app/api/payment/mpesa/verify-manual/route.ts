import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import { queryTransactionStatus } from '@/lib/mpesa-server';

export async function POST(request: Request) {
    try {
        const auth = await requireAdmin(request);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        }

        const { orderId, transactionCode, action = 'approve' } = await request.json();

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

        if (order.paymentStatus === 'Paid' && action === 'approve') {
            return NextResponse.json(
                { success: false, message: 'Order is already paid' },
                { status: 409 }
            );
        }

        if (action === 'auto-verify') {
            if (!transactionCode) {
                return NextResponse.json(
                    { success: false, message: 'transactionCode required for auto-verify' },
                    { status: 400 }
                );
            }
            if (!process.env.MPESA_INITIATOR_NAME || !process.env.MPESA_INITIATOR_PASSWORD) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Auto-verify requires MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD, and the production certificate. See README_ENV.md.',
                        configurationRequired: true,
                    },
                    { status: 503 }
                );
            }
            try {
                const data = await queryTransactionStatus({
                    transactionId: transactionCode,
                    remarks: `Verify code for order ${String(orderId).slice(0, 8)}`,
                });
                if (data.ResponseCode === '0') {
                    await orderSnap.ref.update({
                        statusQueryConversationId: data.ConversationID || null,
                        statusQueryOriginatorConversationId: data.OriginatorConversationID || null,
                        statusQueryInitiatedAt: new Date().toISOString(),
                        statusQueryInitiatedBy: auth.uid,
                        statusQueryCode: transactionCode,
                        manualVerificationAction: 'auto-verify-pending',
                        updatedAt: new Date().toISOString(),
                    });
                    return NextResponse.json({
                        success: true,
                        message: 'Auto-verification initiated. Safaricom will respond shortly. Order will auto-mark Paid if the receipt matches.',
                        conversationId: data.ConversationID,
                    });
                }
                return NextResponse.json(
                    {
                        success: false,
                        message: data.errorMessage || data.ResponseDescription || 'Daraja rejected the verification request',
                        code: data.errorCode || data.ResponseCode,
                    },
                    { status: 400 }
                );
            } catch (e: any) {
                return NextResponse.json(
                    { success: false, message: e?.message || 'Auto-verify failed' },
                    { status: 500 }
                );
            }
        }

        if (action === 'reject') {
            await orderSnap.ref.update({
                paymentStatus: 'Failed',
                paymentFailureReason: 'Manual transaction code rejected by admin',
                manualVerifiedBy: auth.uid,
                manualVerifiedAt: new Date().toISOString(),
                manualVerificationAction: 'rejected',
                updatedAt: new Date().toISOString(),
            });
            return NextResponse.json({ success: true, message: 'Manual payment rejected' });
        }

        if (!transactionCode) {
            return NextResponse.json(
                { success: false, message: 'transactionCode required to approve' },
                { status: 400 }
            );
        }

        const dupSnap = await adminDb
            .collection('transactions')
            .where('receipt', '==', transactionCode)
            .limit(1)
            .get();
        if (!dupSnap.empty) {
            const existing = dupSnap.docs[0].data();
            if (existing.orderId !== orderId) {
                return NextResponse.json(
                    { success: false, message: `Transaction code already used on order ${existing.orderId}` },
                    { status: 409 }
                );
            }
        }

        await orderSnap.ref.update({
            paymentStatus: 'Paid',
            paymentMethod: order.paymentMethod || 'M-Pesa Till (manual)',
            transactionId: transactionCode,
            mpesaReceiptNumber: transactionCode,
            status: order.status === 'Pending Payment' || !order.status ? 'Processing' : order.status,
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            manualVerifiedBy: auth.uid,
            manualVerifiedAt: new Date().toISOString(),
            manualVerificationAction: 'approved',
            paymentResolvedVia: 'MANUAL_ADMIN_VERIFY',
        });

        await adminDb.collection('transactions').add({
            orderId,
            userId: order.userId || null,
            amount: order.total,
            receipt: transactionCode,
            method: 'M-Pesa Till (manual)',
            date: new Date().toISOString(),
            status: 'Success',
            recordedBy: `Admin (${auth.email})`,
            verifiedBy: auth.uid,
        });

        return NextResponse.json({
            success: true,
            message: 'Manual payment verified and order marked as paid',
        });
    } catch (error: any) {
        console.error('Manual Verify Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
