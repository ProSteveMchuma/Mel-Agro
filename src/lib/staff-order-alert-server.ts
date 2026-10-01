import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { sendServerSms } from '@/lib/server-notifications';
import { resolveStaffOrderAlertPhone, staffOrderAlertMessage } from '@/lib/staff-order-alert';

type AlertOrder = Parameters<typeof staffOrderAlertMessage>[0] & { id?: string | null };

export async function sendStaffOrderAlert(orderId: string, order: AlertOrder): Promise<{ ok: boolean; reason?: string; phone: string }> {
    const orderRef = adminDb.collection('orders').doc(orderId);
    let phone = resolveStaffOrderAlertPhone(undefined);
    try {
        const settings = await adminDb.collection('settings').doc('notifications').get();
        phone = resolveStaffOrderAlertPhone(settings.data()?.staffOrderAlertPhone);
        const sent = await sendServerSms(phone, staffOrderAlertMessage({ ...order, id: orderId }));
        await orderRef.update({
            staffOrderAlert: {
                at: new Date().toISOString(),
                ok: sent.ok,
                reason: sent.ok ? null : (sent.reason || 'Could not send the staff alert'),
                phone,
            },
        });
        return { ok: sent.ok, reason: sent.reason, phone };
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Could not send the staff alert';
        console.warn('Staff order alert failed (non-fatal):', error);
        await orderRef.update({
            staffOrderAlert: {
                at: new Date().toISOString(),
                ok: false,
                reason,
                phone,
            },
        }).catch(() => undefined);
        return { ok: false, reason, phone };
    }
}
