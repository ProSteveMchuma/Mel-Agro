import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

const bannerSchema = z.object({ id: z.string().min(1).max(80), title: z.string().trim().min(1).max(100), subtitle: z.string().trim().max(180), description: z.string().trim().max(500).optional(), image: z.string().trim().url().refine((value) => value.startsWith("https://"), "Banner images must use HTTPS."), link: z.string().trim().max(500).refine((value) => value.startsWith("/") || value.startsWith("https://"), "Links must be internal paths or HTTPS URLs."), active: z.boolean() });
const contentSchema = z.object({ action: z.enum(["saveDraft", "publish"]), version: z.number().int().min(0), banners: z.array(bannerSchema).max(8) });

export async function GET(request: Request) {
  const actor = await requirePermission(request, "marketing.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const [live, draft] = await Promise.all([adminDb.collection("content").doc("homepage").get(), adminDb.collection("content").doc("homepageDraft").get()]);
  return NextResponse.json({ success: true, live: { banners: live.data()?.banners || [], version: Number(live.data()?.version || 0), publishedAt: live.data()?.publishedAt || null }, draft: { banners: draft.exists ? draft.data()?.banners || [] : live.data()?.banners || [], version: Number(draft.data()?.version || live.data()?.version || 0), updatedAt: draft.data()?.updatedAt || null } });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, "marketing.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = contentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid homepage content." }, { status: 400 });
  const input = parsed.data; const liveRef = adminDb.collection("content").doc("homepage"); const draftRef = adminDb.collection("content").doc("homepageDraft");
  try {
    const version = await adminDb.runTransaction(async (transaction) => {
      const [live, draft] = await Promise.all([transaction.get(liveRef), transaction.get(draftRef)]);
      const currentVersion = Number(draft.data()?.version ?? live.data()?.version ?? 0);
      if (currentVersion !== input.version) throw new Error("VERSION_CONFLICT");
      const nextVersion = currentVersion + 1; const now = new Date().toISOString();
      transaction.set(draftRef, { banners: input.banners, version: nextVersion, updatedAt: now, updatedBy: actor.uid }, { merge: true });
      if (input.action === "publish") transaction.set(liveRef, { banners: input.banners, version: nextVersion, publishedAt: now, publishedBy: actor.uid }, { merge: true });
      transaction.set(adminDb.collection("adminAuditLog").doc(), { action: input.action === "publish" ? "homepage_published" : "homepage_draft_saved", actorId: actor.uid, actorEmail: actor.email || null, targetId: "homepage", before: { version: currentVersion, bannerCount: draft.data()?.banners?.length ?? live.data()?.banners?.length ?? 0 }, after: { version: nextVersion, bannerCount: input.banners.length }, createdAt: now });
      return nextVersion;
    });
    return NextResponse.json({ success: true, version });
  } catch (error) { if (error instanceof Error && error.message === "VERSION_CONFLICT") return NextResponse.json({ success: false, message: "This draft changed in another session. Reload before saving." }, { status: 409 }); throw error; }
}
