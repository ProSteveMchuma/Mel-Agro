import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { KENYAN_COUNTIES, type DeliveryZone } from "@/lib/delivery";

const zoneSchema = z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(2).max(80), regions: z.array(z.string().max(80)).max(47), price: z.number().min(0).max(100_000), etaMinDays: z.number().int().min(0).max(30), etaMaxDays: z.number().int().min(0).max(30), etaText: z.string().trim().min(2).max(100), freeShippingThreshold: z.number().min(0).max(100_000_000).optional(), isFallback: z.boolean(), order: z.number().int().min(0).max(1000) }).refine((zone) => zone.etaMaxDays >= zone.etaMinDays, { message: "Maximum ETA must be at least the minimum ETA." });
const configSchema = z.object({ version: z.number().int().min(0), zones: z.array(zoneSchema).min(1).max(20) });
function validateCoverage(zones: z.infer<typeof zoneSchema>[]) {
  if (zones.filter((zone) => zone.isFallback).length !== 1) return "Exactly one fallback zone is required.";
  const owners = new Map<string, string[]>();
  for (const zone of zones) for (const region of zone.regions) if (KENYAN_COUNTIES.includes(region)) owners.set(region, [...(owners.get(region) || []), zone.name]);
  const duplicate = [...owners.entries()].find(([, names]) => names.length > 1);
  if (duplicate) return `${duplicate[0]} is assigned to multiple zones: ${duplicate[1].join(", ")}.`;
  return null;
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, "orders.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const [zonesSnapshot, meta, ordersSnapshot] = await Promise.all([adminDb.collection("shipping_zones").orderBy("order", "asc").get(), adminDb.collection("settings").doc("shippingZonesMeta").get(), adminDb.collection("orders").where("date", ">=", cutoff).limit(1500).get()]);
  const zones = zonesSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as DeliveryZone[];
  const analytics: Record<string, { orders: number; revenue: number }> = {};
  for (const document of ordersSnapshot.docs) { const order = document.data(); if (order.paymentStatus !== "Paid") continue; const county = String(order.shippingAddress?.county || ""); const zone = zones.find((item) => Array.isArray(item.regions) && item.regions.includes(county)) || zones.find((item) => item.isFallback); if (!zone) continue; const current = analytics[zone.name] || { orders: 0, revenue: 0 }; current.orders += 1; current.revenue += Number(order.total || 0); analytics[zone.name] = current; }
  return NextResponse.json({ success: true, zones, analytics, version: Number(meta.data()?.version || 0), coverage: { explicitlyAssigned: new Set(zones.flatMap((zone) => Array.isArray(zone.regions) ? zone.regions.filter((region: string) => KENYAN_COUNTIES.includes(region)) : [])).size, totalCounties: KENYAN_COUNTIES.length, fallbackConfigured: zones.filter((zone) => zone.isFallback).length === 1 }, sourceWindow: { orders: ordersSnapshot.size, limited: ordersSnapshot.size >= 1500 } });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, "orders.manage"); if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = configSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid shipping configuration." }, { status: 400 });
  const coverageError = validateCoverage(parsed.data.zones); if (coverageError) return NextResponse.json({ success: false, message: coverageError }, { status: 400 });
  const metaRef = adminDb.collection("settings").doc("shippingZonesMeta");
  try { const nextVersion = await adminDb.runTransaction(async (transaction) => { const meta = await transaction.get(metaRef); const currentVersion = Number(meta.data()?.version || 0); if (currentVersion !== parsed.data.version) throw new Error("VERSION_CONFLICT"); const current = await transaction.get(adminDb.collection("shipping_zones")); const ids = new Set(parsed.data.zones.map((zone) => zone.id)); current.docs.filter((document) => !ids.has(document.id)).forEach((document) => transaction.delete(document.ref)); const now = new Date().toISOString(); parsed.data.zones.forEach((zone) => { const { id, ...data } = zone; transaction.set(adminDb.collection("shipping_zones").doc(id), { ...data, updatedAt: now, updatedBy: actor.uid }); }); transaction.set(metaRef, { version: currentVersion + 1, publishedAt: now, publishedBy: actor.uid }); transaction.set(adminDb.collection("adminAuditLog").doc(), { action: "shipping_zones_published", actorId: actor.uid, actorEmail: actor.email || null, targetId: "shipping_zones", before: { version: currentVersion, zones: current.size }, after: { version: currentVersion + 1, zones: parsed.data.zones.length }, createdAt: now }); return currentVersion + 1; }); return NextResponse.json({ success: true, version: nextVersion }); }
  catch (error) { if (error instanceof Error && error.message === "VERSION_CONFLICT") return NextResponse.json({ success: false, message: "Shipping zones changed in another session. Reload before saving." }, { status: 409 }); throw error; }
}
