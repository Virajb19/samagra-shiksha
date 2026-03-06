/**
 * GPS Location Utility
 * 
 * PHASE 3 SECURITY COMPONENT
 * 
 * Captures device GPS coordinates for event verification.
 * 
 * SECURITY NOTES:
 * - Location is captured at time of photo
 * - High accuracy mode for government requirements
 * - Proper permission handling
 */

import * as Location from 'expo-location';

/**
 * Location result type.
 */
export interface LocationResult {
    success: boolean;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    error?: string;
    errorCode?: 'PERMISSION_DENIED' | 'LOCATION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

/**
 * Request location permissions.
 * 
 * @returns Whether permission was granted
 */
export async function requestLocationPermission(): Promise<boolean> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('[Location] Permission request failed:', error);
        return false;
    }
}

/**
 * Check if location permission is granted.
 */
export async function hasLocationPermission(): Promise<boolean> {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('[Location] Permission check failed:', error);
        return false;
    }
}

/**
 * Get current device location.
 * 
 * Uses high accuracy mode for government-grade tracking.
 * 
 * @returns Location result with coordinates or error
 */
export async function getCurrentLocation(): Promise<LocationResult> {
    try {
        console.log('[Location] Getting current location...');

        // Check permission first
        const hasPermission = await hasLocationPermission();
        if (!hasPermission) {
            console.log('[Location] Permission not granted');
            return {
                success: false,
                error: 'Location permission not granted. Please enable location access in settings.',
                errorCode: 'PERMISSION_DENIED',
            };
        }

        // Get current position with high accuracy
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        console.log('[Location] Location obtained:', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
        });

        return {
            success: true,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
        };

    } catch (error) {
        console.error('[Location] Failed to get location:', error);

        // Determine error type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('timeout')) {
            return {
                success: false,
                error: 'Location request timed out. Please try again.',
                errorCode: 'TIMEOUT',
            };
        }

        if (errorMessage.includes('unavailable') || errorMessage.includes('disabled')) {
            return {
                success: false,
                error: 'Location services are unavailable. Please enable GPS.',
                errorCode: 'LOCATION_UNAVAILABLE',
            };
        }

        return {
            success: false,
            error: 'Failed to get location. Please try again.',
            errorCode: 'UNKNOWN',
        };
    }
}

/**
 * Format coordinates for display.
 */
export function formatCoordinates(latitude: number, longitude: number): string {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lonDir}`;
}
