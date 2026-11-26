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

export interface KenyanTown {
    town: string;
    county: string;
}

/**
 * Towns customers can pick at checkout. Each maps to its county, and the county
 * still decides the delivery zone and fee (zones are managed per county in
 * /dashboard/admin/logistics), so adding a town here never changes pricing.
 * Customers whose town isn't listed can choose "Other" and pick their county.
 */
export const KENYAN_TOWNS: KenyanTown[] = [
    { town: "Ahero", county: "Kisumu" },
    { town: "Archers Post", county: "Samburu" },
    { town: "Athi River", county: "Machakos" },
    { town: "Awendo", county: "Migori" },
    { town: "Bahati", county: "Nakuru" },
    { town: "Bamburi", county: "Mombasa" },
    { town: "Baragoi", county: "Samburu" },
    { town: "Bomet", county: "Bomet" },
    { town: "Bondo", county: "Siaya" },
    { town: "Bungoma", county: "Bungoma" },
    { town: "Bura", county: "Tana River" },
    { town: "Burnt Forest", county: "Uasin Gishu" },
    { town: "Busia", county: "Busia" },
    { town: "Bute", county: "Wajir" },
    { town: "Butere", county: "Kakamega" },
    { town: "Chaka", county: "Nyeri" },
    { town: "Changamwe", county: "Mombasa" },
    { town: "Chepareria", county: "West Pokot" },
    { town: "Chepkorio", county: "Elgeyo-Marakwet" },
    { town: "Chogoria", county: "Tharaka-Nithi" },
    { town: "Chuka", county: "Tharaka-Nithi" },
    { town: "Chwele", county: "Bungoma" },
    { town: "Dadaab", county: "Garissa" },
    { town: "Dagoretti", county: "Nairobi" },
    { town: "Diani", county: "Kwale" },
    { town: "Doldol", county: "Laikipia" },
    { town: "Eastleigh", county: "Nairobi" },
    { town: "Ekerenyo", county: "Nyamira" },
    { town: "El Wak", county: "Mandera" },
    { town: "Elburgon", county: "Nakuru" },
    { town: "Eldama Ravine", county: "Baringo" },
    { town: "Eldoret", county: "Uasin Gishu" },
    { town: "Emali", county: "Makueni" },
    { town: "Embakasi", county: "Nairobi" },
    { town: "Embu", county: "Embu" },
    { town: "Endebess", county: "Trans-Nzoia" },
    { town: "Engineer", county: "Nyandarua" },
    { town: "Garbatulla", county: "Isiolo" },
    { town: "Garissa", county: "Garissa" },
    { town: "Garsen", county: "Tana River" },
    { town: "Gatundu", county: "Kiambu" },
    { town: "Gilgil", county: "Nakuru" },
    { town: "Githunguri", county: "Kiambu" },
    { town: "Habaswein", county: "Wajir" },
    { town: "Hola", county: "Tana River" },
    { town: "Homa Bay", county: "Homa Bay" },
    { town: "Isebania", county: "Migori" },
    { town: "Isinya", county: "Kajiado" },
    { town: "Isiolo", county: "Isiolo" },
    { town: "Iten", county: "Elgeyo-Marakwet" },
    { town: "Juja", county: "Kiambu" },
    { town: "Kabarnet", county: "Baringo" },
    { town: "Kagio", county: "Kirinyaga" },
    { town: "Kahawa", county: "Nairobi" },
    { town: "Kajiado", county: "Kajiado" },
    { town: "Kakamega", county: "Kakamega" },
    { town: "Kakuma", county: "Turkana" },
    { town: "Kaloleni", county: "Kilifi" },
    { town: "Kandara", county: "Murang'a" },
    { town: "Kangema", county: "Murang'a" },
    { town: "Kangundo", county: "Machakos" },
    { town: "Kapenguria", county: "West Pokot" },
    { town: "Kapsabet", county: "Nandi" },
    { town: "Kapsowar", county: "Elgeyo-Marakwet" },
    { town: "Karatina", county: "Nyeri" },
    { town: "Karen", county: "Nairobi" },
    { town: "Karuri", county: "Kiambu" },
    { town: "Kasarani", county: "Nairobi" },
    { town: "Kawangware", county: "Nairobi" },
    { town: "Kayole", county: "Nairobi" },
    { town: "Kehancha", county: "Migori" },
    { town: "Kendu Bay", county: "Homa Bay" },
    { town: "Kenol", county: "Murang'a" },
    { town: "Kericho", county: "Kericho" },
    { town: "Keroka", county: "Kisii" },
    { town: "Kerugoya", county: "Kirinyaga" },
    { town: "Kiambaa", county: "Kiambu" },
    { town: "Kiambu", county: "Kiambu" },
    { town: "Kibwezi", county: "Makueni" },
    { town: "Kikuyu", county: "Kiambu" },
    { town: "Kilgoris", county: "Narok" },
    { town: "Kilifi", county: "Kilifi" },
    { town: "Kimilili", county: "Bungoma" },
    { town: "Kiminini", county: "Trans-Nzoia" },
    { town: "Kinango", county: "Kwale" },
    { town: "Kipkelion", county: "Kericho" },
    { town: "Kiriaini", county: "Murang'a" },
    { town: "Kiserian", county: "Kajiado" },
    { town: "Kisii", county: "Kisii" },
    { town: "Kisumu", county: "Kisumu" },
    { town: "Kitale", county: "Trans-Nzoia" },
    { town: "Kitengela", county: "Kajiado" },
    { town: "Kitui", county: "Kitui" },
    { town: "Kombewa", county: "Kisumu" },
    { town: "Kutus", county: "Kirinyaga" },
    { town: "Kwale", county: "Kwale" },
    { town: "Laisamis", county: "Marsabit" },
    { town: "Lamu", county: "Lamu" },
    { town: "Langata", county: "Nairobi" },
    { town: "Likoni", county: "Mombasa" },
    { town: "Limuru", county: "Kiambu" },
    { town: "Litein", county: "Kericho" },
    { town: "Lodwar", county: "Turkana" },
    { town: "Loitokitok", county: "Kajiado" },
    { town: "Lokichogio", county: "Turkana" },
    { town: "Londiani", county: "Kericho" },
    { town: "Longisa", county: "Bomet" },
    { town: "Luanda", county: "Vihiga" },
    { town: "Lugari", county: "Kakamega" },
    { town: "Lunga Lunga", county: "Kwale" },
    { town: "Machakos", county: "Machakos" },
    { town: "Mai Mahiu", county: "Nakuru" },
    { town: "Majengo", county: "Vihiga" },
    { town: "Makindu", county: "Makueni" },
    { town: "Makutano", county: "West Pokot" },
    { town: "Makuyu", county: "Murang'a" },
    { town: "Malaba", county: "Busia" },
    { town: "Malava", county: "Kakamega" },
    { town: "Malindi", county: "Kilifi" },
    { town: "Mandera", county: "Mandera" },
    { town: "Maragua", county: "Murang'a" },
    { town: "Maralal", county: "Samburu" },
    { town: "Mariakani", county: "Kilifi" },
    { town: "Marigat", county: "Baringo" },
    { town: "Marimanti", county: "Tharaka-Nithi" },
    { town: "Marsabit", county: "Marsabit" },
    { town: "Masalani", county: "Garissa" },
    { town: "Maseno", county: "Kisumu" },
    { town: "Masii", county: "Machakos" },
    { town: "Matuu", county: "Machakos" },
    { town: "Maua", county: "Meru" },
    { town: "Mbale", county: "Vihiga" },
    { town: "Mbita", county: "Homa Bay" },
    { town: "Merti", county: "Isiolo" },
    { town: "Meru", county: "Meru" },
    { town: "Migori", county: "Migori" },
    { town: "Mitunguu", county: "Meru" },
    { town: "Mlolongo", county: "Machakos" },
    { town: "Mogotio", county: "Baringo" },
    { town: "Moiben", county: "Uasin Gishu" },
    { town: "Mokowe", county: "Lamu" },
    { town: "Molo", county: "Nakuru" },
    { town: "Mombasa", county: "Mombasa" },
    { town: "Mosoriot", county: "Nandi" },
    { town: "Moyale", county: "Marsabit" },
    { town: "Mpeketoni", county: "Lamu" },
    { town: "Msambweni", county: "Kwale" },
    { town: "Mtito Andei", county: "Makueni" },
    { town: "Mtongwe", county: "Mombasa" },
    { town: "Mtwapa", county: "Kilifi" },
    { town: "Muhoroni", county: "Kisumu" },
    { town: "Mukurweini", county: "Nyeri" },
    { town: "Mumias", county: "Kakamega" },
    { town: "Murang'a", county: "Murang'a" },
    { town: "Mutomo", county: "Kitui" },
    { town: "Mwatate", county: "Taita-Taveta" },
    { town: "Mwingi", county: "Kitui" },
    { town: "Nairegie Enkare", county: "Narok" },
    { town: "Nairobi CBD", county: "Nairobi" },
    { town: "Naivasha", county: "Nakuru" },
    { town: "Nakuru", county: "Nakuru" },
    { town: "Namanga", county: "Kajiado" },
    { town: "Nambale", county: "Busia" },
    { town: "Nandi Hills", county: "Nandi" },
    { town: "Nanyuki", county: "Laikipia" },
    { town: "Naro Moru", county: "Nyeri" },
    { town: "Narok", county: "Narok" },
    { town: "Ndaragwa", county: "Nyandarua" },
    { town: "Ndhiwa", county: "Homa Bay" },
    { town: "Ngong", county: "Kajiado" },
    { town: "Njabini", county: "Nyandarua" },
    { town: "Njoro", county: "Nakuru" },
    { town: "Nkubu", county: "Meru" },
    { town: "Nyahururu", county: "Laikipia" },
    { town: "Nyali", county: "Mombasa" },
    { town: "Nyamira", county: "Nyamira" },
    { town: "Nyansiongo", county: "Nyamira" },
    { town: "Nyeri", county: "Nyeri" },
    { town: "Ogembo", county: "Kisii" },
    { town: "Ol Joro Orok", county: "Nyandarua" },
    { town: "Ol Kalou", county: "Nyandarua" },
    { town: "Ololulunga", county: "Narok" },
    { town: "Ongata Rongai", county: "Kajiado" },
    { town: "Othaya", county: "Nyeri" },
    { town: "Oyugis", county: "Homa Bay" },
    { town: "Port Victoria", county: "Busia" },
    { town: "Rhamu", county: "Mandera" },
    { town: "Rongai", county: "Nakuru" },
    { town: "Rongo", county: "Migori" },
    { town: "Ruai", county: "Nairobi" },
    { town: "Ruiru", county: "Kiambu" },
    { town: "Rumuruti", county: "Laikipia" },
    { town: "Runyenjes", county: "Embu" },
    { town: "Sagana", county: "Kirinyaga" },
    { town: "Salgaa", county: "Nakuru" },
    { town: "Siakago", county: "Embu" },
    { town: "Siaya", county: "Siaya" },
    { town: "Sotik", county: "Bomet" },
    { town: "Subukia", county: "Nakuru" },
    { town: "Sultan Hamud", county: "Makueni" },
    { town: "Suneka", county: "Kisii" },
    { town: "Syokimau", county: "Machakos" },
    { town: "Tala", county: "Machakos" },
    { town: "Taveta", county: "Taita-Taveta" },
    { town: "Thika", county: "Kiambu" },
    { town: "Timau", county: "Meru" },
    { town: "Turbo", county: "Uasin Gishu" },
    { town: "Ugunja", county: "Siaya" },
    { town: "Ukunda", county: "Kwale" },
    { town: "Usenge", county: "Siaya" },
    { town: "Utawala", county: "Nairobi" },
    { town: "Vihiga", county: "Vihiga" },
    { town: "Voi", county: "Taita-Taveta" },
    { town: "Wajir", county: "Wajir" },
    { town: "Wamba", county: "Samburu" },
    { town: "Wang'uru", county: "Kirinyaga" },
    { town: "Watamu", county: "Kilifi" },
    { town: "Webuye", county: "Bungoma" },
    { town: "Westlands", county: "Nairobi" },
    { town: "Wote", county: "Makueni" },
    { town: "Wundanyi", county: "Taita-Taveta" },
    { town: "Yala", county: "Siaya" },
    { town: "Ziwa", county: "Uasin Gishu" },
];

