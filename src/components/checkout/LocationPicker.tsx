"use client";

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

// Leaflet CSS is handled via CDN link in the page or global import
// We use L directly to avoid react-leaflet build issues in this environment

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address?: string) => void;
    initialLat?: number;
    initialLng?: number;
}

export default function LocationPicker({ onLocationSelect, initialLat = -1.2921, initialLng = 36.8219 }: LocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [loading, setLoading] = useState(false);

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
                    onLocationSelect(pos.lat, pos.lng);
                }
            });

            mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
                if (markerRef.current) {
                    markerRef.current.setLatLng(e.latlng);
                    onLocationSelect(e.latlng.lat, e.latlng.lng);
                }
            });
        }

        // Try to get user's current location
        if (navigator.geolocation && !markerRef.current?.getLatLng().lat) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    if (mapRef.current && markerRef.current) {
                        mapRef.current.setView([latitude, longitude], 15);
                        markerRef.current.setLatLng([latitude, longitude]);
                        onLocationSelect(latitude, longitude);
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
    }, [onLocationSelect, initialLat, initialLng]);

    return (
        <div className="h-[300px] w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
            {loading && (
                <div className="absolute inset-0 bg-white/80 z-[1000] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-melagro-primary"></div>
                </div>
            )}
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
