/**
 * Secure Storage Utilities
 * 
 * Uses expo-secure-store for AES-256 encrypted storage.
 * This is MANDATORY for government-grade security.
 * 
 * SECURITY NOTES:
 * - All sensitive data (tokens) MUST use these functions
 * - Never use AsyncStorage for sensitive data
 * - SecureStore uses iOS Keychain / Android Keystore
 */

import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/config';
import { User } from '../types';

/**
 * Store a value securely.
 * 
 * @param key - Storage key
 * @param value - Value to store
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(key, value, {
            // Require device authentication for extra security
            // Disabled for now to avoid UX friction, can be enabled for higher security
            // requireAuthentication: true,
        });
    } catch (error) {
        console.error(`[SecureStore] Failed to set ${key}:`, error);
        throw new Error(`Failed to store secure data`);
    }
}

/**
 * Retrieve a value from secure storage.
 * 
 * @param key - Storage key
 * @returns The stored value or null if not found
 */
export async function getSecureItem(key: string): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(key);
    } catch (error) {
        console.error(`[SecureStore] Failed to get ${key}:`, error);
        return null;
    }
}

/**
 * Delete a value from secure storage.
 * 
 * @param key - Storage key
 */
export async function deleteSecureItem(key: string): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(key);
    } catch (error) {
        console.error(`[SecureStore] Failed to delete ${key}:`, error);
        // Don't throw - deletion failure is not critical
    }
}

// ============================================
// Token Management
// ============================================

/**
 * Store the access token securely.
 */
export async function storeAccessToken(token: string): Promise<void> {
    await setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

/**
 * Retrieve the access token.
 */
export async function getAccessToken(): Promise<string | null> {
    return getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Clear the access token (logout).
 */
export async function clearAccessToken(): Promise<void> {
    await deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Store the refresh token securely.
 */
export async function storeRefreshToken(token: string): Promise<void> {
    await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, token);
}

/**
 * Retrieve the refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
    return getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Clear the refresh token.
 */
export async function clearRefreshToken(): Promise<void> {
    await deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
}

// ============================================
// User Data Management
// ============================================

/**
 * Store user data (cached for offline display).
 */
export async function storeUserData(user: User): Promise<void> {
    await setSecureItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
}

/**
 * Retrieve cached user data.
 */
export async function getUserData(): Promise<User | null> {
    const data = await getSecureItem(STORAGE_KEYS.USER_DATA);
    if (!data) return null;

    try {
        return JSON.parse(data) as User;
    } catch {
        return null;
    }
}

/**
 * Clear user data (logout).
 */
export async function clearUserData(): Promise<void> {
    await deleteSecureItem(STORAGE_KEYS.USER_DATA);
}

// ============================================
// Full Logout (Clear All Auth Data)
// ============================================

/**
 * Clear all authentication data.
 */
export async function clearAuthData(): Promise<void> {
    await Promise.all([
        clearAccessToken(),
        clearRefreshToken(),
        clearUserData(),
    ]);
}
