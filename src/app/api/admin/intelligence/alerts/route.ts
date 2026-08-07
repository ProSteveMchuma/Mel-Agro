import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { demandSpikes, paymentFailureClusters, refundWatch, slaBreaches, stockOutForecast } from '@/lib/operational-alerts';
import type { Order, Product } from '@/types';
import { classifyPaymentHealth, deliveryEtaAccuracy } from '@/lib/fulfillment-intelligence';

const statuses = ['new', 'acknowledged', 'assigned', 'in_progress', 'resolved', 'snoozed'] as const;

function safeId(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

export async function GET(request: Request) {
    const auth = await requirePermission(request, 'analytics.view');
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    const snapshot = await adminDb.collection('intelligence_alerts').orderBy('updatedAt', 'desc').limit(250).get();
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), alerts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
}

export async function POST(request: Request) {
    const auth = await requirePermission(request, 'analytics.view');
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    const [orderSnap, productSnap] = await Promise.all([
        adminDb.collection('orders').orderBy('date', 'desc').limit(1500).get(),
        adminDb.collection('products').limit(1000).get(),
    ]);
    const orders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
    const products = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    const candidates: Array<Record<string, unknown> & { id: string }> = [];

    for (const item of stockOutForecast(orders, products).filter(item => item.severity !== 'ok')) {
        candidates.push({ id: safeId(`stock_${item.productId}`), type: 'stock', severity: item.severity === 'out' ? 'critical' : item.severity, title: `${item.name}: ${item.severity === 'out' ? 'out of stock' : 'stock risk'}`, summary: Number.isFinite(item.daysOfCover) ? `${item.daysOfCover} days of cover at ${item.dailyVelocity} units/day` : `${item.stockQuantity} units available`, entityId: String(item.productId), recommendedAction: 'Review supplier lead time and create a replenishment order.', evidence: item });
    }
    for (const item of demandSpikes(orders, products)) {
        candidates.push({ id: safeId(`demand_${item.productId}`), type: 'demand', severity: item.daysOfCoverAtRecentVelocity <= 7 ? 'critical' : 'warning', title: `${item.name}: demand spike`, summary: `${Number.isFinite(item.multiplier) ? `${item.multiplier}×` : 'New'} recent demand pattern`, entityId: String(item.productId), recommendedAction: 'Validate the signal and review stock coverage.', evidence: item });
    }
    for (const item of paymentFailureClusters(orders).filter(item => item.failed24h >= 2 || item.failureRate24h >= 20)) {
        candidates.push({ id: safeId(`payment_${item.method}`), type: 'payment', severity: item.failureRate24h >= 40 ? 'critical' : 'warning', title: `${item.method}: payment failures`, summary: `${item.failed24h} failures in 24 hours (${item.failureRate24h.toFixed(1)}%)`, recommendedAction: 'Inspect provider health and the latest failed transactions.', evidence: item });
    }
    const paymentHealth = classifyPaymentHealth(orders);
    if (paymentHealth.kind !== 'healthy') candidates.push({ id: safeId(`payment_health_${paymentHealth.kind}`), type: 'payment', severity: paymentHealth.severity, title: paymentHealth.kind === 'provider_incident' ? 'Likely payment provider incident' : paymentHealth.kind === 'callback_delay' ? 'M-Pesa callbacks delayed' : 'Customer payment friction cluster', summary: paymentHealth.summary, recommendedAction: paymentHealth.kind === 'customer_friction' ? 'Review checkout guidance before escalating to the provider.' : 'Check provider status, credentials, callback reachability, and recent request logs.', evidence: paymentHealth });
    for (const item of slaBreaches(orders)) {
        candidates.push({ id: safeId(`sla_${item.orderId}`), type: 'fulfillment', severity: item.hoursSinceOrder >= 72 ? 'critical' : 'warning', title: `Order ${item.orderId.slice(0, 8)}: fulfillment overdue`, summary: `${item.hoursSinceOrder} hours in Processing`, entityId: item.orderId, recommendedAction: 'Assign the order and confirm its dispatch blocker.', evidence: item });
    }
    const refunds = refundWatch(orders);
    if (refunds.refundRate7d > 5) candidates.push({ id: 'refund_rate_7d', type: 'refund', severity: refunds.refundRate7d >= 10 ? 'critical' : 'warning', title: 'Refund rate above threshold', summary: `${refunds.refundRate7d.toFixed(1)}% refund rate over 7 days`, recommendedAction: 'Review refunded orders and identify the leading cause.', evidence: refunds });
    const eta = deliveryEtaAccuracy(orders);
    if (eta.deliveredOrders >= 5 && eta.onTimeRate < 80) candidates.push({ id: 'delivery_eta_accuracy', type: 'fulfillment', severity: eta.onTimeRate < 60 ? 'critical' : 'warning', title: 'Delivery ETA accuracy below target', summary: `${eta.onTimeRate.toFixed(1)}% of ${eta.deliveredOrders} timestamped deliveries were on time`, recommendedAction: 'Review the lowest-performing counties and update courier or zone estimates.', evidence: eta });

    const refs = candidates.map(candidate => adminDb.collection('intelligence_alerts').doc(candidate.id));
    const existing = refs.length ? await adminDb.getAll(...refs) : [];
    const batch = adminDb.batch();
    for (const [index, candidate] of candidates.entries()) {
        const ref = adminDb.collection('intelligence_alerts').doc(candidate.id);
        const isNew = !existing[index]?.exists;
        batch.set(ref, { ...candidate, ...(isNew ? { status: 'new', firstDetectedAt: FieldValue.serverTimestamp(), history: [{ action: 'detected', by: auth.uid, at: new Date().toISOString() }] } : {}), updatedAt: FieldValue.serverTimestamp(), lastDetectedAt: FieldValue.serverTimestamp(), sourceWindow: { orders: orders.length, products: products.length } }, { merge: true });
    }
    if (candidates.length) await batch.commit();
    return NextResponse.json({ success: true, generated: candidates.length, sourceWindow: { orders: orders.length, products: products.length } });
}

export async function PATCH(request: Request) {
    const auth = await requirePermission(request, 'analytics.view');
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? safeId(body.id) : '';
    if (!id || !statuses.includes(body.status)) return NextResponse.json({ success: false, message: 'Invalid alert update' }, { status: 400 });
    const update: Record<string, unknown> = {
        status: body.status,
        assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo.slice(0, 120) : '',
        resolutionReason: typeof body.resolutionReason === 'string' ? body.resolutionReason.slice(0, 500) : '',
        updatedAt: FieldValue.serverTimestamp(),
        history: FieldValue.arrayUnion({ action: body.status, by: auth.email || auth.uid, note: typeof body.note === 'string' ? body.note.slice(0, 500) : '', at: new Date().toISOString() }),
    };
    await adminDb.collection('intelligence_alerts').doc(id).set(update, { merge: true });
    return NextResponse.json({ success: true });
}
