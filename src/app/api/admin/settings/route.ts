import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

const generalSchema = z.object({
  companyName: z.string().trim().min(2).max(100),
  logoUrl: z.union([z.literal(""), z.string().url().max(500)]),
  supportEmail: z.string().trim().email().max(254),
  supportPhone: z.string().trim().regex(/^\+?[0-9 ()-]{9,20}$/, "Enter a valid support phone number."),
  currency: z.literal("KES"),
  address: z.string().trim().min(3).max(300),
  websiteUrl: z.string().url().max(300),
});
const taxSchema = z.object({ taxRate: z.number().min(0).max(100), taxId: z.union([z.literal(""), z.string().trim().regex(/^[AP][0-9]{9}[A-Z]$/i, "Enter a valid KRA PIN.")]), enabled: z.boolean() });
const notificationsSchema = z.object({ emailEnabled: z.boolean(), smsEnabled: z.boolean(), orderConfirmationTemplate: z.string().trim().min(10).max(1000).refine((value) => value.includes("{orderId}"), "Order template must include {orderId}."), shippingNotificationTemplate: z.string().trim().min(10).max(1000).refine((value) => value.includes("{orderId}"), "Shipping template must include {orderId}.") });
const documentsSchema = z.object({ invoiceTitle: z.string().trim().min(2).max(60), footerText: z.string().trim().max(300), terms: z.string().trim().max(1500), showLogo: z.boolean(), primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a valid document colour.") });
const schemas = { general: generalSchema, tax: taxSchema, notifications: notificationsSchema, documents: documentsSchema } as const;
type Section = keyof typeof schemas;
const requestSchema = z.object({ section: z.enum(["general", "tax", "notifications", "documents"]), version: z.number().int().min(0), data: z.unknown() });

export async function GET(request: Request) {
  const actor = await requirePermission(request, "settings.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const sections = Object.keys(schemas) as Section[];
  const snapshots = await Promise.all(sections.flatMap((section) => [adminDb.collection("settings").doc(section).get(), adminDb.collection("settings").doc(`${section}Meta`).get()]));
  const settings: Record<string, unknown> = {}; const versions: Record<string, number> = {};
  sections.forEach((section, index) => { settings[section] = snapshots[index * 2].data() || null; versions[section] = Number(snapshots[index * 2 + 1].data()?.version || 0); });
  return NextResponse.json({ success: true, settings, versions });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, "settings.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const envelope = requestSchema.safeParse(await request.json().catch(() => null));
  if (!envelope.success) return NextResponse.json({ success: false, message: envelope.error.issues[0]?.message || "Invalid settings request." }, { status: 400 });
  const { section, version } = envelope.data;
  const parsed = schemas[section].safeParse(envelope.data.data);
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid settings." }, { status: 400 });
  const settingRef = adminDb.collection("settings").doc(section); const metaRef = adminDb.collection("settings").doc(`${section}Meta`);
  try {
    const nextVersion = await adminDb.runTransaction(async (transaction) => {
      const [currentSetting, currentMeta] = await Promise.all([transaction.get(settingRef), transaction.get(metaRef)]);
      const currentVersion = Number(currentMeta.data()?.version || 0); if (currentVersion !== version) throw new Error("VERSION_CONFLICT");
      const now = new Date().toISOString(); transaction.set(settingRef, { ...parsed.data, updatedAt: now, updatedBy: actor.uid }); transaction.set(metaRef, { version: currentVersion + 1, updatedAt: now, updatedBy: actor.uid });
      transaction.set(adminDb.collection("adminAuditLog").doc(), { action: "settings_updated", actorId: actor.uid, actorEmail: actor.email || null, targetId: section, before: { version: currentVersion, configured: currentSetting.exists }, after: { version: currentVersion + 1 }, createdAt: now });
      return currentVersion + 1;
    });
    return NextResponse.json({ success: true, version: nextVersion });
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") return NextResponse.json({ success: false, message: "These settings changed in another session. Reload before saving." }, { status: 409 });
    throw error;
  }
}
