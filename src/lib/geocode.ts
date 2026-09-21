import { KENYAN_COUNTIES } from '@/lib/delivery';

export type GeocodeSuggestion = {
    id: string;
    label: string;
    lat: number;
    lng: number;
    county?: string;
    town?: string;
    street?: string;
};

function normalizeKey(value: string): string {
    return (value || '')
        .toLowerCase()
        .replace(/[''`'\-_\s]+/g, '')
        .trim();
}

/** Best-effort match of a Nominatim county/state string to our shipping county list. */
export function matchKenyanCounty(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const cleaned = raw.replace(/ County$/i, '').trim();
    const exact = KENYAN_COUNTIES.find((county) => county.toLowerCase() === cleaned.toLowerCase());
    if (exact) return exact;

    const key = normalizeKey(cleaned);
    return KENYAN_COUNTIES.find((county) => normalizeKey(county) === key);
}

type NominatimAddress = {
    county?: string;
    state_district?: string;
    state?: string;
    region?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    hamlet?: string;
    city_district?: string;
    municipality?: string;
    road?: string;
    pedestrian?: string;
    residential?: string;
    house_number?: string;
};

type NominatimResult = {
    place_id?: number | string;
    display_name?: string;
    lat?: string;
    lon?: string;
    address?: NominatimAddress;
};

export function mapNominatimResult(item: NominatimResult, index: number): GeocodeSuggestion | null {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const address = item.address || {};
    const county = matchKenyanCounty(
        address.county || address.state_district || address.region || address.state,
    );
    const town =
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.municipality ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.city ||
        undefined;
    const road = address.road || address.pedestrian || address.residential || '';
    const street = [address.house_number, road].filter(Boolean).join(' ').trim() || undefined;

    return {
        id: String(item.place_id ?? `${lat},${lng},${index}`),
        label: item.display_name || [street, town, county, 'Kenya'].filter(Boolean).join(', '),
        lat,
        lng,
        county,
        town,
        street,
    };
}
