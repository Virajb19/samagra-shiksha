/**
 * Application Configuration
 * 
 * SECURITY NOTE:
 * These values are bundled into the app.
 * Do NOT include secrets here.
 */

/**
 * Storage Keys
 * Used for SecureStore.
 */
export const STORAGE_KEYS = {
    /** JWT access token */
    ACCESS_TOKEN: 'access_token',
    /** JWT refresh token */
    REFRESH_TOKEN: 'refresh_token',
    /** Cached user data (JSON) */
    USER_DATA: 'user_data',
} as const;
