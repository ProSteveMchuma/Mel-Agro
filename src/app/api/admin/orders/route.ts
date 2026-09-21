import { FieldPath } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { notifyCustomerPaymentReceived } from '@/lib/payment-notifications';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { withActionUrls } from '@/lib/order-access';
import { notifyCustomer } from '@/lib/customer-notifications';

const PAGE_SIZE = 20;
const statusValues = new Set(['Pending Payment', 'Processing', 'Shipped', 'Delivered', 'Ready for Collection', 'Collected', 'Cancelled']);
const paymentValues = new Set(['Paid', 'Unpaid', 'Failed']);
type Cursor = { value: string | number; id: string };
const encode = (cursor: Cursor) => Buffer.from(JSON.stringify(cursor)).toString('base64url');
const decode = (value: string | null): Cursor | null => { try { const parsed = JSON.parse(Buffer.from(value || '', 'base64url').toString()); return parsed && typeof parsed.id === 'string' ? parsed : null; } catch { return null; } };
const includes = (data: Record<string, unknown>, id: string, term: string) => [id, data.userId, data.userName, data.userEmail, data.phone, data.transactionId].some((value) => String(value || '').toLowerCase().includes(term));

export async function GET(request: Request) {
  const actor = await requirePermission(request, 'orders.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const status = statusValues.has(params.get('status') || '') ? params.get('status') : null;
  const payment = paymentValues.has(params.get('payment') || '') ? params.get('payment') : null;
  const search = (params.get('q') || '').trim().toLowerCase().slice(0, 120);
  const view = ['attention', 'unfulfilled', 'unpaid', 'completed'].includes(params.get('view') || '') ? params.get('view') : 'all';
  const sort = ['oldest', 'highest', 'lowest'].includes(params.get('sort') || '') ? params.get('sort')! : 'newest';
  const field = sort === 'highest' || sort === 'lowest' ? 'total' : 'date';
  const direction = sort === 'oldest' || sort === 'lowest' ? 'asc' : 'desc';
  let cursor = decode(params.get('cursor'));
  const matches: Array<{ id: string; [key: string]: unknown }> = [];
  let scanned = 0; let exhausted = false;
  while (matches.length <= PAGE_SIZE && scanned < 500 && !exhausted) {
    let query = adminDb.collection('orders').orderBy(field, direction as 'asc' | 'desc').orderBy(FieldPath.documentId(), direction as 'asc' | 'desc').limit(75);
    if (cursor) query = query.startAfter(cursor.value, cursor.id);
    const snapshot = await query.get();
    if (snapshot.empty) { exhausted = true; break; }
    scanned += snapshot.size;
    for (const doc of snapshot.docs) {
      const data = doc.data(); const value = field === 'total' ? Number(data.total || 0) : String(data.date || '');
      cursor = { value, id: doc.id };
      const paymentMatches = !payment || (payment === 'Unpaid' ? data.paymentStatus !== 'Paid' : data.paymentStatus === payment);
      const viewMatches = view === 'all' || (view === 'attention' && (data.status === 'Pending Payment' || data.paymentStatus === 'Failed')) || (view === 'unfulfilled' && (data.status === 'Processing' || data.status === 'Ready for Collection' || data.status === 'Shipped')) || (view === 'unpaid' && data.paymentStatus !== 'Paid') || (view === 'completed' && (data.status === 'Delivered' || data.status === 'Collected'));
      if (viewMatches && (!status || data.status === status) && paymentMatches && (!search || includes(data, doc.id, search))) matches.push({ id: doc.id, ...data });
      if (matches.length > PAGE_SIZE) break;
    }
    exhausted = exhausted || snapshot.size < 75;
  }
  const hasMore = matches.length > PAGE_SIZE || !exhausted;
  const orders = matches.slice(0, PAGE_SIZE);
  const last = orders.at(-1); const nextCursor = last ? encode({ value: field === 'total' ? Number(last.total || 0) : String(last.date || ''), id: last.id }) : null;
  return NextResponse.json({ success: true, orders, nextCursor: hasMore ? nextCursor : null, hasMore, scanned, searchLimited: Boolean(search && scanned >= 500) });
}

const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_processing'), orderId: z.string().min(1).max(200) }),
  z.object({ action: z.literal('payment_status'), orderId: z.string().min(1).max(200), paymentStatus: z.enum(['Paid', 'Unpaid']), transaction: z.object({ amount: z.number().positive().max(100_000_000), reference: z.string().trim().min(3).max(200), date: z.string().datetime(), method: z.string().trim().min(2).max(80) }).optional() }),
]);

