import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getMpesaErrorMessage } from '@/lib/mpesa';
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

        const orderData = orderDoc.data();
        const orderRef = orderDoc.ref;
        const items = (CallbackMetadata?.Item || []) as Array<{ Name: string; Value: any }>;
        const findVal = (name: string) => items.find(i => i.Name === name)?.Value;
        const mpesaReceiptNumber = String(findVal('MpesaReceiptNumber') || '');
        const amountPaid = Number(findVal('Amount') || 0);
        const phoneNumber = String(findVal('PhoneNumber') || '');
        const transactionDate = String(findVal('TransactionDate') || '');

        const callbackEventId = `${CheckoutRequestID}-${ResultCode}`;
        if (orderData.lastCallbackEventId === callbackEventId) {
            if (String(ResultCode) === '0' && !orderData.paymentSmsSentAt) {
                void notifyCustomerPaymentReceived({
                    orderId: orderDoc.id,
                    order: orderData,
                    receipt: mpesaReceiptNumber || orderData.mpesaReceiptNumber,
                    phone: phoneNumber || orderData.phone,
                    method: 'M-Pesa',
                });
            }
            console.log(`Idempotent skip — duplicate callback for ${callbackEventId}`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        if (orderData.paymentStatus === 'Paid') {
            if (ResultCode === 0 && mpesaReceiptNumber && !orderData.mpesaReceiptNumber) {
                await orderRef.update({
                    mpesaReceiptNumber,
                    transactionId: orderData.transactionId || mpesaReceiptNumber,
                    mpesaPhoneNumber: orderData.mpesaPhoneNumber || phoneNumber,
                    mpesaTransactionDate: orderData.mpesaTransactionDate || transactionDate,
                    amountPaid: orderData.amountPaid || amountPaid,
                    lastCallbackEventId: callbackEventId,
                    updatedAt: new Date().toISOString(),
                });
            }
            if (ResultCode === 0 && !orderData.paymentSmsSentAt) {
                void notifyCustomerPaymentReceived({
                    orderId: orderDoc.id,
                    order: {
                        ...orderData,
                        mpesaReceiptNumber: mpesaReceiptNumber || orderData.mpesaReceiptNumber,
                    },
                    receipt: mpesaReceiptNumber || orderData.mpesaReceiptNumber,
                    phone: phoneNumber || orderData.phone,
                    method: 'M-Pesa',
                });
            }
            console.log(`Idempotent skip — order ${orderDoc.id} already Paid`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        if (ResultCode === 0) {
            const orderTotal = Number(orderData.total || 0);
            const amountMatches = orderTotal > 0 && Math.abs(amountPaid - orderTotal) < 1;

            if (!amountMatches) {
                await orderRef.update({
                    paymentStatus: 'Pending Verification',
                    status: 'Pending Payment',
                    amountPaid,
                    mpesaReceiptNumber,
                    mpesaPhoneNumber: phoneNumber,
                    mpesaTransactionDate: transactionDate,
                    paymentFailureReason: `Amount mismatch: received KES ${amountPaid}, expected KES ${orderTotal}`,
                    lastCallbackEventId: callbackEventId,
                    updatedAt: new Date().toISOString(),
                });
                console.warn(`M-Pesa amount mismatch for order ${orderDoc.id}: received ${amountPaid}, expected ${orderTotal}`);
                return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
            }

            await orderRef.update({
                paymentStatus: 'Paid',
                paymentMethod: 'M-Pesa',
                transactionId: mpesaReceiptNumber,
                mpesaReceiptNumber,
                mpesaPhoneNumber: phoneNumber,
                mpesaTransactionDate: transactionDate,
                amountPaid,
                status: 'Processing',
                processingAt: new Date().toISOString(),
                stockReservationStatus: 'committed',
                lastCallbackEventId: callbackEventId,
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paymentFailureReason: null,
                paymentFailureCode: null,
                paymentFailureMessage: null,
            });

            await adminDb.collection('transactions').add({
                orderId: orderDoc.id,
                userId: orderData.userId || null,
                amount: amountPaid,
                receipt: mpesaReceiptNumber,
                phone: phoneNumber,
                method: 'M-Pesa',
                date: new Date().toISOString(),
                status: 'Success',
                checkoutRequestId: CheckoutRequestID,
                recordedBy: 'System (M-Pesa)',
            });

            void notifyCustomerPaymentReceived({
                orderId: orderDoc.id,
                order: {
                    ...orderData,
                    amountPaid,
                    mpesaReceiptNumber,
                    paymentMethod: 'M-Pesa',
                },
                receipt: mpesaReceiptNumber,
                phone: phoneNumber || orderData.phone,
                method: 'M-Pesa',
            });
        } else {
            void reportIncident({
                type: 'payment_failure',
                severity: 'warning',
                source: 'mpesa-callback',
                message: 'M-Pesa payment failed',
                metadata: { resultCode: String(ResultCode), orderId: orderDoc.id },
            });
            await orderRef.update({
                paymentStatus: 'Failed',
                status: 'Pending Payment',
                paymentFailureReason: ResultDesc,
                paymentFailureCode: String(ResultCode),
                paymentFailureMessage: getMpesaErrorMessage(ResultCode),
                lastCallbackEventId: callbackEventId,
                updatedAt: new Date().toISOString(),
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
