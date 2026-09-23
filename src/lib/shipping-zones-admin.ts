import { z } from 'zod';

const zoneSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(80),
  regions: z.array(z.string().max(80)).max(47),
  price: z.number().min(0).max(100_000),
  etaMinDays: z.number().int().min(0).max(30),
  etaMaxDays: z.number().int().min(0).max(30),
  etaText: z.string().trim().min(2).max(100),
  freeShippingThreshold: z.number().min(0).max(100_000_000).optional(),
  isFallback: z.boolean(),
  order: z.number().int().min(0).max(1000),
}).refine((zone) => zone.etaMaxDays >= zone.etaMinDays, {
  message: 'Maximum ETA must be at least the minimum ETA.',
});

export type NormalizedShippingZone = z.infer<typeof zoneSchema>;

export const shippingZonesConfigSchema = z.object({
  version: z.number().int().min(0),
  zones: z.array(zoneSchema).min(1).max(20),
});

function autoEtaText(min: number, max: number): string {
  if (min === 0 && max <= 1) return 'Same day or next day';
  if (min === max) return `${min} business day${min === 1 ? '' : 's'}`;
  return `${min}–${max} business days`;
}

/** Coerce Firestore / UI payloads into schema-safe zones (missing booleans/text used to block saves). */
export function normalizeZoneInput(raw: Record<string, unknown>, index: number): NormalizedShippingZone {
  const minEta = Math.max(0, Math.min(30, Math.trunc(Number(raw.etaMinDays) || 0)));
  let maxEta = Math.max(0, Math.min(30, Math.trunc(Number(raw.etaMaxDays) || minEta)));
  if (maxEta < minEta) maxEta = minEta;
  const etaText = String(raw.etaText || '').trim() || autoEtaText(minEta, maxEta);
  return {
    id: String(raw.id || `zone_${index + 1}`).slice(0, 100),
    name: String(raw.name || '').trim().slice(0, 80),
    regions: Array.isArray(raw.regions)
      ? raw.regions.map((region) => String(region).slice(0, 80)).slice(0, 47)
      : [],
    price: Math.max(0, Math.min(100_000, Number(raw.price) || 0)),
    etaMinDays: minEta,
    etaMaxDays: maxEta,
    etaText: etaText.slice(0, 100),
    freeShippingThreshold: Math.max(0, Math.min(100_000_000, Number(raw.freeShippingThreshold) || 0)),
    isFallback: Boolean(raw.isFallback),
    order: Math.max(0, Math.min(1000, Math.trunc(Number(raw.order ?? index + 1) || index + 1))),
  };
}

export function validateShippingCoverage(zones: NormalizedShippingZone[]) {
  if (zones.filter((zone) => zone.isFallback).length !== 1) {
    return 'Exactly one fallback zone is required.';
  }
  // Duplicate counties are allowed (first match wins at checkout) — warn in the UI only.
  return null;
}
