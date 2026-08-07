import { FieldPath } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

const updateSchema = z.object({ id: z.string().regex(/^[a-f0-9]{64}$/), status: z.enum(["active", "unsubscribed"]) });
type Cursor = { at: string; id: string };
const encode = (value: Cursor) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = (value: string | null): Cursor | null => { try { const parsed = JSON.parse(Buffer.from(value || "", "base64url").toString()); return parsed && typeof parsed.at === "string" ? parsed : null; } catch { return null; } };
function csv(value: unknown) { let text = String(value ?? ""); if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; }

export async function GET(request: Request) {
  const actor = await requirePermission(request, "marketing.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  if (params.get("format") === "csv") {
    const snapshot = await adminDb.collection("newsletterSubscriptions").where("status", "==", "active").orderBy("updatedAt", "desc").limit(5000).get();
    const rows = snapshot.docs.map((document) => { const data = document.data(); return [data.email, data.status, data.source || "", data.subscribedAt || ""]; });
    const output = [["Email", "Status", "Source", "Subscribed at"], ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
    return new NextResponse(`\uFEFF${output}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="melagri-active-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`, "X-Content-Type-Options": "nosniff" } });
  }
  const search = (params.get("q") || "").trim().toLowerCase().slice(0, 120); const status = ["active", "unsubscribed"].includes(params.get("status") || "") ? params.get("status") : "all"; let cursor = decode(params.get("cursor"));
  const subscribers: Record<string, unknown>[] = []; let scanned = 0; let exhausted = false;
  while (subscribers.length <= 25 && scanned < 500 && !exhausted) { let query = adminDb.collection("newsletterSubscriptions").orderBy("updatedAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(75); if (cursor) query = query.startAfter(cursor.at, cursor.id); const snapshot = await query.get(); scanned += snapshot.size; if (snapshot.empty) { exhausted = true; break; } for (const document of snapshot.docs) { const data = document.data(); cursor = { at: String(data.updatedAt || ""), id: document.id }; if (status !== "all" && data.status !== status) continue; if (search && !String(data.email || "").toLowerCase().includes(search)) continue; subscribers.push({ id: document.id, ...data }); if (subscribers.length > 25) break; } exhausted = snapshot.size < 75; }
  const page = subscribers.slice(0, 25); const last = page.at(-1);
  const [total, active] = await Promise.all([adminDb.collection("newsletterSubscriptions").count().get(), adminDb.collection("newsletterSubscriptions").where("status", "==", "active").count().get()]);
  return NextResponse.json({ success: true, subscribers: page, nextCursor: last && (subscribers.length > 25 || !exhausted) ? encode({ at: String(last.updatedAt || ""), id: String(last.id) }) : null, searchLimited: Boolean(search && scanned >= 500), summary: { total: total.data().count, active: active.data().count, unsubscribed: total.data().count - active.data().count } });
}

export async function PATCH(request: Request) {
  const actor = await requirePermission(request, "marketing.manage"); if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid subscriber update." }, { status: 400 });
  const ref = adminDb.collection("newsletterSubscriptions").doc(parsed.data.id); const snapshot = await ref.get(); if (!snapshot.exists) return NextResponse.json({ success: false, message: "Subscriber not found." }, { status: 404 });
  const now = new Date().toISOString(); const batch = adminDb.batch(); batch.set(ref, { status: parsed.data.status, updatedAt: now, statusUpdatedAt: now, statusUpdatedBy: actor.email || actor.uid }, { merge: true }); batch.set(adminDb.collection("adminAuditLog").doc(), { action: "newsletter_consent_status_changed", actorId: actor.uid, actorEmail: actor.email || null, targetId: ref.id, before: { status: snapshot.data()?.status || null }, after: { status: parsed.data.status }, createdAt: now }); await batch.commit();
  return NextResponse.json({ success: true, status: parsed.data.status });
}
