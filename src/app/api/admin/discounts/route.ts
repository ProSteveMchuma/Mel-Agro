import { FieldPath } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

const createSchema = z.object({ action: z.literal("create"), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/), type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]), value: z.number().positive().max(1_000_000), minOrderValue: z.number().min(0).max(10_000_000), usageLimit: z.number().int().positive().max(1_000_000).nullable(), expiresAt: z.string().datetime() }).superRefine((data, context) => { if (data.type === "PERCENTAGE" && data.value > 100) context.addIssue({ code: "custom", message: "Percentage cannot exceed 100." }); });
const mutationSchema = z.union([createSchema, z.object({ action: z.enum(["activate", "deactivate", "archive"]), discountId: z.string().min(1).max(100) })]);
type Cursor = { at: string; id: string };
const encode = (value: Cursor) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = (value: string | null): Cursor | null => { try { const parsed = JSON.parse(Buffer.from(value || "", "base64url").toString()); return parsed && typeof parsed.at === "string" ? parsed : null; } catch { return null; } };
const iso = (value: unknown) => value && typeof value === "object" && "toDate" in value ? (value as { toDate: () => Date }).toDate().toISOString() : String(value || "");

export async function GET(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const cursor = decode(new URL(request.url).searchParams.get("cursor"));
  let query = adminDb.collection("discounts").orderBy("expiresAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(40);
  if (cursor) query = query.startAfter(new Date(cursor.at), cursor.id);
  const snapshot = await query.get(); const page = snapshot.docs.filter((document) => document.data().archived !== true).slice(0, 20);
  const discounts = page.map((document) => ({ id: document.id, ...document.data(), expiresAt: iso(document.data().expiresAt), createdAt: iso(document.data().createdAt) }));
  const last = page.at(-1);
  return NextResponse.json({ success: true, discounts, nextCursor: snapshot.size >= 40 && last ? encode({ at: iso(last.data().expiresAt), id: last.id }) : null });
}

export async function POST(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid discount request." }, { status: 400 });
  const input = parsed.data; const now = new Date();
  if (input.action === "create") {
    const expiry = new Date(input.expiresAt);
    if (expiry <= now || expiry.getTime() > now.getTime() + 2 * 365 * 86400000) return NextResponse.json({ success: false, message: "Expiry must be in the future and within two years." }, { status: 400 });
    const ref = adminDb.collection("discounts").doc(input.code);
    try { await adminDb.runTransaction(async (transaction) => { const existing = await transaction.get(ref); if (existing.exists) throw new Error("DUPLICATE"); transaction.create(ref, { code: input.code, type: input.type, value: input.value, minOrderValue: input.minOrderValue, usageLimit: input.usageLimit, usedCount: 0, expiresAt: expiry, isActive: true, archived: false, createdAt: now, createdBy: actor.uid }); transaction.set(adminDb.collection("adminAuditLog").doc(), { action: "discount_created", actorId: actor.uid, actorEmail: actor.email || null, targetId: ref.id, after: { code: input.code, type: input.type, value: input.value, minOrderValue: input.minOrderValue, usageLimit: input.usageLimit, expiresAt: expiry.toISOString() }, createdAt: now.toISOString() }); }); }
    catch (error) { if (error instanceof Error && error.message === "DUPLICATE") return NextResponse.json({ success: false, message: "That discount code already exists." }, { status: 409 }); throw error; }
    return NextResponse.json({ success: true });
  }
  const ref = adminDb.collection("discounts").doc(input.discountId); const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ success: false, message: "Discount not found." }, { status: 404 });
  const update = input.action === "archive" ? { archived: true, isActive: false, archivedAt: now.toISOString() } : { isActive: input.action === "activate", updatedAt: now.toISOString() };
  const batch = adminDb.batch(); batch.update(ref, update); batch.set(adminDb.collection("adminAuditLog").doc(), { action: `discount_${input.action}`, actorId: actor.uid, actorEmail: actor.email || null, targetId: ref.id, before: { isActive: snapshot.data()?.isActive, archived: snapshot.data()?.archived || false }, after: update, createdAt: now.toISOString() }); await batch.commit();
  return NextResponse.json({ success: true });
}
