/**
 * Event Camera Component - Using ImagePicker
 * 
 * PHASE 3 CRITICAL SECURITY COMPONENT
 * 
 * Camera capture for task event evidence.
 * 
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  SECURITY ENFORCEMENT:                                         ║
 * ║  - Uses launchCameraAsync (no gallery access)                   ║
 * ║  - Photo must be taken inside app                              ║
 * ║  - No image caching or reuse                                   ║
 * ║  - Location captured at time of photo                          ║
 * ╚════════════════════════════════════════════════════════════════╝
 * 
 * NOTE: Switched from expo-camera to expo-image-picker due to 
 * SDK 54 compatibility issues with CameraView.takePictureAsync
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
import { EventType } from '../types';
import { getCurrentLocation, formatCoordinates, LocationResult } from '../utils/location';

/**
 * Props for EventCamera component.
 */
interface EventCameraProps {
    eventType: EventType;
    onCapture: (imageUri: string, latitude: number, longitude: number) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

/**
 * Capture state.
 */
type CaptureState = 'ready' | 'capturing' | 'preview' | 'getting-location';

/**
 * Event labels for UI.
 * Updated for 5-step exam paper tracking workflow.
 */
const EVENT_LABELS: Record<EventType, { title: string; instruction: string }> = {
    PICKUP_POLICE_STATION: {
        title: '🚔 Police Station Pickup',
        instruction: 'Take a clear photo of the sealed question paper pack at Police Station',
    },
    ARRIVAL_EXAM_CENTER: {
        title: '🏫 Exam Center Arrival',
        instruction: 'Take a photo confirming arrival at the examination center',
    },
    OPENING_SEAL: {
        title: '📦 Opening Seal',
        instruction: 'Take a photo of the sealed question paper pack before opening',
    },
    SEALING_ANSWER_SHEETS: {
        title: '✍️ Sealing Answer Sheets',
        instruction: 'Take a photo of the sealed answer sheets pack',
    },
    SUBMISSION_POST_OFFICE: {
        title: '📮 Post Office Submission',
        instruction: 'Take a photo of the sealed pack at Post Office submission',
    },
};

export default function EventCamera({
    eventType,
    onCapture,
    onCancel,
    isSubmitting,
}: EventCameraProps) {
    // Permissions
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

    // Capture state
    const [captureState, setCaptureState] = useState<CaptureState>('ready');

    // Captured data
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [location, setLocation] = useState<LocationResult | null>(null);

    /**
     * Request permissions on mount and auto-launch camera.
     */
    useEffect(() => {
        initializeAndCapture();
    }, []);

    /**
     * Initialize permissions and launch camera.
     */
    const initializeAndCapture = async () => {
        console.log('[Camera] Initializing...');

        // Request camera permission
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        setCameraPermission(cameraResult.granted);

        if (!cameraResult.granted) {
            console.log('[Camera] Camera permission denied');
            return;
        }

        // Request location permission
        const locationResult = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locationResult.status === 'granted');

        if (locationResult.status !== 'granted') {
            console.log('[Camera] Location permission denied');
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
            console.log('[Camera] Launching camera...');

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
                base64: false,
                exif: false,
            });

            console.log('[Camera] Camera result:', result.canceled ? 'Canceled' : 'Success');

            if (result.canceled) {
                // User canceled, go back
                onCancel();
                return;
            }

            if (!result.assets || result.assets.length === 0) {
                Alert.alert('Error', 'No photo was captured. Please try again.');
                setCaptureState('ready');
                return;
            }

            const photoAsset = result.assets[0];
            console.log('[Camera] Photo URI:', photoAsset.uri);
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
            console.error('[Camera] Error:', error);
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

    const eventLabel = EVENT_LABELS[eventType];

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
                    Camera access is required to capture evidence photos. Please enable it in settings.
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
                    Location access is required to verify where the photo was taken.
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

    // Ready state - show button to open camera
    if (captureState === 'ready') {
        return (
            <View style={styles.container}>
                <View style={styles.readyHeader}>
                    <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.readyContent}>
                    <Text style={styles.readyIcon}>📷</Text>
                    <Text style={styles.readyTitle}>{eventLabel.title}</Text>
                    <Text style={styles.readyInstruction}>{eventLabel.instruction}</Text>
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
                    <Text style={styles.previewTitle}>{eventLabel.title}</Text>
                    <Text style={styles.previewSubtitle}>Review your photo</Text>
                </View>

                <View style={styles.previewImageContainer}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                </View>

                <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>📍 Location Captured</Text>
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
});
