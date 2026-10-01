import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { withActionUrls } from '@/lib/order-access';
import { notifyCustomer } from '@/lib/customer-notifications';
import { revalidateStorefrontCatalogue } from '@/lib/revalidate-catalogue';
import { linesFromOrderItems, writeStockIncrease } from '@/lib/stock-restore';
import { shouldReleaseUnpaidReservation, shouldSendScheduledPaymentReminder } from '@/lib/commerce-ops';
import { sendServerSms } from '@/lib/server-notifications';
import { productSeoPath } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

function numberOrZero(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

const RELEASE_ACTOR = 'cron:unpaid-reservation';

async function releaseOne(orderId: string, nowMs: number): Promise<boolean> {
    const orderRef = adminDb.collection('orders').doc(orderId);
    const outcome = await adminDb.runTransaction(async (transaction) => {
        const initial = await transaction.get(orderRef);
        if (!initial.exists) return null;
        const order = initial.data() || {};
        if (!shouldReleaseUnpaidReservation(order, nowMs)) return null;

        const items = Array.isArray(order.items) ? order.items : [];
        const lines = linesFromOrderItems(items);
        const productIds = [...new Set(lines.map((line) => line.productId))];
        const productRefs = productIds.map((id) => adminDb.collection('products').doc(id));
        const userRef = adminDb.collection('users').doc(String(order.userId || 'missing'));
        const discountRef = order.couponId ? adminDb.collection('discounts').doc(String(order.couponId)) : null;
        const usageRef = discountRef
            ? adminDb.collection('discountUsage').doc(`${order.userId}_${discountRef.id}`)
            : null;
        const readRefs = [userRef, ...productRefs, ...(discountRef ? [discountRef] : []), ...(usageRef ? [usageRef] : [])];
        const readSnaps = await transaction.getAll(...readRefs);
        const userSnap = readSnaps[0];
        const productSnaps = readSnaps.slice(1, 1 + productRefs.length);
        const discountSnap = discountRef ? readSnaps[1 + productRefs.length] : null;
        const usageSnap = usageRef ? readSnaps[1 + productRefs.length + (discountRef ? 1 : 0)] : null;
        const now = new Date(nowMs).toISOString();

        writeStockIncrease(transaction, productSnaps, lines, {
            orderId,
            updatedBy: `System (Cancellation by ${RELEASE_ACTOR})`,
            now,
            historyType: 'reservation_expired',
        });

        const pointsRedeemed = Math.max(0, numberOrZero(order.pointsRedeemed));
        if (pointsRedeemed > 0 && order.userId) {
            const currentPoints = userSnap.exists ? numberOrZero(userSnap.data()?.loyaltyPoints) : 0;
            transaction.set(userRef, { loyaltyPoints: currentPoints + pointsRedeemed, updatedAt: now }, { merge: true });
        }
        if (discountRef && discountSnap?.exists) {
            const currentUses = Math.max(0, numberOrZero(discountSnap.data()?.usedCount));
            transaction.update(discountRef, { usedCount: Math.max(0, currentUses - 1) });
            if (usageRef && usageSnap?.exists) transaction.delete(usageRef);
        }

        transaction.update(orderRef, {
            status: 'Cancelled',
            stockRestored: true,
            stockRestoredAt: now,
            stockReservationStatus: 'released',
            cancelledAt: now,
            cancelledBy: RELEASE_ACTOR,
            cancellationReason: 'Unpaid for 24 hours',
        });
        return { id: orderId, ...order, status: 'Cancelled' } as Record<string, any>;
    });

    if (!outcome) return false;
    try {
        const tpl = CommunicationTemplates.getStatusUpdate(await withActionUrls(outcome as any), 'Cancelled');
        await notifyCustomer({
            userId: outcome.userId,
            phone: outcome.mpesaPhoneNumber || outcome.phone,
            message: tpl.smsBody,
            orderId,
        });
    } catch (error) {
        console.warn('Expired reservation SMS failed (non-fatal):', error);
    }
    return true;
}

export async function releaseExpiredUnpaidReservations(now = Date.now()) {
    const snapshot = await adminDb.collection('orders').where('stockReservationStatus', '==', 'active').limit(40).get();
    let released = 0;
    for (const doc of snapshot.docs) {
        if (!shouldReleaseUnpaidReservation(doc.data(), now)) continue;
        if (await releaseOne(doc.id, now)) released += 1;
    }
    if (released > 0) revalidateStorefrontCatalogue();
    return { scanned: snapshot.size, released };
}

export async function sendScheduledPaymentReminders(now = Date.now()) {
    const snapshot = await adminDb.collection('orders').orderBy('date', 'desc').limit(250).get();
    let sent = 0;
    let skipped = 0;
    for (const doc of snapshot.docs) {
        const order = { id: doc.id, ...doc.data() } as Record<string, any>;
        if (!shouldSendScheduledPaymentReminder(order, now)) {
            skipped += 1;
            continue;
        }
        if (sent >= 25) break;
        const linked = await withActionUrls(order as any);
        const tpl = CommunicationTemplates.getPaymentReminder(linked);
        const phone = order.phone || order.mpesaPhoneNumber;
        const result = await notifyCustomer({
            userId: order.userId,
            phone,
            message: tpl.smsBody,
            orderId: doc.id,
        });
        const ok = result.sms.ok;
        await doc.ref.update({
            reminders: FieldValue.arrayUnion({
                sentAt: new Date(now).toISOString(),
                sentBy: 'cron:intelligence-maintenance',
                sentByEmail: null,
                channels: ok ? ['sms'] : [],
                results: { sms: { ok, ...(result.sms.reason ? { reason: result.sms.reason } : {}) } },
            }),
            reminderCount: FieldValue.increment(ok ? 1 : 0),
            ...(ok ? { lastReminderAt: new Date(now).toISOString() } : {}),
            updatedAt: new Date(now).toISOString(),
        });
        if (ok) sent += 1;
    }
    return { scanned: snapshot.size, sent, skipped };
}

/** One SMS per active waitlist row. Already-notified rows are left alone. */
export async function notifyBackInStock(product: { id: string; name: string }) {
    const snapshot = await adminDb.collection('stockAlertSubscriptions').where('productId', '==', product.id).limit(100).get();
    const link = `${SITE_URL}${productSeoPath({ id: product.id, name: product.name })}`;
    let sent = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.status !== 'active') continue;
        const phone = String(data.phone || '').trim();
        if (!phone) continue;
        const name = String(data.productName || product.name || 'This product');
        const result = await sendServerSms(phone, `${name} is back in stock at Mel-Agri. ${link}`);
        if (!result.ok) continue;
        await doc.ref.set({ status: 'notified', notifiedAt: new Date().toISOString() }, { merge: true });
        sent += 1;
    }
    return { sent, scanned: snapshot.size };
}
