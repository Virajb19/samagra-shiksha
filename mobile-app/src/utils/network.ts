/**
 * Network Utility
 * 
 * PHASE 4 HARDENING
 * 
 * Provides network connectivity checking before critical operations.
 * 
 * RELIABILITY:
 * - Check connectivity before upload attempts
 * - Provide clear feedback on network issues
 * - Prevent wasted upload attempts on dead connections
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Network status result.
 */
export interface NetworkStatus {
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string;
}

/**
 * Check current network connectivity.
 * 
 * @returns Network status with connection details
 */
export async function checkNetworkStatus(): Promise<NetworkStatus> {
    try {
        const state: NetInfoState = await NetInfo.fetch();

        console.log('[Network] Status:', {
            isConnected: state.isConnected,
            isInternetReachable: state.isInternetReachable,
            type: state.type,
        });

        return {
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable,
            type: state.type,
        };
    } catch (error) {
        console.error('[Network] Failed to check status:', error);
        // Assume connected if check fails - let the actual request fail
        return {
            isConnected: true,
            isInternetReachable: null,
            type: 'unknown',
        };
    }
}

/**
 * Check if device has internet connectivity.
 * Returns false only if we're confident there's no connection.
 */
export async function hasInternetConnection(): Promise<boolean> {
    const status = await checkNetworkStatus();

    // If we know for sure there's no connection, return false
    if (status.isConnected === false) {
        return false;
    }

    // If internet reachability is explicitly false, return false
    if (status.isInternetReachable === false) {
        return false;
    }

    // Otherwise, assume we have connection
    return true;
}

/**
 * Get user-friendly network error message.
 */
export function getNetworkErrorMessage(status: NetworkStatus): string {
    if (!status.isConnected) {
        return 'No network connection. Please connect to WiFi or mobile data.';
    }

    if (status.isInternetReachable === false) {
        return 'No internet access. Please check your connection.';
    }

    return 'Network issue detected. Please try again.';
}
