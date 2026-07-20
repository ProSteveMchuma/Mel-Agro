import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getMpesaErrorMessage } from '@/lib/mpesa';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { sendServerSms, sendServerEmail } from '@/lib/server-notifications';

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

    console.log("M-Pesa Callback:", JSON.stringify(payload));

    try {
        const stkCallback = payload?.Body?.stkCallback;
        if (!stkCallback) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

        const ordersSnap = await adminDb
            .collection('orders')
            .where('checkoutRequestId', '==', CheckoutRequestID)
            .limit(1)
            .get();

        if (ordersSnap.empty) {
            console.warn(`Order not found for CheckoutRequestID: ${CheckoutRequestID}`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const orderDoc = ordersSnap.docs[0];
        const orderData = orderDoc.data();
        const orderRef = orderDoc.ref;

        if (orderData.paymentStatus === 'Paid') {
            console.log(`Idempotent skip — order ${orderDoc.id} already Paid`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const callbackEventId = `${CheckoutRequestID}-${ResultCode}`;
        if (orderData.lastCallbackEventId === callbackEventId) {
            console.log(`Idempotent skip — duplicate callback for ${callbackEventId}`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        if (ResultCode === 0) {
            const items = (CallbackMetadata?.Item || []) as Array<{ Name: string; Value: any }>;
            const findVal = (name: string) => items.find(i => i.Name === name)?.Value;

            const mpesaReceiptNumber = String(findVal('MpesaReceiptNumber') || '');
            const amountPaid = Number(findVal('Amount') || 0);
            const phoneNumber = String(findVal('PhoneNumber') || '');
            const transactionDate = String(findVal('TransactionDate') || '');
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
                stockReservationStatus: 'committed',
                lastCallbackEventId: callbackEventId,
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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

            // Fire-and-forget customer notification — don't block the Safaricom ack
            try {
                const orderForTpl = {
                    ...orderData,
                    id: orderDoc.id,
                    paymentMethod: 'M-Pesa',
                    mpesaReceiptNumber,
                    amountPaid,
                } as any;
                const tpl = CommunicationTemplates.getPaymentReceived(orderForTpl, {
                    receipt: mpesaReceiptNumber,
                    method: 'M-Pesa',
                });
                const customerPhone = phoneNumber || orderData.phone;
                if (customerPhone) sendServerSms(customerPhone, tpl.smsBody).catch(() => { });
                if (orderData.userEmail) sendServerEmail(orderData.userEmail, tpl.subject, tpl.emailBody).catch(() => { });
            } catch (e) {
                console.warn('Payment-received notification failed (non-fatal):', e);
            }
        } else {
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
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
}
