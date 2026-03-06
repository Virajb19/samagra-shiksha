/**
 * Notification Service — Expo Notifications + Firestore
 *
 * Keeps Expo Notifications for permissions, tokens, foreground handling.
 * All CRUD (fetch, mark-read, push-token registration) goes through
 * Firestore via firestore.service.ts.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
    getNotifications as fsGetNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    registerPushToken as fsRegisterPushToken,
    removePushToken as fsRemovePushToken,
} from './firebase/notifications.firestore';

//  Types 

export interface NotificationItem {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: string | null;
    is_read: boolean;
    created_at: string;
}

export interface NotificationsResponse {
    notifications: NotificationItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

//  Foreground handler 

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

//  Permissions & token 

/** Request notification permissions. */
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
        console.log('[Notifications] Must use physical device for push notifications');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return false;
    }

    return true;
}

/** Get the Expo push token for this device. */
export async function getExpoPushToken(): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return null;

        // Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4f8cff',
            });
        }

        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log('[Notifications] Expo Push Token:', tokenData.data);
        return tokenData.data;
    } catch (error) {
        console.error('[Notifications] Error getting Expo push token:', error);
        return null;
    }
}

/** Alias kept for backward compatibility. */
export const getFCMToken = getExpoPushToken;

//  Token registration (Firestore) 

/** Register the push token in Firestore for the given user. */
export async function registerPushToken(userId: string, pushToken: string): Promise<boolean> {
    try {
        await fsRegisterPushToken(userId, pushToken);
        console.log('[Notifications] Push token registered in Firestore');
        return true;
    } catch (error) {
        console.error('[Notifications] Error registering push token:', error);
        return false;
    }
}

/** Remove the push token from Firestore for the given user. */
export async function removePushToken(userId: string): Promise<boolean> {
    try {
        await fsRemovePushToken(userId);
        return true;
    } catch (error) {
        console.error('[Notifications] Error removing push token:', error);
        return false;
    }
}

/** Initialize push notifications — call after successful login. */
export async function initializePushNotifications(userId: string): Promise<void> {
    const pushToken = await getExpoPushToken();
    if (pushToken) {
        await registerPushToken(userId, pushToken);
    }
}

//  Notification CRUD (Firestore) 

/** Fetch paginated notifications for a user. */
export async function getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
): Promise<NotificationsResponse | null> {
    try {
        const result = await fsGetNotifications(userId, page, limit);
        return result;
    } catch (error) {
        console.error('[Notifications] Error fetching notifications:', error);
        return null;
    }
}

/** Get unread notification count for a user. */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        return await getUnreadNotificationCount(userId);
    } catch (error) {
        console.error('[Notifications] Error fetching unread count:', error);
        return 0;
    }
}

/** Mark a single notification as read. */
export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        await markNotificationAsRead(notificationId);
        return true;
    } catch (error) {
        console.error('[Notifications] Error marking as read:', error);
        return false;
    }
}

/** Mark all notifications as read for a user. */
export async function markAllAsRead(userId: string): Promise<boolean> {
    try {
        await markAllNotificationsAsRead(userId);
        return true;
    } catch (error) {
        console.error('[Notifications] Error marking all as read:', error);
        return false;
    }
}

//  Expo listener helpers 

export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return Notifications.getLastNotificationResponseAsync();
}

//  Convenience export 

export const notificationService = {
    getFCMToken,
    getExpoPushToken,
    registerPushToken,
    removePushToken,
    initializePushNotifications,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    getLastNotificationResponse,
};
