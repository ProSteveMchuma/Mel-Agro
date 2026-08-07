import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { DEFAULT_AUTOMATION_RULES, AutomationRule } from '@/lib/automation-rules';

const millis = (value: unknown) => {
  if (typeof value === 'string') return Date.parse(value);
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') return (value as { toMillis: () => number }).toMillis();
  return 0;
};
const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);

export async function loadAutomationRules(): Promise<AutomationRule[]> {
  const snapshot = await adminDb.collection('automationRules').get();
  const stored = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
  return DEFAULT_AUTOMATION_RULES.map((fallback) => ({ ...fallback, ...(stored.get(fallback.key) || {}), key: fallback.key } as AutomationRule));
}

export async function runAutomations(actor: string) {
  const rules = (await loadAutomationRules()).filter((rule) => rule.enabled);
  const [ordersSnap, productsSnap, cartsSnap] = await Promise.all([
    adminDb.collection('orders').orderBy('date', 'desc').limit(1500).get(),
    adminDb.collection('products').limit(1000).get(),
    adminDb.collection('carts').limit(750).get(),
  ]);
  const now = Date.now();
  const candidates: Array<{ id: string; type: string; severity: string; title: string; summary: string; recommendedAction: string; entityId: string; automationKey: string; automationMode: string }> = [];
  for (const rule of rules) {
    if (rule.key === 'payment_recovery') ordersSnap.docs.forEach((doc) => { const data = doc.data(); const age = (now - millis(data.date || data.createdAt)) / 60000; if (data.paymentStatus !== 'Paid' && data.status === 'Pending Payment' && age >= rule.threshold) candidates.push({ id: safeId(`auto_payment_${doc.id}`), type: 'payment_recovery', severity: age >= rule.threshold * 4 ? 'critical' : 'warning', title: `Order ${doc.id.slice(0, 10)} awaiting payment`, summary: `Payment has been pending for ${Math.floor(age)} minutes.`, recommendedAction: 'Review the payment attempt and send a reminder only if the customer contact is valid.', entityId: doc.id, automationKey: rule.key, automationMode: rule.mode }); });
    if (rule.key === 'low_stock') productsSnap.docs.forEach((doc) => { const data = doc.data(); const stock = Number(data.stockQuantity || 0); if (data.archived !== true && stock <= rule.threshold) candidates.push({ id: safeId(`auto_stock_${doc.id}`), type: 'stock', severity: stock === 0 ? 'critical' : 'warning', title: `${data.name || doc.id}: ${stock === 0 ? 'out of stock' : 'low stock'}`, summary: `${stock} units remain; automation threshold is ${rule.threshold}.`, recommendedAction: 'Review recent demand and create a replenishment order.', entityId: doc.id, automationKey: rule.key, automationMode: rule.mode }); });
    if (rule.key === 'fulfillment_delay') ordersSnap.docs.forEach((doc) => { const data = doc.data(); const age = (now - millis(data.processingAt || data.date)) / 3600000; if (data.status === 'Processing' && age >= rule.threshold) candidates.push({ id: safeId(`auto_fulfillment_${doc.id}`), type: 'fulfillment', severity: age >= rule.threshold * 2 ? 'critical' : 'warning', title: `Order ${doc.id.slice(0, 10)} fulfilment delayed`, summary: `${Math.floor(age)} hours in Processing; threshold is ${rule.threshold}.`, recommendedAction: 'Assign an owner and record the dispatch blocker.', entityId: doc.id, automationKey: rule.key, automationMode: rule.mode }); });
    if (rule.key === 'abandoned_cart') cartsSnap.docs.forEach((doc) => { const data = doc.data(); const age = (now - millis(data.updatedAt || data.lastUpdated || data.createdAt)) / 60000; const hasItems = Array.isArray(data.items) && data.items.length > 0; if (hasItems && data.cartRecoveryConsent === true && age >= rule.threshold) candidates.push({ id: safeId(`auto_cart_${doc.id}`), type: 'abandoned_cart', severity: 'warning', title: `Consented checkout recovery opportunity`, summary: `Cart has been inactive for ${Math.floor(age)} minutes and recovery consent is recorded.`, recommendedAction: 'Confirm no later purchase exists before approving a single recovery contact.', entityId: doc.id, automationKey: rule.key, automationMode: rule.mode }); });
  }
  const limitedCandidates = candidates.slice(0, 450);
  const batch = adminDb.batch(); const timestamp = new Date().toISOString();
  limitedCandidates.forEach((candidate) => batch.set(adminDb.collection('intelligence_alerts').doc(candidate.id), { ...candidate, status: 'new', source: 'automation', lastDetectedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), firstDetectedAt: FieldValue.serverTimestamp(), history: FieldValue.arrayUnion({ action: 'automation_detected', by: actor, at: timestamp }) }, { merge: true }));
  const runRef = adminDb.collection('automationRuns').doc();
  batch.set(runRef, { actor, rulesEvaluated: rules.map((rule) => rule.key), generated: limitedCandidates.length, truncated: candidates.length > limitedCandidates.length, sourceCounts: { orders: ordersSnap.size, products: productsSnap.size, carts: cartsSnap.size }, status: 'completed', createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { runId: runRef.id, generated: limitedCandidates.length, rulesEvaluated: rules.length, truncated: candidates.length > limitedCandidates.length, sourceCounts: { orders: ordersSnap.size, products: productsSnap.size, carts: cartsSnap.size } };
}
