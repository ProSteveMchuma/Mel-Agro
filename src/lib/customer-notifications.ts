import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { sendServerSms } from '@/lib/server-notifications';
import { paymentSmsPhone } from '@/lib/mpesa';
import { reportIncident } from '@/lib/incident-reporting';

export async function writeCustomerDashboardNotification(args: {
    userId?: string | null;
    message: string;
    type?: 'order' | 'system';
    orderId?: string;
}): Promise<boolean> {
    const userId = String(args.userId || '').trim();
    const message = String(args.message || '').trim();
    if (!userId || !message) return false;

    await adminDb.collection('notifications').add({
        userId,
        message,
        date: new Date().toISOString(),
        read: false,
        type: args.type || 'order',
        ...(args.orderId ? { orderId: args.orderId } : {}),
    });
    return true;
}

/**
 * Customer-facing system notification: SMS first, then the same message on the
 * dashboard. Email is intentionally skipped until that channel is connected.
 */
export async function notifyCustomer(args: {
    userId?: string | null;
    phone?: string | null;
    message: string;
    type?: 'order' | 'system';
    orderId?: string;
    skipDashboard?: boolean;
    skipSms?: boolean;
}): Promise<{ sms: { ok: boolean; reason?: string }; dashboard: boolean }> {
    const message = String(args.message || '').trim();
    if (!message) return { sms: { ok: false, reason: 'Missing message' }, dashboard: false };

    let dashboard = false;
    if (!args.skipDashboard) {
        try {
            dashboard = await writeCustomerDashboardNotification({
                userId: args.userId,
                message,
                type: args.type,
                orderId: args.orderId,
            });
        } catch (error) {
            console.warn('[customer-notify] dashboard write failed:', error);
        }
    }

    if (args.skipSms) {
        return { sms: { ok: true, reason: 'skipped' }, dashboard };
    }

    const phone = String(args.phone || '').trim();
    const sms = phone
        ? await sendServerSms(phone, message)
        : { ok: false, reason: 'No customer phone' };

    if (!sms.ok && sms.reason !== 'No customer phone') {
        console.warn(`[customer-sms]${args.orderId ? ` order ${args.orderId}` : ''} failed: ${sms.reason}`);
        void reportIncident({
            type: 'notification_failure',
            severity: 'warning',
            source: 'customer-sms',
            message: sms.reason || 'SMS failed',
            metadata: { orderId: args.orderId || null },
        });
    }

    return { sms, dashboard };
}

export function customerNotifyContact(
    order: { userId?: string; phone?: string; mpesaPhoneNumber?: string } | null | undefined,
    phoneOverride?: string,
) {
    return {
        userId: order?.userId || null,
        phone: paymentSmsPhone(order, phoneOverride),
    };
}
