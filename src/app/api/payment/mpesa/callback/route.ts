import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { decideMpesaCallback, getMpesaErrorMessage, isMpesaPaidCode } from '@/lib/mpesa';
import { findOrderByCheckoutRequestId } from '@/lib/mpesa-orders';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notifications';
import { reportIncident } from '@/lib/incident-reporting';

export async function POST(request: Request) {
    const ipCheck = verifySafaricomCallback(request);
    if (!ipCheck.ok) {
        console.warn(`M-Pesa Callback REJECTED — ${ipCheck.reason}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    let payload: any;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    try {
        const stkCallback = payload?.Body?.stkCallback;
        if (!stkCallback) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
        console.info('M-Pesa callback received', {
            checkoutRequestId: CheckoutRequestID || 'missing',
            resultCode: String(ResultCode ?? 'missing'),
        });

        const orderDoc = await findOrderByCheckoutRequestId(CheckoutRequestID);
        if (!orderDoc) {
            console.warn(`Order not found for CheckoutRequestID: ${CheckoutRequestID}`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const orderData = orderDoc.data() || {};
        const orderRef = orderDoc.ref;
        const items = callbackItems(CallbackMetadata);
        const findVal = (name: string) => items.find(i => i.Name === name)?.Value;
        const mpesaReceiptNumber = String(findVal('MpesaReceiptNumber') || '');
        const amountPaid = Number(findVal('Amount') || 0);
        const phoneNumber = String(findVal('PhoneNumber') || '');
        const transactionDate = String(findVal('TransactionDate') || '');

        const callbackEventId = `${CheckoutRequestID}-${ResultCode}`;
        const paidCode = isMpesaPaidCode(ResultCode);
        const now = new Date().toISOString();
        const applied = await adminDb.runTransaction(async (tx) => {
            const freshSnap = await tx.get(orderRef);
            const fresh = freshSnap.data() || orderData;
            const decision = decideMpesaCallback({
                order: fresh,
                checkoutRequestId: CheckoutRequestID,
                resultCode: ResultCode,
                callbackEventId,
                amountPaid,
                receipt: mpesaReceiptNumber,
            });

            if (decision.action === 'mark-paid') {
                const startedProcessing = fresh.status === 'Pending Payment' || !fresh.status;
                tx.update(orderRef, {
                    paymentStatus: 'Paid',
                    paymentMethod: 'M-Pesa',
                    transactionId: mpesaReceiptNumber,
                    mpesaReceiptNumber,
                    mpesaPhoneNumber: phoneNumber,
                    mpesaTransactionDate: transactionDate,
                    amountPaid,
                    status: startedProcessing ? 'Processing' : fresh.status,
                    processingAt: fresh.processingAt || now,
                    stockReservationStatus: 'committed',
                    lastCallbackEventId: callbackEventId,
                    paidAt: now,
                    updatedAt: now,
                    paymentFailureReason: null,
                    paymentFailureCode: null,
                    paymentFailureMessage: null,
                    paymentResolvedVia: 'STK_CALLBACK',
                });
                tx.set(adminDb.collection('transactions').doc(), {
                    orderId: orderDoc.id,
                    userId: fresh.userId || null,
                    amount: amountPaid,
                    receipt: mpesaReceiptNumber,
                    phone: phoneNumber,
                    method: 'M-Pesa',
                    date: now,
                    status: 'Success',
                    checkoutRequestId: CheckoutRequestID,
                    recordedBy: 'System (M-Pesa)',
                });
            } else if (decision.action === 'amount-mismatch') {
                tx.update(orderRef, {
                    paymentStatus: 'Pending Verification',
                    status: 'Pending Payment',
                    amountPaid,
                    mpesaReceiptNumber,
                    mpesaPhoneNumber: phoneNumber,
                    mpesaTransactionDate: transactionDate,
                    paymentFailureReason: `Amount mismatch: received KES ${amountPaid}, expected KES ${fresh.total}`,
                    lastCallbackEventId: callbackEventId,
                    updatedAt: now,
                });
            } else if (decision.action === 'fill-receipt') {
                tx.update(orderRef, {
                    mpesaReceiptNumber,
                    transactionId: fresh.transactionId || mpesaReceiptNumber,
                    mpesaPhoneNumber: fresh.mpesaPhoneNumber || phoneNumber,
                    mpesaTransactionDate: fresh.mpesaTransactionDate || transactionDate,
                    amountPaid: fresh.amountPaid || amountPaid,
                    lastCallbackEventId: callbackEventId,
                    updatedAt: now,
                });
            } else if (decision.action === 'mark-failed') {
                tx.update(orderRef, {
                    paymentStatus: 'Failed',
                    status: 'Pending Payment',
                    paymentFailureReason: ResultDesc,
                    paymentFailureCode: String(ResultCode),
                    paymentFailureMessage: getMpesaErrorMessage(ResultCode),
                    lastCallbackEventId: callbackEventId,
                    updatedAt: now,
                });
            }

            return {
                action: decision.action,
                order: fresh,
                notify: paidCode && !fresh.paymentSmsSentAt && (decision.action === 'mark-paid' || decision.action === 'fill-receipt' || decision.action === 'ignore'),
            };
        });

        if (applied.action === 'amount-mismatch') {
            console.warn(`M-Pesa amount mismatch for order ${orderDoc.id}: received ${amountPaid}, expected ${applied.order.total}`);
        } else if (applied.action === 'mark-failed') {
            void reportIncident({
                type: 'payment_failure',
                severity: 'warning',
                source: 'mpesa-callback',
                message: 'M-Pesa payment failed',
                metadata: { resultCode: String(ResultCode), orderId: orderDoc.id },
            });
        } else if (applied.action === 'ignore') {
            console.log(`Idempotent skip — callback ${callbackEventId} did not change order ${orderDoc.id}`);
        }

        if (applied.notify) {
            void notifyCustomerPaymentReceived({
                orderId: orderDoc.id,
                order: {
                    ...applied.order,
                    amountPaid: amountPaid || applied.order.amountPaid,
                    mpesaReceiptNumber: mpesaReceiptNumber || applied.order.mpesaReceiptNumber,
                    paymentMethod: 'M-Pesa',
                },
                receipt: mpesaReceiptNumber || applied.order.mpesaReceiptNumber,
                phone: phoneNumber || applied.order.phone,
                method: 'M-Pesa',
            });
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.error("Callback Processing Error:", error);
        void reportIncident({
            type: 'callback_error',
            severity: 'critical',
            source: 'mpesa-callback',
            message: error instanceof Error ? error.message : 'Callback processing failed',
        });
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
}

function callbackItems(metadata: { Item?: unknown } | null | undefined): Array<{ Name: string; Value: unknown }> {
    const item = metadata?.Item;
    if (Array.isArray(item)) return item as Array<{ Name: string; Value: unknown }>;
    if (item && typeof item === 'object') return [item as { Name: string; Value: unknown }];
    return [];
}
