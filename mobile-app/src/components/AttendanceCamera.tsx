/**
 * Attendance Camera Component
 * 
 * Camera capture for geo-fenced attendance.
 * Similar to EventCamera but specialized for attendance marking.
 * 
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  FEATURES:                                                      ║
 * ║  - Photo capture with GPS location                             ║
 * ║  - Shows distance from target location                         ║
 * ║  - Geo-fence status indicator                                  ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { getCurrentLocation, formatCoordinates, LocationResult } from '../utils/location';

/**
 * Props for AttendanceCamera component.
 */
interface AttendanceCameraProps {
    locationType: 'PICKUP' | 'DESTINATION';
    targetLat?: number;
    targetLng?: number;
    geofenceRadius?: number;
    onCapture: (imageUri: string, latitude: number, longitude: number) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

/**
 * Capture state.
 */
type CaptureState = 'checking-location' | 'out-of-range' | 'ready' | 'capturing' | 'preview' | 'getting-location';

/**
 * Calculate distance between two GPS coordinates using Haversine formula.
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export default function AttendanceCamera({
    locationType,
    targetLat,
    targetLng,
    geofenceRadius = 100,
    onCapture,
    onCancel,
    isSubmitting,
}: AttendanceCameraProps) {
    // Permissions
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

    // Capture state - starts with location check
    const [captureState, setCaptureState] = useState<CaptureState>('checking-location');

    // Current user location (for geofence check)
    const [currentUserLocation, setCurrentUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [initialDistance, setInitialDistance] = useState<number | null>(null);

    // Captured data
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [location, setLocation] = useState<LocationResult | null>(null);

    // Calculated values
    const [distance, setDistance] = useState<number | null>(null);
    const [isWithinGeofence, setIsWithinGeofence] = useState(false);

    const locationLabel = locationType === 'PICKUP' ? 'Pickup Location' : 'Destination';

    /**
     * Request permissions on mount and check location first.
     */
    useEffect(() => {
        checkLocationFirst();
    }, []);

    /**
     * Calculate distance when location is captured.
     */
    useEffect(() => {
        if (location?.success && location.latitude && location.longitude && targetLat && targetLng) {
            const dist = calculateDistance(
                location.latitude,
                location.longitude,
                targetLat,
                targetLng
            );
            setDistance(dist);
            setIsWithinGeofence(dist <= geofenceRadius);
        }
    }, [location, targetLat, targetLng, geofenceRadius]);

    /**
     * Check location first before allowing camera access.
     * This enforces the 100m geofence requirement.
     */
    const checkLocationFirst = async () => {
        console.log('[Attendance] Checking location first...');
        setCaptureState('checking-location');

        // Request location permission
        const locationResult = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locationResult.status === 'granted');

        if (locationResult.status !== 'granted') {
            console.log('[Attendance] Location permission denied');
            return;
        }

