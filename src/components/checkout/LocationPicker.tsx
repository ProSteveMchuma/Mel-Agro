"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Next.js
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address?: string) => void;
    initialLat?: number;
    initialLng?: number;
}

function LocationMarker({ position, setPosition, onLocationSelect }: any) {
    const markerRef = useRef<L.Marker>(null);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker) {
                    const newPos = marker.getLatLng();
                    setPosition(newPos);
                    onLocationSelect(newPos.lat, newPos.lng);
                }
            },
        }),
        [onLocationSelect, setPosition],
    );

    return position === null ? null : (
        <Marker
            position={position}
            icon={icon}
            draggable={true}
            // @ts-ignore
            eventHandlers={eventHandlers}
            ref={markerRef}
        >
            <Popup>Delivery Location</Popup>
        </Marker>
    );
}

export default function LocationPicker({ onLocationSelect, initialLat = -1.2921, initialLng = 36.8219 }: LocationPickerProps) {
    // Default to Nairobi
    const [position, setPosition] = useState<L.LatLng | null>(new L.LatLng(initialLat, initialLng));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Try to get user's current location
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const newPos = new L.LatLng(latitude, longitude);
                    setPosition(newPos);
                    onLocationSelect(latitude, longitude);
                    setLoading(false);
                },
                (err) => {
                    console.error("Error getting location", err);
                    setLoading(false);
                }
            );
        }
    }, [onLocationSelect]);

    return (
        <div className="h-[300px] w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
            {loading && (
                <div className="absolute inset-0 bg-white/80 z-[1000] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-melagro-primary"></div>
                </div>
            )}
            <MapContainer
                center={[initialLat, initialLng]}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
            </MapContainer>
        </div>
    );
}
