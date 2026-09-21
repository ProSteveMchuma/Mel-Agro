"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address?: { county?: string; town?: string }) => void;
    lat?: number;
    lng?: number;
    initialLat?: number;
    initialLng?: number;
}

export default function LocationPicker({
    onLocationSelect,
    lat,
    lng,
    initialLat = -1.2921,
    initialLng = 36.8219,
}: LocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const onSelectRef = useRef(onLocationSelect);
    const suppressFlyRef = useRef(false);
    const [loading, setLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    useEffect(() => {
        onSelectRef.current = onLocationSelect;
    }, [onLocationSelect]);

    const fetchReverseGeocode = useCallback(async (nextLat: number, nextLng: number) => {
        setIsGeocoding(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${nextLat}&lon=${nextLng}&zoom=14&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } },
            );
            const data = await response.json();
            if (data.address) {
                const county = data.address.county || data.address.state_district || data.address.region || data.address.state || '';
                const town =
                    data.address.suburb ||
                    data.address.neighbourhood ||
                    data.address.city_district ||
                    data.address.municipality ||
                    data.address.town ||
                    data.address.village ||
                    data.address.city ||
                    '';

                return {
                    county: county.replace(/ County$/i, ''),
                    town,
                };
            }
        } catch (error) {
            console.error('Geocoding failed', error);
        } finally {
            setIsGeocoding(false);
        }
        return null;
    }, []);

    const handleLocationUpdate = useCallback(async (nextLat: number, nextLng: number) => {
        suppressFlyRef.current = true;
        const address = await fetchReverseGeocode(nextLat, nextLng);
        onSelectRef.current(nextLat, nextLng, address || undefined);
    }, [fetchReverseGeocode]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const startLat = lat ?? initialLat;
        const startLng = lng ?? initialLng;

        mapRef.current = L.map(mapContainerRef.current).setView([startLat, startLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);

        const icon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        markerRef.current = L.marker([startLat, startLng], {
            icon,
            draggable: true,
        }).addTo(mapRef.current);

        markerRef.current.on('dragend', () => {
            if (!markerRef.current) return;
            const pos = markerRef.current.getLatLng();
            void handleLocationUpdate(pos.lat, pos.lng);
        });

        mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
            if (!markerRef.current) return;
            markerRef.current.setLatLng(e.latlng);
            void handleLocationUpdate(e.latlng.lat, e.latlng.lng);
        });

        // Fix tile sizing after dynamic mount.
        setTimeout(() => mapRef.current?.invalidateSize(), 80);

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // Mount once — position updates are handled separately.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (lat == null || lng == null || !mapRef.current || !markerRef.current) return;

        if (suppressFlyRef.current) {
            suppressFlyRef.current = false;
            markerRef.current.setLatLng([lat, lng]);
            return;
        }

        const current = markerRef.current.getLatLng();
        if (Math.abs(current.lat - lat) < 0.00001 && Math.abs(current.lng - lng) < 0.00001) {
            return;
        }

        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15), { animate: true });
    }, [lat, lng]);

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([latitude, longitude], 16);
                    markerRef.current.setLatLng([latitude, longitude]);
                    void handleLocationUpdate(latitude, longitude);
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error getting location', err);
                setLoading(false);
            },
        );
    };

    return (
        <div className="relative z-0 h-[300px] w-full overflow-hidden rounded-xl border border-gray-200">
            {(loading || isGeocoding) && (
                <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-white/60">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-melagri-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-900">
                        {isGeocoding ? 'Detecting Address...' : 'Getting Location...'}
                    </p>
                </div>
            )}
            <button
                type="button"
                onClick={useMyLocation}
                className="absolute right-3 top-3 z-[1000] rounded-lg bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-700 shadow-md hover:bg-green-50 hover:text-green-700"
            >
                Use my location
            </button>
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
