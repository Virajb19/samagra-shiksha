/**
 * Index Screen (Entry Point)
 * 
 * Redirects based on authentication state:
 * - Authenticated → Tasks list
 * - Not authenticated → Login
 * - Loading → Splash screen
 */

import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/lib/store';
import { AppText } from '@/components/AppText';

export default function Index() {
    const { isAuthenticated, isLoading } = useAuthStore();

    // Show loading screen while checking auth
    if (isLoading) {
        return (
            <View className="flex-1 bg-[#0f0f1a] justify-center items-center">
                <View className="items-center px-10">
                    <AppText className="text-3xl font-bold text-white mb-2 tracking-wide">Secure Delivery</AppText>
                    <AppText className="text-sm text-gray-500 mb-10 uppercase tracking-widest">Government Tracking System</AppText>
                    <ActivityIndicator
                        size="large"
                        color="#1565C0"
                        className="mb-4"
                    />
                    <AppText className="text-sm text-gray-400">Initializing...</AppText>
                </View>
            </View>
        );
    }

    // Redirect based on auth state
    if (isAuthenticated) {
        return <Redirect href="/(protected)/teacher/(tabs)/home" />;
    }

    return <Redirect href="/(auth)/login" />;
}
