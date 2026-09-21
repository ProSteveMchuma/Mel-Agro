import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { withActionUrls } from '@/lib/order-access';
import { customerNotifyContact, notifyCustomer } from '@/lib/customer-notifications';
import { recordPaidPurchase } from '@/lib/purchase-analytics';

export async function notifyCustomerPaymentReceived(args: {
    orderId: string;
    order: Record<string, any>;
    receipt?: string;
    phone?: string;
    method?: string;
    force?: boolean;
}): Promise<{ sms: { ok: boolean; reason?: string } }> {
    const order = args.order || {};
    try {
        await recordPaidPurchase({
            orderId: args.orderId,
            order: { ...order, paymentStatus: 'Paid' },
        });
    } catch (error) {
        console.warn('Could not record purchase analytics:', error);
    }
    if (!args.force && order.paymentSmsSentAt) {
        return { sms: { ok: true, reason: 'already-sent' } };
    }

    const contact = customerNotifyContact(order, args.phone);
    const receipt = args.receipt || order.mpesaReceiptNumber || order.transactionId || '';
    const method = args.method || order.paymentMethod || 'M-Pesa';
    const tpl = CommunicationTemplates.getPaymentReceived(
        withActionUrls({
            ...order,
            id: args.orderId,
            paymentMethod: method,
            mpesaReceiptNumber: receipt,
            amountPaid: order.amountPaid || order.total,
        } as any),
        { receipt, method },
    );

    const result = await notifyCustomer({
        userId: contact.userId,
        phone: contact.phone,
        message: tpl.smsBody,
        orderId: args.orderId,
        skipDashboard: Boolean(args.force && order.paymentDashboardSentAt),
    });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
        updatedAt: now,
        paymentSmsLastAttemptAt: now,
        paymentSmsLastError: result.sms.ok ? null : (result.sms.reason || 'SMS send failed'),
    };
    if (result.dashboard) {
        update.paymentDashboardSentAt = now;
    }
    if (result.sms.ok && result.sms.reason !== 'already-sent') {
        update.paymentSmsSentAt = now;
    }

    await adminDb.collection('orders').doc(args.orderId).update(update).catch((error) => {
        console.warn('Could not store payment SMS status:', error);
    });

    return { sms: result.sms };
}
