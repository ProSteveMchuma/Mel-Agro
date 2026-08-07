import { FieldPath } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';

const PAGE_SIZE = 20;
const statusValues = new Set(['Pending Payment', 'Processing', 'Shipped', 'Delivered', 'Cancelled']);
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
      const viewMatches = view === 'all' || (view === 'attention' && (data.status === 'Pending Payment' || data.paymentStatus === 'Failed')) || (view === 'unfulfilled' && data.status === 'Processing') || (view === 'unpaid' && data.paymentStatus !== 'Paid') || (view === 'completed' && data.status === 'Delivered');
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
