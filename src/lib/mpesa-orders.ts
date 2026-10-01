import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notifications';

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

function sanitizeReceiptDocId(receipt: string): string {
    const sanitized = String(receipt || '').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
    return sanitized.slice(0, 150) || 'UNKNOWN';
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
}): Promise<{ alreadyPaid: boolean }> {
    const orderRef = adminDb.collection('orders').doc(args.orderId);
    const amountPaid = Number(args.amountPaid ?? args.order.total) || 0;
    const transactionRef = adminDb.collection('transactions').doc(sanitizeReceiptDocId(args.receipt));

    const outcome = await adminDb.runTransaction(async transaction => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
            throw new Error('ORDER_NOT_FOUND');
        }

        const current = orderSnap.data() || {};
        if (current.paymentStatus === 'Paid') {
            // Idempotent no-op when already Paid (same or concurrent receipt write).
            return {
                alreadyPaid: true as const,
                order: current,
                amountPaid: Number(current.amountPaid ?? amountPaid) || amountPaid,
            };
        }

        const now = new Date().toISOString();
        const nextStatus =
            current.status === 'Pending Payment' || !current.status ? 'Processing' : current.status;

        transaction.update(orderRef, {
            paymentStatus: 'Paid',
            paymentMethod: args.paymentMethod,
            transactionId: args.receipt,
            mpesaReceiptNumber: args.receipt,
            ...(args.phone ? { mpesaPhoneNumber: args.phone } : {}),
            ...(args.transactionDate ? { mpesaTransactionDate: args.transactionDate } : {}),
            amountPaid,
            status: nextStatus,
            processingAt: current.processingAt || now,
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

        transaction.set(transactionRef, {
            orderId: args.orderId,
            userId: current.userId || args.order.userId || null,
            amount: amountPaid,
            receipt: args.receipt,
            phone: args.phone || current.phone || args.order.phone || null,
            method: args.paymentMethod,
            date: now,
            status: 'Success',
            recordedBy: args.recordedBy,
        }, { merge: true });

        return {
            alreadyPaid: false as const,
            order: { ...current, ...args.order },
            amountPaid,
        };
    });

    if (!outcome.alreadyPaid) {
        await notifyCustomerPaymentReceived({
            orderId: args.orderId,
            order: {
                ...outcome.order,
                amountPaid: outcome.amountPaid,
                mpesaReceiptNumber: args.receipt,
                paymentMethod: args.paymentMethod,
                phone: args.phone || outcome.order.phone || args.order.phone,
                mpesaPhoneNumber: args.phone || outcome.order.mpesaPhoneNumber || args.order.mpesaPhoneNumber,
            },
            receipt: args.receipt,
            phone: args.phone,
            method: args.paymentMethod,
        });
    }

    return { alreadyPaid: outcome.alreadyPaid };
}