/** Select value for "my town isn't listed" at checkout. */
export const OTHER_TOWN = "__other__";

/** Find a listed town by name (case/punctuation-insensitive). */
export function findKenyanTown(name?: string | null): KenyanTown | undefined {
    if (!name) return undefined;
    const key = normalizeCounty(name.replace(/ (town|county)$/i, ''));
    if (!key) return undefined;
    return KENYAN_TOWNS.find(t => normalizeCounty(t.town) === key);
}

/** Town aliases that map to a county for shipping lookup. */
const TOWN_TO_COUNTY: Record<string, string> = Object.fromEntries(
    KENYAN_TOWNS
        // A town that shares its county's name already resolves via the county.
        .filter(t => normalizeCounty(t.town) !== normalizeCounty(t.county))
        .map(t => [t.town, t.county]),
);

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
        const key = normalizeCounty(town);
        if (map.has(key)) continue; // never let a town shadow a county name
        const zone = zones.find(z => z.regions.includes(county));
        if (zone) map.set(key, zone);
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

/**
 * Combine the town picked at checkout with the optional estate/area the
 * customer typed into the single `town` string stored on orders and addresses
 * (e.g. "Kabati, Naivasha"). Keeps the stored order shape unchanged.
 */
export function composeShippingTown(deliveryTown: string | undefined, area: string | undefined): string {
    const picked = deliveryTown && deliveryTown !== OTHER_TOWN ? findKenyanTown(deliveryTown)?.town : undefined;
    const cleanArea = (area || '').trim();
    if (!picked) return cleanArea;
    if (!cleanArea) return picked;
    const parts = cleanArea.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.some(p => normalizeCounty(p) === normalizeCounty(picked))) return cleanArea;
    return `${cleanArea}, ${picked}`;
}

/**
 * Reverse of composeShippingTown for prefilling checkout from a saved address
 * or a previous order: works out which listed town (if any) it was, and what
 * is left over as the estate/area.
 */
export function splitShippingTown(town: string | undefined, county: string | undefined): { deliveryTown: string; area: string } {
    const raw = (town || '').trim();
    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
        const match = findKenyanTown(parts[i]);
        if (match && (!county || normalizeCounty(match.county) === normalizeCounty(county))) {
            const rest = parts.filter((_, idx) => idx !== i).join(', ');
            return { deliveryTown: match.town, area: rest };
        }
    }
    if (county && KENYAN_COUNTIES.includes(county)) return { deliveryTown: OTHER_TOWN, area: raw };
    return { deliveryTown: '', area: raw };
}
