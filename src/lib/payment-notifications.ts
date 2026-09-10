import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { sendServerEmail, sendServerSms } from '@/lib/server-notifications';
import { reportIncident } from '@/lib/incident-reporting';
import { paymentSmsPhone } from '@/lib/mpesa';

export async function notifyCustomerPaymentReceived(args: {
    orderId: string;
    order: Record<string, any>;
    receipt?: string;
    phone?: string;
    method?: string;
    force?: boolean;
}): Promise<{ sms: { ok: boolean; reason?: string } }> {
    const order = args.order || {};
    if (!args.force && order.paymentSmsSentAt) {
        return { sms: { ok: true, reason: 'already-sent' } };
    }

    const phone = paymentSmsPhone(order, args.phone);
    const receipt = args.receipt || order.mpesaReceiptNumber || order.transactionId || '';
    const method = args.method || order.paymentMethod || 'M-Pesa';
    const tpl = CommunicationTemplates.getPaymentReceived(
        {
            ...order,
            id: args.orderId,
            paymentMethod: method,
            mpesaReceiptNumber: receipt,
            amountPaid: order.amountPaid || order.total,
        } as any,
        { receipt, method },
    );

    const sms = phone
        ? await sendServerSms(phone, tpl.smsBody)
        : { ok: false, reason: 'No customer phone on the order' };

    if (order.userEmail) {
        await sendServerEmail(order.userEmail, tpl.subject, tpl.emailBody).catch(() => ({ ok: false }));
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
        updatedAt: now,
        paymentSmsLastAttemptAt: now,
        paymentSmsLastError: sms.ok ? null : (sms.reason || 'SMS send failed'),
    };
    if (sms.ok && sms.reason !== 'already-sent') {
        update.paymentSmsSentAt = now;
    }

    await adminDb.collection('orders').doc(args.orderId).update(update).catch((error) => {
        console.warn('Could not store payment SMS status:', error);
    });

    if (!sms.ok) {
        console.warn(`[payment-sms] order ${args.orderId} failed: ${sms.reason}`);
        void reportIncident({
            type: 'notification_failure',
            severity: 'warning',
            source: 'payment-sms',
            message: sms.reason || 'Payment SMS failed',
            metadata: { orderId: args.orderId },
        });
    }

    return { sms };
}
