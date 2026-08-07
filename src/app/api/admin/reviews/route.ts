import { FieldPath } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

type Cursor = { at: string; id: string };
const encodeReview = (value: Cursor) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decodeReview = (value: string | null): Cursor | null => { try { const parsed = JSON.parse(Buffer.from(value || "", "base64url").toString()); return parsed && typeof parsed.at === "string" ? parsed : null; } catch { return null; } };
const reviewIso = (value: unknown) => value && typeof value === "object" && "toDate" in value ? (value as { toDate: () => Date }).toDate().toISOString() : String(value || "");

export async function GET(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams; const status = ["pending", "approved", "rejected"].includes(params.get("status") || "") ? params.get("status") : "all"; const cursor = decodeReview(params.get("cursor"));
  let query = adminDb.collection("reviews").orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(75); if (cursor) query = query.startAfter(new Date(cursor.at), cursor.id);
  const reviews: Record<string, unknown>[] = []; let current = cursor; let scanned = 0; let exhausted = false;
  while (reviews.length <= 20 && scanned < 400 && !exhausted) { if (current && scanned > 0) query = adminDb.collection("reviews").orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").startAfter(new Date(current.at), current.id).limit(75); const snapshot = await query.get(); scanned += snapshot.size; if (snapshot.empty) { exhausted = true; break; } for (const document of snapshot.docs) { const data = document.data(); current = { at: reviewIso(data.createdAt), id: document.id }; if (status !== "all" && data.status !== status) continue; reviews.push({ id: document.id, ...data, createdAt: reviewIso(data.createdAt), date: data.date || reviewIso(data.createdAt) }); if (reviews.length > 20) break; } exhausted = snapshot.size < 75; }
  const page = reviews.slice(0, 20); const last = page.at(-1);
  return NextResponse.json({ success: true, reviews: page, nextCursor: last && (reviews.length > 20 || !exhausted) ? encodeReview({ at: String(last.createdAt), id: String(last.id) }) : null });
}

const reviewSchema = z.object({ reviewId: z.string().min(1).max(180), status: z.enum(["approved", "rejected"]), moderationNote: z.string().trim().max(500).optional() });
export async function POST(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage"); if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid review decision." }, { status: 400 });
  const ref = adminDb.collection("reviews").doc(parsed.data.reviewId); const snapshot = await ref.get(); if (!snapshot.exists) return NextResponse.json({ success: false, message: "Review not found." }, { status: 404 });
  const now = new Date().toISOString(); const update = { status: parsed.data.status, moderationNote: parsed.data.moderationNote || null, moderatedAt: now, moderatedBy: actor.uid };
  const batch = adminDb.batch(); batch.update(ref, update); batch.set(adminDb.collection("adminAuditLog").doc(), { action: "review_moderated", actorId: actor.uid, actorEmail: actor.email || null, targetId: ref.id, before: { status: snapshot.data()?.status || "pending" }, after: update, createdAt: now }); await batch.commit();
  return NextResponse.json({ success: true });
}
