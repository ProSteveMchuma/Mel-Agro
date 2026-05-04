export interface DeliveryZone {
    name: string;
    price: number;
    regions: string[];
    etaMinDays: number;
    etaMaxDays: number;
    etaText: string;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
    {
        name: "Nairobi Region",
        price: 200,
        regions: ["Nairobi", "Kiambu", "Kajiado", "Machakos"],
        etaMinDays: 0,
        etaMaxDays: 1,
        etaText: "Same day or next day",
    },
    {
        name: "Central Region",
        price: 350,
        regions: ["Nyeri", "Murang'a", "Kirinyaga", "Nyandarua", "Embu", "Tharaka-Nithi", "Meru"],
        etaMinDays: 1,
        etaMaxDays: 2,
        etaText: "1–2 business days",
    },
    {
        name: "Rift Valley",
        price: 450,
        regions: ["Nakuru", "Uasin Gishu", "Narok", "Kericho", "Bomet", "Baringo", "Laikipia", "Nandi", "Elgeyo-Marakwet", "Trans-Nzoia", "Samburu", "Turkana", "West Pokot"],
        etaMinDays: 1,
        etaMaxDays: 2,
        etaText: "1–2 business days",
    },
    {
        name: "Western & Nyanza",
        price: 550,
        regions: ["Kisumu", "Kakamega", "Bungoma", "Kisii", "Siaya", "Vihiga", "Busia", "Homa Bay", "Migori", "Nyamira"],
        etaMinDays: 2,
        etaMaxDays: 3,
        etaText: "2–3 business days",
    },
    {
        name: "Coast Region",
        price: 600,
        regions: ["Mombasa", "Kilifi", "Kwale", "Lamu", "Tana River", "Taita-Taveta"],
        etaMinDays: 2,
        etaMaxDays: 3,
        etaText: "2–3 business days",
    },
    {
        name: "Northern & Eastern",
        price: 700,
        regions: ["Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Kitui", "Makueni"],
        etaMinDays: 3,
        etaMaxDays: 4,
        etaText: "3–4 business days",
    },
    {
        name: "Rest of Kenya",
        price: 750,
        regions: ["Other"],
        etaMinDays: 3,
        etaMaxDays: 5,
        etaText: "3–5 business days",
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

export const FREE_SHIPPING_THRESHOLD = 10000;

function normalizeCounty(name: string): string {
    return (name || '')
        .toLowerCase()
        .replace(/[''`'\-_\s]+/g, '')
        .trim();
}

const NORMALIZED_ZONE_LOOKUP: Map<string, DeliveryZone> = (() => {
    const map = new Map<string, DeliveryZone>();
    for (const zone of DELIVERY_ZONES) {
        for (const region of zone.regions) {
            map.set(normalizeCounty(region), zone);
        }
    }
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
    for (const [town, county] of Object.entries(TOWN_TO_COUNTY)) {
        const zone = DELIVERY_ZONES.find(z => z.regions.includes(county));
        if (zone) map.set(normalizeCounty(town), zone);
    }
    return map;
})();

const REST_ZONE = DELIVERY_ZONES[DELIVERY_ZONES.length - 1];

export interface DeliveryCostResult {
    cost: number;
    zoneName: string;
    reason?: string;
    etaText: string;
    etaMinDays: number;
    etaMaxDays: number;
}

export function getDeliveryCost(county: string, orderTotal: number = 0): DeliveryCostResult {
    const zone = NORMALIZED_ZONE_LOOKUP.get(normalizeCounty(county)) || REST_ZONE;

    if (orderTotal >= FREE_SHIPPING_THRESHOLD) {
        return {
            cost: 0,
            zoneName: "Free Shipping",
            reason: `Order over KES ${FREE_SHIPPING_THRESHOLD.toLocaleString()}`,
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
