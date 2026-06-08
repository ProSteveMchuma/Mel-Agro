export interface DeliveryZone {
    /** Optional Firestore doc id when the zone is loaded from the live collection. */
    id?: string;
    name: string;
    /** Per-order base shipping cost for this zone (KES). */
    price: number;
    regions: string[];
    etaMinDays: number;
    etaMaxDays: number;
    etaText: string;
    /** Per-zone free-shipping threshold. Falls back to the global default when absent. */
    freeShippingThreshold?: number;
    /** Marks the catch-all "Rest of Kenya" zone. Only one fallback should exist. */
    isFallback?: boolean;
    /** Sort order for admin display. */
    order?: number;
}

/**
 * Hardcoded fallback used when:
 *   - the live Firestore collection is empty (first deploy)
 *   - a server-side render fetches before the live cache warms up
 *   - the network read fails
 *
 * In production, edits made through /dashboard/admin/logistics are the source
 * of truth — these defaults are seeded into Firestore once and then ignored.
 */
export const DELIVERY_ZONES: DeliveryZone[] = [
    {
        name: "Nairobi Region",
        price: 200,
        regions: ["Nairobi", "Kiambu", "Kajiado", "Machakos"],
        etaMinDays: 0,
        etaMaxDays: 1,
        etaText: "Same day or next day",
        order: 1,
    },
    {
        name: "Central Region",
        price: 350,
        regions: ["Nyeri", "Murang'a", "Kirinyaga", "Nyandarua", "Embu", "Tharaka-Nithi", "Meru"],
        etaMinDays: 1,
        etaMaxDays: 2,
        etaText: "1–2 business days",
        order: 2,
    },
    {
        name: "Rift Valley",
        price: 450,
        regions: ["Nakuru", "Uasin Gishu", "Narok", "Kericho", "Bomet", "Baringo", "Laikipia", "Nandi", "Elgeyo-Marakwet", "Trans-Nzoia", "Samburu", "Turkana", "West Pokot"],
        etaMinDays: 1,
        etaMaxDays: 2,
        etaText: "1–2 business days",
        order: 3,
    },
    {
        name: "Western & Nyanza",
        price: 550,
        regions: ["Kisumu", "Kakamega", "Bungoma", "Kisii", "Siaya", "Vihiga", "Busia", "Homa Bay", "Migori", "Nyamira"],
        etaMinDays: 2,
        etaMaxDays: 3,
        etaText: "2–3 business days",
        order: 4,
    },
    {
        name: "Coast Region",
        price: 600,
        regions: ["Mombasa", "Kilifi", "Kwale", "Lamu", "Tana River", "Taita-Taveta"],
        etaMinDays: 2,
        etaMaxDays: 3,
        etaText: "2–3 business days",
        order: 5,
    },
    {
        name: "Northern & Eastern",
        price: 700,
        regions: ["Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Kitui", "Makueni"],
        etaMinDays: 3,
        etaMaxDays: 4,
        etaText: "3–4 business days",
        order: 6,
    },
    {
        name: "Rest of Kenya",
        price: 750,
        regions: ["Other"],
        etaMinDays: 3,
        etaMaxDays: 5,
        etaText: "3–5 business days",
        isFallback: true,
        order: 99,
    },
];

export const KENYAN_COUNTIES = [
    "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo",
    "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
    "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori",
    "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
    "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana",
    "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

/** Global default — used when a zone doesn't carry its own threshold. */
export const FREE_SHIPPING_THRESHOLD = 10000;

/** Town aliases that map to a county for shipping lookup. */
const TOWN_TO_COUNTY: Record<string, string> = {
    eldoret: 'Uasin Gishu',
    kitale: 'Trans-Nzoia',
    kapsabet: 'Nandi',
    thika: 'Kiambu',
    ruiru: 'Kiambu',
    naivasha: 'Nakuru',
    kisii: 'Kisii',
    webuye: 'Bungoma',
    kakuma: 'Turkana',
    wote: 'Makueni',
};

function normalizeCounty(name: string): string {
    return (name || '')
        .toLowerCase()
        .replace(/[''`'\-_\s]+/g, '')
        .trim();
}

interface ZoneLookup {
    map: Map<string, DeliveryZone>;
    fallback: DeliveryZone;
}

/** Build a fast county → zone lookup from any zones array. */
export function buildZoneLookup(zones: DeliveryZone[]): ZoneLookup {
    const map = new Map<string, DeliveryZone>();
    for (const zone of zones) {
        for (const region of zone.regions) {
            map.set(normalizeCounty(region), zone);
        }
    }
    for (const [town, county] of Object.entries(TOWN_TO_COUNTY)) {
        const zone = zones.find(z => z.regions.includes(county));
        if (zone) map.set(normalizeCounty(town), zone);
    }
    const fallback = zones.find(z => z.isFallback) || zones[zones.length - 1] || DELIVERY_ZONES[DELIVERY_ZONES.length - 1];
    return { map, fallback };
}

const FALLBACK_LOOKUP = buildZoneLookup(DELIVERY_ZONES);

export interface DeliveryCostResult {
    cost: number;
    zoneName: string;
    reason?: string;
    etaText: string;
    etaMinDays: number;
    etaMaxDays: number;
}

/**
 * Compute the delivery cost for a county.
 *
 * @param county The county name (or town — common towns are mapped to their county)
 * @param orderTotal The order subtotal — drives free-shipping eligibility
 * @param zones Optional live zones from Firestore. When omitted, falls back to
 *              the hardcoded DELIVERY_ZONES — preserves backwards compatibility
 *              for any caller that hasn't been migrated to the live source.
 */
export function getDeliveryCost(
    county: string,
    orderTotal: number = 0,
    zones?: DeliveryZone[],
): DeliveryCostResult {
    const lookup = zones && zones.length > 0 ? buildZoneLookup(zones) : FALLBACK_LOOKUP;
    const zone = lookup.map.get(normalizeCounty(county)) || lookup.fallback;

    const threshold = zone.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD;
    if (threshold > 0 && orderTotal >= threshold) {
        return {
            cost: 0,
            zoneName: "Free Shipping",
            reason: `Order over KES ${threshold.toLocaleString()}`,
            etaText: zone.etaText,
            etaMinDays: zone.etaMinDays,
            etaMaxDays: zone.etaMaxDays,
        };
    }

    return {
        cost: Math.round(zone.price),
        zoneName: zone.name,
        reason: `${zone.name} standard rate`,
        etaText: zone.etaText,
        etaMinDays: zone.etaMinDays,
        etaMaxDays: zone.etaMaxDays,
    };
}
