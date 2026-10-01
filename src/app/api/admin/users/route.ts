import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { ADMIN_PERMISSIONS } from "@/lib/admin-permissions";

const PAGE_SIZE = 20;
const SCAN_SIZE = 75;
const MAX_SCANNED = 500;

type UserSegment = "all" | "customers" | "admins" | "suspended" | "personalized";

function decodeCursor(value: string | null) {
  if (!value) return null;
  try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return null; }
}

function encodeCursor(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function serializable(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(serializable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  return value;
}

function matchesSegment(data: Record<string, unknown>, segment: UserSegment) {
  if (segment === "customers") return data.role === "user" || data.role === "customer";
  if (segment === "admins") return data.role === "admin" || data.role === "super-admin";
  if (segment === "suspended") return data.status === "suspended";
  if (segment === "personalized") return data.personalizationEnabled === true;
  return true;
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, "customers.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const queryText = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
  const county = (params.get("county") || "").trim().slice(0, 80);
  const requestedSegment = params.get("segment") || "all";
  const segment: UserSegment = ["all", "customers", "admins", "suspended", "personalized"].includes(requestedSegment)
    ? requestedSegment as UserSegment
    : "all";
  const cursor = decodeCursor(params.get("cursor"));

  let scanned = 0;
  let exhausted = false;
  let lastScannedId = cursor;
  const users: Record<string, unknown>[] = [];

  while (users.length < PAGE_SIZE && scanned < MAX_SCANNED && !exhausted) {
    let firestoreQuery = adminDb.collection("users").orderBy("__name__").limit(Math.min(SCAN_SIZE, MAX_SCANNED - scanned));
    if (lastScannedId) firestoreQuery = firestoreQuery.startAfter(lastScannedId);
    const snapshot = await firestoreQuery.get();
    if (snapshot.empty) { exhausted = true; break; }

    for (const document of snapshot.docs) {
      scanned += 1;
      lastScannedId = document.id;
      const data = document.data() as Record<string, unknown>;
      if (!matchesSegment(data, segment)) continue;
      if (county && String(data.county || "") !== county) continue;
      if (queryText) {
        const haystack = [data.name, data.email, data.phone, data.county, data.city, document.id, data.uid]
          .map((value) => String(value || "").toLowerCase()).join(" ");
        if (!haystack.includes(queryText)) continue;
      }
      users.push({ ...serializable(data) as Record<string, unknown>, id: document.id, uid: data.uid || document.id });
      if (users.length === PAGE_SIZE) break;
    }
    exhausted = snapshot.size < SCAN_SIZE;
  }

  return NextResponse.json({
    success: true,
    users,
    nextCursor: !exhausted && lastScannedId ? encodeCursor(lastScannedId) : null,
    searchLimited: scanned >= MAX_SCANNED && !exhausted,
  });
}

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
  const targetRole = String(snapshot.data()?.role || 'user');
  if (targetRole === 'super-admin') {
    return NextResponse.json({ success: false, message: 'Super-admin accounts cannot be changed from this screen.' }, { status: 403 });
  }
  // Only super-admins may delete/suspend/status other staff (admin role).
  if ((targetRole === 'admin') && (input.action === 'delete' || input.action === 'status') && actor.role !== 'super-admin') {
    return NextResponse.json({ success: false, message: 'Only a super-admin can delete or suspend staff accounts.' }, { status: 403 });
  }

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
