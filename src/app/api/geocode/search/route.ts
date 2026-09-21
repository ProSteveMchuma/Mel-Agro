import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { mapNominatimResult, type GeocodeSuggestion } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

const NOMINATIM_UA = 'MelAgriCheckout/1.0 (https://www.melagri.com; support@melagri.com)';

export async function GET(request: Request) {
    const limited = enforceRateLimit(request, 'geocode-search', 40, 60_000);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
        return NextResponse.json({ success: true, results: [] as GeocodeSuggestion[] });
    }

    if (q.length > 120) {
        return NextResponse.json(
            { success: false, message: 'Search query is too long.' },
            { status: 400 },
        );
    }

    try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'json');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '6');
        url.searchParams.set('countrycodes', 'ke');
        url.searchParams.set('q', q);

        const response = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
                'Accept-Language': 'en',
                'User-Agent': NOMINATIM_UA,
            },
            next: { revalidate: 0 },
        });

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: 'Map search is temporarily unavailable.' },
                { status: 502 },
            );
        }

        const data = (await response.json()) as unknown[];
        const results = (Array.isArray(data) ? data : [])
            .map((item, index) => mapNominatimResult(item as Parameters<typeof mapNominatimResult>[0], index))
            .filter((item): item is GeocodeSuggestion => Boolean(item));

        return NextResponse.json(
            { success: true, results },
            {
                headers: {
                    'Cache-Control': 'private, max-age=60',
                },
            },
        );
    } catch (error) {
        console.error('[geocode/search]', error);
        return NextResponse.json(
            { success: false, message: 'Could not search delivery locations.' },
            { status: 500 },
        );
    }
}
