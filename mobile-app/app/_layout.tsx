/**
 * Root Layout
 *
 * App-wide layout that wraps all screens.
 * Initializes Zustand auth store (replaces AuthProvider).
 */
import 'react-native-get-random-values';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NotificationHandler } from '../src/components/NotificationHandler';
import Toast, { BaseToast, ErrorToast, BaseToastProps } from 'react-native-toast-message';
import { useAuthStore } from '../src/lib/store';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const toastConfig = {
    error: (props: BaseToastProps) => (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#1a1a2e',
                borderRadius: 16,
                marginHorizontal: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#ef4444',
            }}
        >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={22} color="#fff" />
            </View>
            <Text
                style={{ flex: 1, color: '#ffffff', fontSize: 15, fontWeight: '600', lineHeight: 20 }}
                numberOfLines={3}
            >
                {props.text2 || props.text1}
            </Text>
        </View>
    ),
    success: (props: BaseToastProps) => (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#1a1a2e',
                borderRadius: 16,
                marginHorizontal: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#22c55e',
            }}
        >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
            </View>
            <Text
                style={{ flex: 1, color: '#ffffff', fontSize: 15, fontWeight: '600', lineHeight: 20 }}
                numberOfLines={3}
            >
                {props.text2 || props.text1}
            </Text>
        </View>
    ),
};

export default function RootLayout() {
    const init = useAuthStore(s => s.init);

    useEffect(() => {
        const unsubscribe = init();
        return () => unsubscribe();
    }, [init]);

    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <NotificationHandler>
                <StatusBar style="light" />
                <QueryClientProvider client={queryClient}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: '#0f0f1a' },
                            animation: 'slide_from_right',
                        }}
                    />
                </QueryClientProvider>
                <Toast config={toastConfig} position="bottom" bottomOffset={40} />
            </NotificationHandler>
        </SafeAreaProvider>
    );
}

