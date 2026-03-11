/**
 * Root Layout
 *
 * App-wide layout that wraps all screens.
 * Initializes Zustand auth store (replaces AuthProvider).
 * Loads Lato Regular font globally via expo-font config plugin + useFonts.
 */
import 'react-native-get-random-values';
import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { useAuthStore } from '../src/lib/store';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync();

const toastConfig = {
    error: (props: BaseToastProps) => (
        <View className="mx-4 mb-1 rounded-2xl bg-red-500 px-3 py-3" style={{ elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
            <View className="flex-row items-start">
            <View className="w-9 h-9 rounded-full bg-red-500 justify-center items-center shrink-0">
                <Ionicons name="alert-circle" size={22} color="#fff" />
            </View>
                <View className="ml-3 flex-1">
                    <Text
                        numberOfLines={3}
                        style={{
                            color: '#ffffff',
                            fontSize: 14,
                            lineHeight: 20,
                            fontFamily: 'Lato-Regular',
                        }}
                    >
                        {props.text2 || props.text1 || 'Something went wrong.'}
                    </Text>
                </View>
            </View>
        </View>
    ),
    success: (props: BaseToastProps) => (
        <View className="mx-4 mb-1 rounded-2xl bg-green-500 px-3 py-3" style={{ elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
            <View className="flex-row items-start">
                <View className="w-9 h-9 rounded-full bg-green-500 justify-center items-center shrink-0">
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
            </View>
                <View className="ml-3 flex-1">
                    <Text
                        numberOfLines={3}
                        style={{
                            color: '#ffffff',
                            fontSize: 14,
                            lineHeight: 20,
                            fontFamily: 'Lato-Regular',
                        }}
                    >
                        {props.text2 || props.text1 || 'Done successfully.'}
                    </Text>
                </View>
            </View>
        </View>
    ),
};

export default function RootLayout() {
    const init = useAuthStore(s => s.init);

    const [fontsLoaded] = useFonts({
        'Lato-Regular': require('../assets/Lato-Regular.ttf'),
        'Lato-Bold': require('../assets/Lato-Bold.ttf'),
        'Lato-Light': require('../assets/Lato-Light.ttf'),
    });

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            // Monkey-patch Text.render to inject Lato-Regular as the default font.
            // This works with NativeWind because the font is set as the base,
            // and NativeWind/user styles merge on top of it.
            const originalRender = (Text as any).render;
            if (originalRender && !(Text as any).__fontPatched) {
                (Text as any).render = function (props: any, ref: any) {
                    const baseStyle = { fontFamily: 'Lato-Regular' };
                    const mergedProps = {
                        ...props,
                        style: [baseStyle, props.style],
                    };
                    return originalRender.call(this, mergedProps, ref);
                };
                (Text as any).__fontPatched = true;
            }

            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    useEffect(() => {
        const unsubscribe = init();
        return () => unsubscribe();
    }, [init]);

    useEffect(() => {
        onLayoutRootView();
    }, [onLayoutRootView]);

    if (!fontsLoaded) return null;

    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
                <Toast config={toastConfig} position="bottom" bottomOffset={90} />
        </SafeAreaProvider>
    );
}