export async function POST(request: Request) {
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid order update.' }, { status: 400 });
  const input = parsed.data; const actor = await requirePermission(request, input.action === 'payment_status' ? 'payments.manage' : 'orders.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  try {
    const outcome = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection('orders').doc(input.orderId); const orderSnapshot = await transaction.get(orderRef); if (!orderSnapshot.exists) throw new Error('ORDER_NOT_FOUND');
      const order = orderSnapshot.data() || {}; const now = new Date().toISOString();
      if (input.action === 'start_processing') {
        if (order.status !== 'Pending Payment' || order.paymentStatus !== 'Paid') throw new Error('INVALID_TRANSITION');
        transaction.update(orderRef, { status: 'Processing', processingAt: now, updatedAt: now, statusHistory: FieldValue.arrayUnion({ status: 'Processing', at: now, by: actor.email || actor.uid }) });
        transaction.set(adminDb.collection('adminAuditLog').doc(), { action: 'order_processing_started', actorId: actor.uid, actorEmail: actor.email || null, targetId: input.orderId, before: { status: order.status }, after: { status: 'Processing' }, createdAt: now });
        return { kind: 'processing' as const, order: { id: input.orderId, ...order, status: 'Processing' } as Record<string, any> };
      }
      if (input.paymentStatus === 'Paid' && !input.transaction) throw new Error('TRANSACTION_REQUIRED');
      const update: Record<string, unknown> = { paymentStatus: input.paymentStatus, updatedAt: now };
      if (input.paymentStatus === 'Paid' && input.transaction) {
        update.stockReservationStatus = 'committed';
        update.paidAt = now;
        update.transactionId = input.transaction.reference;
        update.paymentMethod = input.transaction.method;
        transaction.set(adminDb.collection('transactions').doc(), { orderId: input.orderId, amount: input.transaction.amount, reference: input.transaction.reference, method: input.transaction.method, date: input.transaction.date, status: 'Success', recordedBy: actor.uid, recordedAt: now });
      }
      transaction.update(orderRef, update); transaction.set(adminDb.collection('adminAuditLog').doc(), { action: 'order_payment_status_changed', actorId: actor.uid, actorEmail: actor.email || null, targetId: input.orderId, before: { paymentStatus: order.paymentStatus || 'Unpaid' }, after: { paymentStatus: input.paymentStatus, reference: input.transaction?.reference || null }, createdAt: now });
      return { kind: 'payment' as const };
    });
    if (outcome.kind === 'processing') {
      try {
        const tpl = CommunicationTemplates.getStatusUpdate(await withActionUrls(outcome.order as any), 'Processing');
        await notifyCustomer({
          userId: outcome.order.userId,
          phone: outcome.order.mpesaPhoneNumber || outcome.order.phone,
          message: tpl.smsBody,
          orderId: input.orderId,
        });
      } catch (error) {
        console.warn('Processing customer notification failed (non-fatal):', error);
      }
    }
    if (input.action === 'payment_status' && input.paymentStatus === 'Paid' && input.transaction) {
      const paidSnap = await adminDb.collection('orders').doc(input.orderId).get();
      void notifyCustomerPaymentReceived({
        orderId: input.orderId,
        order: { ...paidSnap.data(), amountPaid: input.transaction.amount, mpesaReceiptNumber: input.transaction.reference },
        receipt: input.transaction.reference,
        method: input.transaction.method,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) { const code = error instanceof Error ? error.message : ''; if (code === 'ORDER_NOT_FOUND') return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 }); if (code === 'INVALID_TRANSITION') return NextResponse.json({ success: false, message: 'Only a paid pending order can begin processing.' }, { status: 409 }); if (code === 'TRANSACTION_REQUIRED') return NextResponse.json({ success: false, message: 'Transaction details are required when manually marking an order paid.' }, { status: 400 }); throw error; }
}
