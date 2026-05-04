import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';

export async function POST(request: Request) {
    const ipCheck = verifySafaricomCallback(request);
    if (!ipCheck.ok) {
        console.warn(`M-Pesa Reversal Result REJECTED — ${ipCheck.reason}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    let payload: any;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    console.log('M-Pesa Reversal Result:', JSON.stringify(payload));

    try {
        const result = payload?.Result;
        if (!result) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const conversationId = result.ConversationID;
        const originatorConversationId = result.OriginatorConversationID;
        const resultCode = result.ResultCode;
        const resultDesc = result.ResultDesc;

        let orderQuery = adminDb
            .collection('orders')
            .where('refundConversationId', '==', conversationId)
            .limit(1);

        let snap = await orderQuery.get();

        if (snap.empty && originatorConversationId) {
            snap = await adminDb
                .collection('orders')
                .where('refundOriginatorConversationId', '==', originatorConversationId)
                .limit(1)
                .get();
        }

        if (snap.empty) {
            console.warn(`Reversal result: order not found for ${conversationId}`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const orderRef = snap.docs[0].ref;
        const orderId = snap.docs[0].id;

        const status = resultCode === 0 ? 'Reversed' : 'Failed';

        await orderRef.update({
            refundStatus: status,
            refundResultCode: String(resultCode),
            refundResultDesc: resultDesc,
            refundCompletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...(status === 'Reversed' ? { paymentStatus: 'Refunded' } : {}),
        });

        const refundsSnap = await adminDb
            .collection('refunds')
            .where('conversationId', '==', conversationId)
            .limit(1)
            .get();
        if (!refundsSnap.empty) {
            await refundsSnap.docs[0].ref.update({
                status,
                resultCode: String(resultCode),
                resultDesc,
                completedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.error('Reversal Result Error:', error);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
}
