import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export async function findOrderByCheckoutRequestId(checkoutRequestID: string) {
    if (!checkoutRequestID) return null;

    const exact = await adminDb
        .collection('orders')
        .where('checkoutRequestId', '==', checkoutRequestID)
        .limit(1)
        .get();
    if (!exact.empty) return exact.docs[0];

    const historic = await adminDb
        .collection('orders')
        .where('checkoutRequestIds', 'array-contains', checkoutRequestID)
        .limit(1)
        .get();
    if (!historic.empty) return historic.docs[0];

    return null;
}

export function checkoutRequestFields(checkoutRequestID: string) {
    return {
        checkoutRequestId: checkoutRequestID,
        checkoutRequestIds: FieldValue.arrayUnion(checkoutRequestID),
    };
}

export async function markOrderPaidWithReceipt(args: {
    orderId: string;
    order: DocumentData;
    receipt: string;
    amountPaid?: number;
    phone?: string;
    transactionDate?: string;
    paymentMethod: string;
    paymentResolvedVia: string;
    recordedBy: string;
    extraOrderFields?: Record<string, unknown>;
}) {
    const now = new Date().toISOString();
    const orderRef = adminDb.collection('orders').doc(args.orderId);
    const amountPaid = Number(args.amountPaid ?? args.order.total) || 0;

    await orderRef.update({
        paymentStatus: 'Paid',
        paymentMethod: args.paymentMethod,
        transactionId: args.receipt,
        mpesaReceiptNumber: args.receipt,
        ...(args.phone ? { mpesaPhoneNumber: args.phone } : {}),
        ...(args.transactionDate ? { mpesaTransactionDate: args.transactionDate } : {}),
        amountPaid,
        status: args.order.status === 'Pending Payment' || !args.order.status ? 'Processing' : args.order.status,
        processingAt: args.order.processingAt || now,
        stockReservationStatus: 'committed',
        paidAt: now,
        updatedAt: now,
        paymentFailureReason: null,
        paymentFailureCode: null,
        paymentFailureMessage: null,
        claimedMpesaReceipt: args.receipt,
        paymentResolvedVia: args.paymentResolvedVia,
        ...args.extraOrderFields,
    });

    await adminDb.collection('transactions').add({
        orderId: args.orderId,
        userId: args.order.userId || null,
        amount: amountPaid,
        receipt: args.receipt,
        phone: args.phone || args.order.phone || null,
        method: args.paymentMethod,
        date: now,
        status: 'Success',
        recordedBy: args.recordedBy,
    });
}
