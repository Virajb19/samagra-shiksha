
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerMapProps {
    label: string;
    latitude: string;
    longitude: string;
    radius?: number;
    onLocationChange: (lat: number, lng: number) => void;
    className?: string;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Default center (Nagaland, India)
const DEFAULT_CENTER: [number, number] = [25.6747, 94.1086];

/**
 * Interactive map component for picking geo-fence location.
 * Click on the map to set coordinates.
 */
export function LocationPickerMap({
    label,
    latitude,
    longitude,
    radius = 100,
    onLocationChange,
    className = '',
}: LocationPickerMapProps) {
    const [isOpen, setIsOpen] = useState(false);
    const mapRef = useRef<L.Map | null>(null);

    // Parse coordinates
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

    // Map center
    const center: [number, number] = hasLocation ? [lat, lng] : DEFAULT_CENTER;

    const handleLocationSelect = (newLat: number, newLng: number) => {
        onLocationChange(newLat, newLng);
    };

    // Get current location from browser
    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude: lat, longitude: lng } = position.coords;
                    onLocationChange(lat, lng);
                    if (mapRef.current) {
                        mapRef.current.setView([lat, lng], 16);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Could not get your location. Please click on the map to select.');
                }
            );
        }
    };

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">{label}</label>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                >
                    {isOpen ? '🗺️ Hide Map' : '🗺️ Pick on Map'}
                </button>
            </div>

            {/* Coordinate display */}
            {hasLocation && (
                <div className="text-xs text-green-400 mb-2 flex items-center gap-2">
                    <span>✅ {lat.toFixed(6)}, {lng.toFixed(6)}</span>
                    <button
                        type="button"
                        onClick={() => onLocationChange(0, 0)}
                        className="text-red-400 hover:text-red-300"
                    >
                        ✕ Clear
                    </button>
                </div>
            )}

            {/* Map container */}
            {isOpen && (
                <div className="border border-slate-600 rounded-lg overflow-hidden mb-3">
                    {/* Toolbar */}
                    <div className="bg-slate-800 px-3 py-2 flex items-center justify-between text-xs">
                        <span className="text-slate-400">👆 Click on map to select location</span>
                        <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            📍 Use My Location
                        </button>
                    </div>

                    {/* Map */}
                    <div className="h-64">
                        <MapContainer
                            center={center}
                            zoom={hasLocation ? 15 : 9}
                            style={{ height: '100%', width: '100%' }}
                            ref={mapRef}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapClickHandler onLocationSelect={handleLocationSelect} />

                            {/* Show marker and radius circle if location is set */}
                            {hasLocation && (
                                <>
                                    <Marker position={[lat, lng]} />
                                    <Circle
                                        center={[lat, lng]}
                                        radius={radius}
                                        pathOptions={{
                                            color: '#3b82f6',
                                            fillColor: '#3b82f6',
                                            fillOpacity: 0.2,
                                        }}
                                    />
                                </>
                            )}
                        </MapContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
