"use client";
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DELIVERY_ZONES, DeliveryZone } from '@/lib/delivery';

/**
 * Subscribe to the live shipping_zones collection. Returns the hardcoded
 * fallback while the snapshot hydrates so the checkout never sees an empty
 * zones array (would cause every county to fall back to "Rest of Kenya").
 */
export function useShippingZones(): { zones: DeliveryZone[]; loading: boolean } {
    const [zones, setZones] = useState<DeliveryZone[]>(DELIVERY_ZONES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'shipping_zones'), orderBy('order', 'asc'));
        const unsub = onSnapshot(
            q,
            (snap) => {
                if (!snap.empty) {
                    setZones(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DeliveryZone[]);
                }
                // If empty, keep showing DELIVERY_ZONES until a server-side seed runs.
                setLoading(false);
            },
            (err) => {
                console.error('shipping_zones listener error, using fallback:', err);
                setLoading(false);
            },
        );
        return () => unsub();
    }, []);

    return { zones, loading };
}