        // Get current location
        try {
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const userLat = currentLocation.coords.latitude;
            const userLng = currentLocation.coords.longitude;
            setCurrentUserLocation({ latitude: userLat, longitude: userLng });

            // Check if target coordinates exist
            if (targetLat !== undefined && targetLng !== undefined) {
                const dist = calculateDistance(userLat, userLng, targetLat, targetLng);
                setInitialDistance(dist);

                console.log(`[Attendance] Distance from ${locationType}: ${dist.toFixed(0)}m`);

                if (dist > geofenceRadius) {
                    // Outside geofence - block attendance
                    console.log(`[Attendance] BLOCKED - Outside ${geofenceRadius}m geofence`);
                    setCaptureState('out-of-range');
                    return;
                }
            } else {
                console.log('[Attendance] No target coordinates set, allowing attendance');
            }

            // Within geofence or no coordinates - proceed to camera
            await requestCameraAndCapture();

        } catch (error) {
            console.error('[Attendance] Location error:', error);
            Alert.alert(
                'Location Error',
                'Failed to get your current location. Please ensure GPS is enabled and try again.',
                [
                    { text: 'Retry', onPress: checkLocationFirst },
                    { text: 'Cancel', onPress: onCancel, style: 'cancel' },
                ]
            );
        }
    };

    /**
     * Request camera permission and launch camera.
     */
    const requestCameraAndCapture = async () => {
        // Request camera permission
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        setCameraPermission(cameraResult.granted);

        if (!cameraResult.granted) {
            console.log('[Attendance] Camera permission denied');
            return;
        }

        // Launch camera
        setCaptureState('ready');
        launchCamera();
    };

    /**
     * Initialize permissions and launch camera.
     */
    const initializeAndCapture = async () => {
        console.log('[Attendance] Initializing...');

        // Request camera permission
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        setCameraPermission(cameraResult.granted);

        if (!cameraResult.granted) {
            console.log('[Attendance] Camera permission denied');
            return;
        }

        // Request location permission
        const locationResult = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locationResult.status === 'granted');

        if (locationResult.status !== 'granted') {
            console.log('[Attendance] Location permission denied');
            return;
        }

        // Auto-launch camera
        launchCamera();
    };

    /**
     * Launch camera to capture photo.
     */
    const launchCamera = async () => {
        try {
            setCaptureState('capturing');
            console.log('[Attendance] Launching camera...');

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            console.log('[Attendance] Camera result:', result.canceled ? 'Canceled' : 'Success');

            if (result.canceled) {
                onCancel();
                return;
            }

            if (!result.assets || result.assets.length === 0) {
                Alert.alert('Error', 'No photo was captured. Please try again.');
                setCaptureState('ready');
                return;
            }

            const photoAsset = result.assets[0];
            console.log('[Attendance] Photo URI:', photoAsset.uri);
            setPhotoUri(photoAsset.uri);

            // Get location
            setCaptureState('getting-location');
            const locationData = await getCurrentLocation();
            setLocation(locationData);

            if (!locationData.success) {
                Alert.alert(
                    'Location Error',
                    locationData.error || 'Failed to get location.',
                    [
                        { text: 'Retry', onPress: () => retryLocation() },
                        { text: 'Cancel', onPress: () => onCancel(), style: 'cancel' },
                    ]
                );
                return;
            }

            setCaptureState('preview');

        } catch (error) {
            console.error('[Attendance] Error:', error);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
            setCaptureState('ready');
        }
    };

    /**
     * Retry getting location.
     */
    const retryLocation = async () => {
        setCaptureState('getting-location');
        const locationData = await getCurrentLocation();
        setLocation(locationData);

        if (locationData.success) {
            setCaptureState('preview');
        } else {
            Alert.alert(
                'Location Error',
                'Still unable to get location. Please ensure GPS is enabled.',
                [
                    { text: 'Retry', onPress: () => retryLocation() },
                    { text: 'Cancel', onPress: () => onCancel(), style: 'cancel' },
                ]
            );
        }
    };

    /**
     * Retake photo.
     */
    const retakePhoto = () => {
        setPhotoUri(null);
        setLocation(null);
        setDistance(null);
        launchCamera();
    };

    /**
     * Confirm and submit.
     */
    const confirmPhoto = () => {
        if (!photoUri || !location?.success || location.latitude === undefined || location.longitude === undefined) {
            Alert.alert('Error', 'Photo and location are required.');
            return;
        }

        onCapture(photoUri, location.latitude, location.longitude);
    };

    /**
     * Open settings.
     */
    const openSettings = useCallback(() => {
        Linking.openSettings();
    }, []);

    /**
     * Format distance for display.
     */
    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${meters.toFixed(0)} meters`;
        }
        return `${(meters / 1000).toFixed(2)} km`;
    };

    // Checking location state
    if (captureState === 'checking-location') {
        return (
            <View style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4f8cff" />
                    <Text style={styles.loadingText}>Checking your location...</Text>
                    <Text style={styles.subText}>
                        Verifying you are at the {locationType === 'PICKUP' ? 'pickup' : 'destination'} location
                    </Text>
                </View>
            </View>
        );
    }

    // Out of range state - BLOCKS attendance
    if (captureState === 'out-of-range') {
        return (
            <View style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.outOfRangeIcon}>📍</Text>
                    <Text style={styles.outOfRangeTitle}>Outside {locationType === 'PICKUP' ? 'Pickup' : 'Destination'} Area</Text>
                    <Text style={styles.outOfRangeText}>
                        You must be within {geofenceRadius} meters of the {locationType === 'PICKUP' ? 'pickup' : 'destination'} location to mark attendance.
                    </Text>
                    
                    {initialDistance !== null && (
                        <View style={styles.distanceBox}>
                            <Text style={styles.distanceLabel}>Current distance:</Text>
                            <Text style={styles.distanceValue}>{formatDistance(initialDistance)}</Text>
                            <Text style={styles.distanceRequired}>Required: Within {geofenceRadius}m</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.refreshButton} onPress={checkLocationFirst}>
                        <Text style={styles.refreshButtonText}>🔄 Refresh Location</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                        <Text style={styles.cancelButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Loading state
    if (cameraPermission === null || locationPermission === null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4f8cff" />
                <Text style={styles.loadingText}>Preparing camera...</Text>
            </View>
        );
    }

    // Camera permission denied
    if (!cameraPermission) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionIcon}>📷</Text>
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>
                    Camera access is required to capture attendance photos.
                </Text>
                <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
                    <Text style={styles.settingsButtonText}>⚙️ Open Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Location permission denied
    if (!locationPermission) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionIcon}>📍</Text>
                <Text style={styles.permissionTitle}>Location Permission Required</Text>
                <Text style={styles.permissionText}>
                    Location access is required for geo-fence validation.
                </Text>
                <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
                    <Text style={styles.settingsButtonText}>⚙️ Open Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Capturing or getting location
    if (captureState === 'capturing' || captureState === 'getting-location') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4f8cff" />
                <Text style={styles.loadingText}>
                    {captureState === 'capturing' ? 'Opening camera...' : 'Getting location...'}
                </Text>
            </View>
        );
    }

    // Ready state
    if (captureState === 'ready') {
        return (
            <View style={styles.container}>
                <View style={styles.readyHeader}>
                    <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.readyContent}>
                    <Text style={styles.readyIcon}>📸</Text>
                    <Text style={styles.readyTitle}>{locationLabel} Attendance</Text>
                    <Text style={styles.readyInstruction}>
                        Take a selfie or photo to mark your attendance
                    </Text>
                    <TouchableOpacity style={styles.captureButton} onPress={launchCamera}>
                        <Text style={styles.captureButtonText}>Open Camera</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.securityNotice}>
                    <Text style={styles.securityText}>
                        🔒 Photo will be verified with GPS and timestamp
                    </Text>
                </View>
            </View>
        );
    }

    // Preview mode
    if (captureState === 'preview' && photoUri && location?.success) {
        return (
            <View style={styles.container}>
                <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>{locationLabel} Attendance</Text>
                    <Text style={styles.previewSubtitle}>Review your photo</Text>
                </View>

                <View style={styles.previewImageContainer}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                </View>

                {/* Geo-fence Status */}
                {distance !== null && targetLat && targetLng && (
                    <View style={[
                        styles.geofenceStatus,
                        isWithinGeofence ? styles.geofenceInside : styles.geofenceOutside
                    ]}>
                        <Text style={styles.geofenceIcon}>
                            {isWithinGeofence ? '✅' : '⚠️'}
                        </Text>
                        <View>
                            <Text style={[
                                styles.geofenceText,
                                isWithinGeofence ? styles.geofenceTextInside : styles.geofenceTextOutside
                            ]}>
                                {isWithinGeofence ? 'Within Designated Area' : 'Outside Designated Area'}
                            </Text>
                            <Text style={styles.distanceText}>
                                Distance: {formatDistance(distance)} (Radius: {geofenceRadius}m)
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>📍 Your Location</Text>
                    <Text style={styles.locationText}>
                        {formatCoordinates(location.latitude!, location.longitude!)}
                    </Text>
                    {location.accuracy && (
                        <Text style={styles.accuracyText}>
                            Accuracy: ±{location.accuracy.toFixed(0)}m
                        </Text>
                    )}
                </View>

                <View style={styles.previewActions}>
                    <TouchableOpacity
                        style={styles.retakeButton}
                        onPress={retakePhoto}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.retakeButtonText}>📷 Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
                        onPress={confirmPhoto}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.confirmButtonText}>✓ Submit</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 16,
        marginTop: 16,
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    permissionIcon: {
        fontSize: 64,
        marginBottom: 24,
    },
    permissionTitle: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        color: '#9ca3af',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    settingsButton: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    settingsButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        padding: 12,
    },
    cancelButtonText: {
        color: '#6b7280',
        fontSize: 16,
    },
    readyHeader: {
        position: 'absolute',
        top: 48,
        left: 16,
        zIndex: 10,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    readyContent: {
        alignItems: 'center',
        padding: 32,
    },
    readyIcon: {
        fontSize: 64,
        marginBottom: 24,
    },
    readyTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    readyInstruction: {
        color: '#9ca3af',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
    },
    captureButton: {
        backgroundColor: '#4f8cff',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 12,
    },
    captureButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    securityNotice: {
        position: 'absolute',
        bottom: 32,
        left: 16,
        right: 16,
        padding: 12,
        backgroundColor: 'rgba(79, 140, 255, 0.1)',
        borderRadius: 8,
    },
    securityText: {
        color: '#4f8cff',
        fontSize: 12,
        textAlign: 'center',
    },
    previewHeader: {
        padding: 20,
        paddingTop: 48,
        alignItems: 'center',
    },
    previewTitle: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '700',
    },
    previewSubtitle: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 4,
    },
    previewImageContainer: {
        flex: 1,
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        maxHeight: 350,
        minHeight: 250,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    geofenceStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    geofenceInside: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: '#10b981',
    },
    geofenceOutside: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    geofenceIcon: {
        fontSize: 24,
    },
    geofenceText: {
        fontSize: 15,
        fontWeight: '600',
    },
    geofenceTextInside: {
        color: '#10b981',
    },
    geofenceTextOutside: {
        color: '#f59e0b',
    },
    distanceText: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
    locationInfo: {
        backgroundColor: '#1a1a2e',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    locationLabel: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    locationText: {
        color: '#ffffff',
        fontSize: 13,
        fontFamily: 'monospace',
    },
    accuracyText: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
    },
    previewActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    retakeButton: {
        flex: 1,
        backgroundColor: '#2d2d44',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    retakeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    // New styles for geofence enforcement
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    subText: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    outOfRangeIcon: {
        fontSize: 80,
        marginBottom: 16,
    },
    outOfRangeTitle: {
        color: '#ef4444',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    outOfRangeText: {
        color: '#9ca3af',
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 24,
    },
    distanceBox: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 20,
        marginTop: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ef4444',
        width: '100%',
    },
    distanceLabel: {
        color: '#9ca3af',
        fontSize: 14,
    },
    distanceValue: {
        color: '#ef4444',
        fontSize: 40,
        fontWeight: '700',
        marginTop: 8,
    },
    distanceRequired: {
        color: '#6b7280',
        fontSize: 13,
        marginTop: 8,
    },
    refreshButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginTop: 32,
    },
    refreshButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
