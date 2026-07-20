import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';

export async function POST(request: Request) {
    const ipCheck = verifySafaricomCallback(request);
    if (!ipCheck.ok) {
        console.warn(`Status Result REJECTED — ${ipCheck.reason}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    let payload: any;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    console.log('TransactionStatus Result:', JSON.stringify(payload));

    try {
        const result = payload?.Result;
        if (!result) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const conversationId = result.ConversationID;
        const originatorConversationId = result.OriginatorConversationID;
        const resultCode = result.ResultCode;
        const resultDesc = result.ResultDesc;

        const params = (result.ResultParameters?.ResultParameter || []) as Array<{ Key: string; Value: any }>;
        const findVal = (key: string) => params.find(p => p.Key === key)?.Value;

        const receiptNo = String(findVal('ReceiptNo') || findVal('TransactionID') || '');
        const transactionAmount = Number(findVal('TransactionAmount') || findVal('Amount') || 0);
        const transactionStatus = String(findVal('TransactionStatus') || '');
        const initiatedTime = findVal('InitiatedTime');
        const debitPartyName = String(findVal('DebitPartyName') || '');
        const creditPartyName = String(findVal('CreditPartyName') || '');

        let querySnap = await adminDb
            .collection('orders')
            .where('statusQueryConversationId', '==', conversationId)
            .limit(1)
            .get();

        if (querySnap.empty && originatorConversationId) {
            querySnap = await adminDb
                .collection('orders')
                .where('statusQueryOriginatorConversationId', '==', originatorConversationId)
                .limit(1)
                .get();
        }

        if (querySnap.empty && receiptNo) {
            querySnap = await adminDb
                .collection('orders')
                .where('transactionId', '==', receiptNo)
                .limit(1)
                .get();
        }

        if (querySnap.empty) {
            console.warn(`Status result: order not found for ${conversationId}`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const orderRef = querySnap.docs[0].ref;
        const order: any = querySnap.docs[0].data();

        const isCompleted = resultCode === 0 && transactionStatus.toLowerCase() === 'completed';
        const amountMatches = Math.abs(transactionAmount - Number(order.total || 0)) < 1;

        const update: Record<string, any> = {
            statusQueryResultCode: String(resultCode),
            statusQueryResultDesc: resultDesc,
            statusQueryReceiptNo: receiptNo,
            statusQueryAmount: transactionAmount,
            statusQueryDebitParty: debitPartyName,
            statusQueryCreditParty: creditPartyName,
            statusQueryInitiatedTime: initiatedTime || null,
            statusQueryCompletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (isCompleted && amountMatches && order.paymentStatus !== 'Paid') {
            update.paymentStatus = 'Paid';
            update.paymentMethod = order.paymentMethod || 'M-Pesa Till (auto-verified)';
            update.transactionId = receiptNo;
            update.mpesaReceiptNumber = receiptNo;
            update.amountPaid = transactionAmount;
            update.status = order.status === 'Pending Payment' || !order.status ? 'Processing' : order.status;
            update.stockReservationStatus = 'committed';
            update.paidAt = new Date().toISOString();
            update.paymentResolvedVia = 'AUTO_VERIFY_TRANSACTION_STATUS';

            await adminDb.collection('transactions').add({
                orderId: querySnap.docs[0].id,
                userId: order.userId || null,
                amount: transactionAmount,
                receipt: receiptNo,
                method: 'M-Pesa Till (auto-verified)',
                date: new Date().toISOString(),
                status: 'Success',
                recordedBy: 'System (Daraja TransactionStatus)',
            });
        } else if (isCompleted && !amountMatches) {
            update.statusQueryWarning = `Amount mismatch — paid ${transactionAmount}, order total ${order.total}`;
        }

        await orderRef.update(update);

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.error('Status Result Error:', error);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
}
