import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "analytics.view");
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
  const snapshot = await adminDb.collection("adminAuditLog").orderBy("createdAt", "desc").limit(500).get();
  return NextResponse.json({ success: true, events: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
}
