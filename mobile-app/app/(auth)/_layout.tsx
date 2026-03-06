/**
 * Auth Routes Layout
 * 
 * Guards auth routes (login, register) from logged-in users.
 * If user is already authenticated, redirects to the protected area.
 */

import { useEffect } from 'react';
import { Slot, router } from 'expo-router';
import { useAuthStore } from '../../src/lib/store';

export default function AuthLayout() {
    const { isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace('/(protected)/teacher/(tabs)/home' as any);
        }
    }, [isAuthenticated, isLoading]);

    // If authenticated (about to redirect), render nothing
    if (!isLoading && isAuthenticated) {
        return null;
    }

    return <Slot />;
}
