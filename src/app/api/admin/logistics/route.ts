import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { KENYAN_COUNTIES, type DeliveryZone } from "@/lib/delivery";
import {
  normalizeZoneInput,
  shippingZonesConfigSchema,
  validateShippingCoverage,
} from "@/lib/shipping-zones-admin";

function coverageSummary(zones: DeliveryZone[]) {
  return {
    explicitlyAssigned: new Set(
      zones.flatMap((zone) =>
        Array.isArray(zone.regions)
          ? zone.regions.filter((region: string) => KENYAN_COUNTIES.includes(region))
          : [],
      ),
    ).size,
    totalCounties: KENYAN_COUNTIES.length,
    fallbackConfigured: zones.filter((zone) => zone.isFallback).length === 1,
  };
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, "orders.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const [zonesSnapshot, meta, ordersSnapshot] = await Promise.all([
    adminDb.collection("shipping_zones").orderBy("order", "asc").get(),
    adminDb.collection("settings").doc("shippingZonesMeta").get(),
    adminDb.collection("orders").where("date", ">=", cutoff).limit(1500).get(),
  ]);

  const zones = zonesSnapshot.docs.map((document, index) =>
    normalizeZoneInput({ id: document.id, ...document.data() }, index),
  ) as DeliveryZone[];

  const analytics: Record<string, { orders: number; revenue: number }> = {};
  for (const document of ordersSnapshot.docs) {
    const order = document.data();
    if (order.paymentStatus !== "Paid") continue;
    const county = String(order.shippingAddress?.county || "");
    const zone =
      zones.find((item) => Array.isArray(item.regions) && item.regions.includes(county)) ||
      zones.find((item) => item.isFallback);
    if (!zone) continue;
    const current = analytics[zone.name] || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += Number(order.total || 0);
    analytics[zone.name] = current;
  }

  return NextResponse.json({
    success: true,
    zones,
    analytics,
    version: Number(meta.data()?.version || 0),
    coverage: coverageSummary(zones),
    sourceWindow: { orders: ordersSnapshot.size, limited: ordersSnapshot.size >= 1500 },
  });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, "orders.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Invalid shipping configuration." }, { status: 400 });
  }

  const rawZones = Array.isArray((body as { zones?: unknown }).zones)
    ? ((body as { zones: unknown[] }).zones as Record<string, unknown>[])
    : [];
  const normalized = {
    version: Number((body as { version?: unknown }).version) || 0,
    zones: rawZones.map((zone, index) => normalizeZoneInput(zone, index)),
  };

  const parsed = shippingZonesConfigSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || "Invalid shipping configuration." },
      { status: 400 },
    );
  }

  const coverageError = validateShippingCoverage(parsed.data.zones);
  if (coverageError) {
    return NextResponse.json({ success: false, message: coverageError }, { status: 400 });
  }

  const metaRef = adminDb.collection("settings").doc("shippingZonesMeta");
  try {
    const nextVersion = await adminDb.runTransaction(async (transaction) => {
      const meta = await transaction.get(metaRef);
      const currentVersion = Number(meta.data()?.version || 0);
      if (currentVersion !== parsed.data.version) throw new Error("VERSION_CONFLICT");

      const current = await transaction.get(adminDb.collection("shipping_zones"));
      const ids = new Set(parsed.data.zones.map((zone) => zone.id));
      current.docs
        .filter((document) => !ids.has(document.id))
        .forEach((document) => transaction.delete(document.ref));

      const now = new Date().toISOString();
      parsed.data.zones.forEach((zone) => {
        const { id, ...data } = zone;
        transaction.set(adminDb.collection("shipping_zones").doc(id), {
          ...data,
          updatedAt: now,
          updatedBy: actor.uid,
        });
      });
      transaction.set(metaRef, {
        version: currentVersion + 1,
        publishedAt: now,
        publishedBy: actor.uid,
      });
      transaction.set(adminDb.collection("adminAuditLog").doc(), {
        action: "shipping_zones_published",
        actorId: actor.uid,
        actorEmail: actor.email || null,
        targetId: "shipping_zones",
        before: { version: currentVersion, zones: current.size },
        after: { version: currentVersion + 1, zones: parsed.data.zones.length },
        createdAt: now,
      });
      return currentVersion + 1;
    });
    return NextResponse.json({ success: true, version: nextVersion, zones: parsed.data.zones });
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return NextResponse.json(
        { success: false, message: "Shipping zones changed in another session. Reload before saving." },
        { status: 409 },
      );
    }
    throw error;
  }
}
