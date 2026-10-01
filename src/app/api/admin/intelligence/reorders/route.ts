import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { notifyCustomer } from '@/lib/customer-notifications';
import { actionableReorders, buildReorderPredictions } from '@/lib/reorder-intelligence';
import { productSeoPath } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import { nairobiPlacedLabel } from '@/lib/order-admin';
import type { Order } from '@/types';

function reminderId(userId: string, productId: string) {
    return createHash('sha256').update(`${userId}:${productId}`).digest('hex').slice(0, 40);
}

function loadPaidOrders(limit = 2000) {
    return adminDb.collection('orders').orderBy('date', 'desc').limit(limit).get();
}

export async function GET(request: Request) {
    const auth = await requirePermission(request, 'analytics.view');
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    const snapshot = await loadPaidOrders();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
    const due = actionableReorders(buildReorderPredictions(orders)).filter((item) => item.confidence !== 'low').slice(0, 40);
    const phones = new Map<string, { name: string; phone: string }>();
    for (const order of orders) {
        if (order.paymentStatus !== 'Paid' || phones.has(order.userId)) continue;
        const phone = String((order as Order & { phone?: string; mpesaPhoneNumber?: string }).phone || (order as Order & { mpesaPhoneNumber?: string }).mpesaPhoneNumber || '');
        if (phone) phones.set(order.userId, { name: order.userName || 'Farmer', phone });
    }
    const refs = due.map((item) => adminDb.collection('reorderReminders').doc(reminderId(item.userId, item.productId)));
    const reminders = refs.length ? await adminDb.getAll(...refs) : [];
    const queue = due.map((item, index) => {
        const reminder = reminders[index]?.data();
        const contact = phones.get(item.userId);
        const alreadyReminded = reminder?.lastPurchasedAt === item.lastPurchasedAt;
        return {
            ...item,
            userName: contact?.name || item.userId,
            phone: contact?.phone || '',
            alreadyReminded,
            remindedAt: typeof reminder?.remindedAt === 'string' ? reminder.remindedAt : null,
        };
    });
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), scannedOrders: orders.length, queue });
}

export async function POST(request: Request) {
    const auth = await requirePermission(request, 'orders.manage');
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    if (!userId || !productId || userId.includes('/') || productId.includes('/')) {
        return NextResponse.json({ success: false, message: 'A customer and product are required.' }, { status: 400 });
    }
    const snapshot = await loadPaidOrders();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
    const match = actionableReorders(buildReorderPredictions(orders)).find((item) => item.userId === userId && item.productId === productId && item.confidence !== 'low');
    if (!match) return NextResponse.json({ success: false, message: 'That reorder is not due from paid history.' }, { status: 404 });
    const reminderRef = adminDb.collection('reorderReminders').doc(reminderId(userId, productId));
    const existing = await reminderRef.get();
    if (existing.data()?.lastPurchasedAt === match.lastPurchasedAt) {
        return NextResponse.json({ success: false, message: 'A reminder was already sent for this purchase cycle.' }, { status: 409 });
    }
    const latest = orders.find((order) => order.userId === userId && order.paymentStatus === 'Paid');
    const phone = String((latest as Order & { phone?: string; mpesaPhoneNumber?: string } | undefined)?.phone
        || (latest as Order & { mpesaPhoneNumber?: string } | undefined)?.mpesaPhoneNumber
        || '');
    if (!phone) return NextResponse.json({ success: false, message: 'No phone on the latest paid order.' }, { status: 409 });
    const name = latest?.userName || 'Farmer';
    const when = nairobiPlacedLabel(match.lastPurchasedAt).split(',')[0];
    const link = `${SITE_URL}${productSeoPath({ id: match.productId, name: match.productName })}`;
    const message = `Habari ${name}, you last bought ${match.productName} on ${when}. Reorder: ${link}`;
    const sent = await notifyCustomer({ userId, phone, message, type: 'system' });
    if (!sent.sms.ok) return NextResponse.json({ success: false, message: sent.sms.reason || 'SMS could not be sent' }, { status: 502 });
    await reminderRef.set({
        userId,
        productId,
        productName: match.productName,
        lastPurchasedAt: match.lastPurchasedAt,
        remindedAt: new Date().toISOString(),
        remindedBy: auth.email || auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ success: true });
}
