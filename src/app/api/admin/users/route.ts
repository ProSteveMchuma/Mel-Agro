import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";

const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), userId: z.string().min(1).max(128), role: z.enum(["user", "admin"]) }),
  z.object({ action: z.literal("status"), userId: z.string().min(1).max(128), status: z.enum(["active", "suspended"]) }),
  z.object({ action: z.literal("delete"), userId: z.string().min(1).max(128) }),
  z.object({ action: z.literal("permissions"), userId: z.string().min(1).max(128), staffProfile: z.string().min(1).max(40), permissions: z.array(z.enum(ADMIN_PERMISSIONS)).max(ADMIN_PERMISSIONS.length) }),
]);

export async function POST(request: Request) {
  const actor = await requirePermission(request, "customers.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 401 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid user-management request." }, { status: 400 });

  const input = parsed.data;
  if (input.userId === actor.uid) return NextResponse.json({ success: false, message: "You cannot change or delete your own administrator account." }, { status: 400 });

  const ref = adminDb.collection("users").doc(input.userId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
  if (snapshot.data()?.role === "super-admin") return NextResponse.json({ success: false, message: "Super-admin accounts cannot be changed from this screen." }, { status: 403 });

  if (input.action === "permissions" && actor.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Only a super-admin can delegate staff permissions." }, { status: 403 });
  }
  if (input.action === "role" && actor.role !== "super-admin") {
    return NextResponse.json({ success: false, message: "Only a super-admin can promote or demote staff accounts." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const auditRef = adminDb.collection("adminAuditLog").doc();
  if (input.action === "delete") {
    await adminAuth.deleteUser(input.userId).catch((error: { code?: string }) => {
      if (error.code !== "auth/user-not-found") throw error;
    });
    const batch = adminDb.batch();
    batch.set(auditRef, { action: "user_deleted", actorId: actor.uid, actorEmail: actor.email || null, targetId: input.userId, before: snapshot.data(), createdAt: now });
    batch.delete(ref);
    await batch.commit();
    return NextResponse.json({ success: true, action: "delete" });
  }

  const update = input.action === "role" ? { role: input.role } : input.action === "status" ? { status: input.status } : { role: "admin", staffProfile: input.staffProfile, adminPermissions: input.permissions };
  const batch = adminDb.batch();
  batch.update(ref, { ...update, updatedAt: now });
  batch.set(auditRef, { action: input.action === "role" ? "user_role_changed" : input.action === "status" ? "user_status_changed" : "staff_permissions_changed", actorId: actor.uid, actorEmail: actor.email || null, targetId: input.userId, before: input.action === "role" ? { role: snapshot.data()?.role } : input.action === "status" ? { status: snapshot.data()?.status } : { staffProfile: snapshot.data()?.staffProfile, adminPermissions: snapshot.data()?.adminPermissions }, after: update, createdAt: now });
  await batch.commit();
  return NextResponse.json({ success: true, action: input.action });
}
