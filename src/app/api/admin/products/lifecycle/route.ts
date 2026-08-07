import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

const schema = z.object({ productId: z.string().min(1).max(180), action: z.enum(["archive", "restore"]) });

export async function POST(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid product lifecycle request." }, { status: 400 });
  const ref = adminDb.collection("products").doc(parsed.data.productId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
  const archived = parsed.data.action === "archive";
  const now = new Date().toISOString();
  const batch = adminDb.batch();
  batch.update(ref, { archived, archivedAt: archived ? now : null, archivedBy: archived ? (actor.email || actor.uid) : null, updatedAt: now });
  batch.set(adminDb.collection("adminAuditLog").doc(), { action: archived ? "product_archived" : "product_restored", actorId: actor.uid, actorEmail: actor.email || null, targetId: parsed.data.productId, before: { archived: snapshot.data()?.archived === true }, after: { archived }, createdAt: now });
  await batch.commit();
  return NextResponse.json({ success: true, archived });
}
