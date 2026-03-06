/**
 * Notification Handler Component
 * 
 * Handles foreground notifications and notification taps.
 * Should be mounted at app root level.
 */

import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface NotificationHandlerProps {
    children: React.ReactNode;
}

/**
 * Get navigation route based on notification type
 */
function getRouteFromNotificationType(type: string | undefined): string | null {
    switch (type) {
        case 'ACCOUNT_ACTIVATED':
        case 'ACCOUNT_DEACTIVATED':
            return null; // Stay on current screen
        case 'PROFILE_APPROVED':
        case 'PROFILE_REJECTED':
            return '/(protected)/profile';
        case 'NEW_CIRCULAR':
            return '/(protected)/circulars';
        case 'NEW_EVENT':
            return '/(protected)/events';
        case 'NEW_NOTICE':
            return '/(protected)/notices';
        case 'TASK_ASSIGNED':
            return '/(protected)/tasks';
        case 'HELPDESK_REPLY':
            return '/(protected)/helpdesk';
        default:
            return null;
    }
}

/**
 * Notification Handler Component
 * 
 * Sets up listeners for:
 * - Foreground notifications (show toast)
 * - Notification taps (navigate to relevant screen)
 */
export function NotificationHandler({ children }: NotificationHandlerProps) {
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        // Handle foreground notifications
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                const { title, body } = notification.request.content;
                
                // Show toast for foreground notifications
                Toast.show({
                    type: 'info',
                    text1: title || 'Notification',
                    text2: body || '',
                    position: 'top',
                    visibilityTime: 4000,
                    topOffset: 50,
                });

                console.log('[Notification] Received in foreground:', title);
            },
        );

        // Handle notification tap (when user taps on notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;
                const type = data?.type as string | undefined;

                console.log('[Notification] User tapped notification, type:', type);

                // Navigate to relevant screen
                const route = getRouteFromNotificationType(type);
                if (route) {
                    try {
                        router.push(route as any);
                    } catch (error) {
                        console.error('[Notification] Navigation error:', error);
                    }
                }
            },
        );

        // Check for notification that opened the app
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                const data = response.notification.request.content.data;
                const type = data?.type as string | undefined;
                
                console.log('[Notification] App opened from notification, type:', type);
                
                // Navigate after a short delay to ensure app is ready
                setTimeout(() => {
                    const route = getRouteFromNotificationType(type);
                    if (route) {
                        try {
                            router.push(route as any);
                        } catch (error) {
                            console.error('[Notification] Navigation error:', error);
                        }
                    }
                }, 1000);
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return <>{children}</>;
}

export default NotificationHandler;
