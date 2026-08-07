import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth-server";

const updateSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["active", "unsubscribed"]),
});

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });

  const snapshot = await adminDb.collection("newsletterSubscriptions").orderBy("updatedAt", "desc").limit(1000).get();
  const subscribers: Array<Record<string, unknown> & { id: string; status?: string }> = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({
    success: true,
    subscribers,
    summary: {
      total: subscribers.length,
      active: subscribers.filter((item) => item.status === "active").length,
      unsubscribed: subscribers.filter((item) => item.status === "unsubscribed").length,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid subscriber update." }, { status: 400 });

  const ref = adminDb.collection("newsletterSubscriptions").doc(parsed.data.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ success: false, message: "Subscriber not found." }, { status: 404 });

  const now = new Date().toISOString();
  await ref.set({
    status: parsed.data.status,
    updatedAt: now,
    statusUpdatedAt: now,
    statusUpdatedBy: auth.email || auth.uid,
  }, { merge: true });

  return NextResponse.json({ success: true, status: parsed.data.status });
}
