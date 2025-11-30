export interface DeliveryZone {
    name: string;
    price: number;
    regions: string[];
}

export const DELIVERY_ZONES: DeliveryZone[] = [
    {
        name: "Nairobi Region",
        price: 200,
        regions: ["Nairobi", "Kiambu", "Kajiado", "Machakos"]
    },
    {
        name: "Central Region",
        price: 350,
        regions: ["Nyeri", "Murang'a", "Kirinyaga", "Nyandarua"]
    },
    {
        name: "Rift Valley",
        price: 450,
        regions: ["Nakuru", "Uasin Gishu", "Narok", "Kericho", "Bomet"]
    },
    {
        name: "Western & Nyanza",
        price: 550,
        regions: ["Kisumu", "Kakamega", "Bungoma", "Kisii", "Siaya"]
    },
    {
        name: "Coast Region",
        price: 600,
        regions: ["Mombasa", "Kilifi", "Kwale", "Lamu"]
    },
    {
        name: "Rest of Kenya",
        price: 750,
        regions: ["Other"]
    }
];

export const KENYAN_COUNTIES = [
    "Nairobi", "Mombasa", "Kwales", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera",
    "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri",
    "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans-Nzoia", "Uasin Gishu",
    "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet",
    "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira"
].sort();

export function getDeliveryCost(county: string): number {
    const zone = DELIVERY_ZONES.find(z => z.regions.includes(county));
    return zone ? zone.price : 750; // Default to 'Rest of Kenya' price
}
