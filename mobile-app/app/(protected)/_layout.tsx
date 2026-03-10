/**
 * Protected Routes Layout
 * 
 * Guards all routes in (protected) group.
 * Redirects to login if not authenticated.
 * Routes users based on their role.
 * 
 * AppShell wraps the entire layout so the Samagra Shiksha header
 * and bottom tab bar are visible on EVERY screen.
 */

import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { useAuthStore } from '../../src/lib/store';
import AppShell from '../../src/components/AppShell';

export default function ProtectedLayout() {
    const { isAuthenticated, isLoading, user } = useAuthStore();
    const segments = useSegments();

    // Redirect to login if not authenticated
    // Route to appropriate screen based on role
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/(auth)/login');
            return;
        }

        if (!isLoading && isAuthenticated && user) {
            const currentRoute = segments.join('/');

            // Shared routes accessible by all roles — don't redirect
            const sharedRoutes = ['activity-forms', 'ict-form', 'library-form', 'science-lab-form', 'self-defense-form', 'kgbv-form', 'nscbav-form', 'vocational-education-form', 'notices', 'edit-personal-details', 'helpdesk'];
            if (sharedRoutes.some((r) => currentRoute.includes(r))) return;

            // Route based on role
            if (user.role === 'TEACHER') {
                if (!currentRoute.includes('teacher')) {
                    router.replace('/(protected)/teacher/(tabs)/home');
                }
            } else if (user.role === 'HEADMASTER') {
                if (!currentRoute.includes('headmaster')) {
                    router.replace('/(protected)/headmaster/(tabs)/home');
                }
            } else if (user.role === 'KGBV_WARDEN') {
                if (!currentRoute.includes('kgbv-warden')) {
                    router.replace('/(protected)/kgbv-warden/(tabs)/home');
                }
            } else if (user.role === 'NSCBAV_WARDEN') {
                if (!currentRoute.includes('nscbav-warden')) {
                    router.replace('/(protected)/nscbav-warden/(tabs)/home');
                }
            } else if (user.role === 'IE_RESOURCE_PERSON') {
                if (!currentRoute.includes('ie-resource-person')) {
                    router.replace('/(protected)/ie-resource-person/(tabs)/home');
                }
            } else if (user.role === 'JUNIOR_ENGINEER') {
                if (!currentRoute.includes('junior-engineer')) {
                    router.replace('/(protected)/junior-engineer/(tabs)/home');
                }
            }
        }
    }, [isAuthenticated, isLoading, user, segments]);

    // Don't render until auth check complete
    if (isLoading || !isAuthenticated) {
        return null;
    }

    return (
        <AppShell>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#f3f4f6' },
                }}
            >
                <Stack.Screen name="teacher" />
                <Stack.Screen name="headmaster" />
                <Stack.Screen name="kgbv-warden" />
                <Stack.Screen name="nscbav-warden" />
                <Stack.Screen name="ie-resource-person" />
                <Stack.Screen name="junior-engineer" />
                <Stack.Screen name="activity-forms" />
                <Stack.Screen name="ict-form" />
                <Stack.Screen name="library-form" />
                <Stack.Screen name="science-lab-form" />
                <Stack.Screen name="self-defense-form" />
                <Stack.Screen name="kgbv-form" />
                <Stack.Screen name="nscbav-form" />
                <Stack.Screen name="vocational-education-form" />

                <Stack.Screen name="notices" />
                <Stack.Screen name="edit-personal-details" />
                <Stack.Screen name="helpdesk" />
            </Stack>
        </AppShell>
    );
}
