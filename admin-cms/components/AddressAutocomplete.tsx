'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';

interface AddressAutocompleteProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (address: string, lat: number, lng: number) => void;
    onClear: () => void;
    coordinates?: { lat: string; lng: string };
    className?: string;
}

// Declare Google Maps types
declare global {
    interface Window {
        google: typeof google;
        initGoogleMaps?: () => void;
    }
}

/**
 * Google Places Autocomplete component for address selection.
 * Automatically extracts coordinates from selected address.
 */
export function AddressAutocomplete({
    label,
    placeholder,
    value,
    onChange,
    onClear,
    coordinates,
    className = '',
}: AddressAutocompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load Google Maps script
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            setError('Google Maps API key not configured');
            setIsLoading(false);
            return;
        }

        if (window.google?.maps?.places) {
            setIsLoaded(true);
            setIsLoading(false);
            return;
        }

        // Check if script is already loading
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            const checkLoaded = setInterval(() => {
                if (window.google?.maps?.places) {
                    setIsLoaded(true);
                    setIsLoading(false);
                    clearInterval(checkLoaded);
                }
            }, 100);
            return () => clearInterval(checkLoaded);
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            setIsLoaded(true);
            setIsLoading(false);
        };

        script.onerror = () => {
            setError('Failed to load Google Maps');
            setIsLoading(false);
        };

        document.head.appendChild(script);
    }, []);

    // Initialize autocomplete when loaded
    useEffect(() => {
        if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

        try {
            // Create autocomplete with India bias
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ['establishment', 'geocode'],
                componentRestrictions: { country: 'in' },
                fields: ['formatted_address', 'geometry', 'name'],
            });

            // Listen for place selection
            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current?.getPlace();

                if (place?.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    const address = place.formatted_address || place.name || '';

                    onChange(address, lat, lng);
                }
            });
        } catch (err) {
            console.error('Failed to initialize autocomplete:', err);
            setError('Failed to initialize address search');
        }
    }, [isLoaded, onChange]);

    const hasCoordinates = coordinates?.lat && coordinates?.lng;

    if (error) {
        return (
            <div className={className}>
                <label className="block text-sm text-slate-400 mb-2">{label}</label>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            <label className="block text-sm text-slate-400 mb-2">{label}</label>

            <div className="relative">
                {/* Search input */}
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        defaultValue={value}
                        placeholder={isLoading ? 'Loading...' : placeholder}
                        disabled={isLoading}
                        className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
                    )}
                    {!isLoading && value && (
                        <button
                            type="button"
                            onClick={() => {
                                if (inputRef.current) inputRef.current.value = '';
                                onClear();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Coordinates display */}
                {hasCoordinates && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-green-400">
                            ✅ {parseFloat(coordinates.lat).toFixed(6)}, {parseFloat(coordinates.lng).toFixed(6)}
                        </span>
                        <span className="text-slate-500">• Geo-fence will be applied here</span>
                    </div>
                )}
            </div>
        </div>
    );
}
