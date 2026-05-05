// Server-side helpers for shipping zones. Lives separately from delivery.ts
// (which is shared between client and server) because this file imports the
// firebase-admin SDK and would break the client bundle.

import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { DELIVERY_ZONES, DeliveryZone } from './delivery';

/**
 * Fetch shipping zones from Firestore. Auto-seeds the collection from the
 * hardcoded DELIVERY_ZONES the first time it's called against an empty
 * collection — guarantees the admin always has something to edit and that
 * checkout always has a fallback even before any admin has logged in.
 *
 * Cached for 5 minutes via unstable_cache; admin edits invalidate via the
 * 'shipping-zones' tag (call revalidateTag from any mutation route if you
 * need an instant refresh).
 */
async function fetchZonesUncached(): Promise<DeliveryZone[]> {
    try {
        const snap = await adminDb.collection('shipping_zones').orderBy('order', 'asc').get();
        if (!snap.empty) {
            return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DeliveryZone[];
        }
        // Empty — auto-seed from defaults so first-deploy admins see the
        // expected zones in the dashboard. We write each zone with its
        // canonical name as the doc id for stable references.
        const batch = adminDb.batch();
        for (const z of DELIVERY_ZONES) {
            const docId = z.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            batch.set(adminDb.collection('shipping_zones').doc(docId), { ...z });
        }
        await batch.commit();
        return DELIVERY_ZONES.map(z => ({
            ...z,
            id: z.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }));
    } catch (err) {
        console.error('shipping-zones fetch failed, using fallback:', err);
        return DELIVERY_ZONES;
    }
}

export const getZonesServer = unstable_cache(
    async () => fetchZonesUncached(),
    ['shipping-zones'],
    { revalidate: 300, tags: ['shipping-zones'] },
);
