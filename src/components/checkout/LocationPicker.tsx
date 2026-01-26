"use client";

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Leaflet CSS is handled via CDN link in the page or global import
// We use L directly to avoid react-leaflet build issues in this environment

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address?: { county?: string; town?: string }) => void;
    initialLat?: number;
    initialLng?: number;
}

export default function LocationPicker({ onLocationSelect, initialLat = -1.2921, initialLng = 36.8219 }: LocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [loading, setLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    const fetchReverseGeocode = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            // Nominatim requires a User-Agent or Referer.
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
                headers: {
                    'Accept-Language': 'en'
                }
            });
            const data = await response.json();
            if (data.address) {
                // Priority: county, state_district, state (Kenya specific mapping)
                const county = data.address.county || data.address.state_district || data.address.region || data.address.state || "";
                const town = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.neighbourhood || "";

                return {
                    county: county.replace(/ County$/i, ""),
                    town
                };
            }
        } catch (error) {
            console.error("Geocoding failed", error);
        } finally {
            setIsGeocoding(false);
        }
        return null;
    };

    const handleLocationUpdate = async (lat: number, lng: number) => {
        const address = await fetchReverseGeocode(lat, lng);
        onLocationSelect(lat, lng, address || undefined);
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize Map
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);

            // Create Marker
            const icon = L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            markerRef.current = L.marker([initialLat, initialLng], {
                icon,
                draggable: true
            }).addTo(mapRef.current);

            markerRef.current.on('dragend', () => {
                if (markerRef.current) {
                    const pos = markerRef.current.getLatLng();
                    handleLocationUpdate(pos.lat, pos.lng);
                }
            });

            mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
                if (markerRef.current) {
                    markerRef.current.setLatLng(e.latlng);
                    handleLocationUpdate(e.latlng.lat, e.latlng.lng);
                }
            });
        }

        // Try to get user's current location if no initial pointer or if requested
        if (navigator.geolocation && !markerRef.current?.getLatLng().lat) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    if (mapRef.current && markerRef.current) {
                        mapRef.current.setView([latitude, longitude], 15);
                        markerRef.current.setLatLng([latitude, longitude]);
                        handleLocationUpdate(latitude, longitude);
                    }
                    setLoading(false);
                },
                (err) => {
                    console.error("Error getting location", err);
                    setLoading(false);
                }
            );
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [initialLat, initialLng]); // Removed onLocationSelect from deps as handleLocationUpdate uses it

    return (
        <div className="h-[300px] w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
            {(loading || isGeocoding) && (
                <div className="absolute inset-0 bg-white/60 z-[1000] flex flex-col items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-melagro-primary"></div>
                    <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">
                        {isGeocoding ? "Detecting Address..." : "Getting Location..."}
                    </p>
                </div>
            )}
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
