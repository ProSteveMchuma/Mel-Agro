import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';

const viewSchema = z.object({ id: z.string().min(1).max(80), name: z.string().min(1).max(60), range: z.enum(['7d', '30d', '90d', '12m', 'all']), granularity: z.enum(['day', 'week', 'month']) });
const schema = z.object({ views: z.array(viewSchema).max(12), targets: z.object({ revenue: z.number().min(0).max(1_000_000_000), paidOrders: z.number().int().min(0).max(10_000_000), conversionRate: z.number().min(0).max(100) }) });

export async function GET(request: Request) {
  const actor = await requirePermission(request, 'analytics.view');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const snapshot = await adminDb.collection('adminAnalyticsPreferences').doc(actor.uid!).get();
  return NextResponse.json({ success: true, preferences: snapshot.exists ? snapshot.data() : { views: [], targets: { revenue: 0, paidOrders: 0, conversionRate: 0 } } });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, 'analytics.view');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid dashboard preferences.' }, { status: 400 });
  const now = new Date().toISOString();
  await adminDb.collection('adminAnalyticsPreferences').doc(actor.uid!).set({ ...parsed.data, updatedAt: now });
  return NextResponse.json({ success: true, preferences: parsed.data });
}
