import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';

export async function POST(request: Request) {
    const ipCheck = verifySafaricomCallback(request);
    if (!ipCheck.ok) {
        console.warn(`C2B Confirmation REJECTED — ${ipCheck.reason}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    let payload: any;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    console.log('C2B Confirmation:', JSON.stringify(payload));

    try {
        const {
            TransactionType,
            TransID,
            TransAmount,
            BusinessShortCode,
            BillRefNumber,
            InvoiceNumber,
            OrgAccountBalance,
            ThirdPartyTransID,
            MSISDN,
            FirstName,
            MiddleName,
            LastName,
            TransTime,
        } = payload || {};

        if (!TransID) {
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const dupSnap = await adminDb
            .collection('c2bPayments')
            .where('transID', '==', TransID)
            .limit(1)
            .get();
        if (!dupSnap.empty) {
            console.log(`C2B idempotent skip — TransID ${TransID} already recorded`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const amount = Number(TransAmount) || 0;
        const phone = String(MSISDN || '').replace(/\D/g, '');
        const billRef = String(BillRefNumber || '').trim();

        let matchedOrderId: string | null = null;
        let matchReason: string | null = null;

        if (billRef) {
            try {
                const direct = await adminDb.collection('orders').doc(billRef).get();
                if (direct.exists && direct.data()?.paymentStatus !== 'Paid') {
                    matchedOrderId = direct.id;
                    matchReason = 'BillRefNumber=fullOrderId';
                }
            } catch { /* ignore */ }

            if (!matchedOrderId) {
                const prefixSnap = await adminDb
                    .collection('orders')
                    .where('paymentStatus', 'in', ['Unpaid', 'Failed', 'Pending Verification'])
                    .limit(50)
                    .get();
                for (const d of prefixSnap.docs) {
                    if (d.id.toLowerCase().startsWith(billRef.toLowerCase()) ||
                        d.id.toLowerCase().slice(0, 8) === billRef.toLowerCase()) {
                        matchedOrderId = d.id;
                        matchReason = 'BillRefNumber=orderIdPrefix';
                        break;
                    }
                }
            }
        }

        if (!matchedOrderId && phone && amount) {
            const phoneVariants = [phone, '0' + phone.slice(-9), '+' + phone, phone.slice(-9)];
            const candidates = await adminDb
                .collection('orders')
                .where('paymentStatus', 'in', ['Unpaid', 'Failed', 'Pending Verification'])
                .limit(50)
                .get();
            for (const d of candidates.docs) {
                const data = d.data();
                const orderPhone = String(data.phone || '').replace(/\D/g, '');
                const orderTotal = Number(data.total) || 0;
                const phoneMatches = phoneVariants.some(v => v.replace(/\D/g, '') === orderPhone || orderPhone.endsWith(v.replace(/\D/g, '').slice(-9)));
                const amountMatches = Math.abs(orderTotal - amount) < 1;
                if (phoneMatches && amountMatches) {
                    matchedOrderId = d.id;
                    matchReason = 'Phone+Amount';
                    break;
                }
            }
        }

        await adminDb.collection('c2bPayments').add({
            transID: TransID,
            transactionType: TransactionType || null,
            amount,
            shortCode: String(BusinessShortCode || ''),
            billRefNumber: billRef,
            invoiceNumber: InvoiceNumber || null,
            orgAccountBalance: OrgAccountBalance || null,
            thirdPartyTransID: ThirdPartyTransID || null,
            phone,
            firstName: FirstName || null,
            middleName: MiddleName || null,
            lastName: LastName || null,
            transTime: TransTime || null,
            matchedOrderId,
            matchReason,
            status: matchedOrderId ? 'Matched' : 'Unmatched',
            recordedAt: new Date().toISOString(),
            raw: payload,
        });

        if (matchedOrderId) {
            const orderRef = adminDb.collection('orders').doc(matchedOrderId);
            const orderSnap = await orderRef.get();
            const orderData = orderSnap.data();

            if (orderData?.paymentStatus !== 'Paid') {
                await orderRef.update({
                    paymentStatus: 'Paid',
                    paymentMethod: 'M-Pesa Till (C2B)',
                    transactionId: TransID,
                    mpesaReceiptNumber: TransID,
                    mpesaPhoneNumber: phone,
                    mpesaTransactionDate: TransTime || null,
                    amountPaid: amount,
                    status: orderData?.status === 'Pending Payment' || !orderData?.status ? 'Processing' : orderData.status,
                    stockReservationStatus: 'committed',
                    paidAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    paymentResolvedVia: `C2B_AUTO_${matchReason}`,
                });

                await adminDb.collection('transactions').add({
                    orderId: matchedOrderId,
                    userId: orderData?.userId || null,
                    amount,
                    receipt: TransID,
                    phone,
                    method: 'M-Pesa Till (C2B)',
                    date: new Date().toISOString(),
                    status: 'Success',
                    recordedBy: 'System (C2B Auto-Match)',
                    matchReason,
                });
            }
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.error('C2B Confirmation Error:', error);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
}
