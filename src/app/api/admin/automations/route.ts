import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { AUTOMATION_KEYS, DEFAULT_AUTOMATION_RULES, normalizeAutomationRule } from '@/lib/automation-rules';
import { loadAutomationRules, runAutomations } from '@/lib/automation-engine';

export async function GET(request: Request) {
  const actor = await requirePermission(request, 'settings.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const [rules, runs] = await Promise.all([loadAutomationRules(), adminDb.collection('automationRuns').orderBy('createdAt', 'desc').limit(10).get()]);
  return NextResponse.json({ success: true, rules, runs: runs.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, 'settings.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const body = await request.json().catch(() => ({})); const key = body.key;
  if (!AUTOMATION_KEYS.includes(key)) return NextResponse.json({ success: false, message: 'Unknown automation rule.' }, { status: 400 });
  const fallback = DEFAULT_AUTOMATION_RULES.find((rule) => rule.key === key)!; const rule = normalizeAutomationRule(body, fallback); const now = new Date().toISOString();
  const batch = adminDb.batch(); batch.set(adminDb.collection('automationRules').doc(key), { ...rule, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.email || actor.uid }, { merge: true }); batch.set(adminDb.collection('adminAuditLog').doc(), { action: 'automation_rule_updated', actorId: actor.uid, actorEmail: actor.email || null, targetId: key, after: rule, createdAt: now }); await batch.commit();
  return NextResponse.json({ success: true, rule });
}

export async function POST(request: Request) {
  const actor = await requirePermission(request, 'settings.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  return NextResponse.json({ success: true, ...(await runAutomations(actor.email || actor.uid || 'admin')) });
}
