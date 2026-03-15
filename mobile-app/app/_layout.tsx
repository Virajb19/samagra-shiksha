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
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../src/components/AppText';
import { GlobalLoader } from '../src/components/GlobalLoader';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync();

const toastConfig = {
    error: (props: BaseToastProps) => (
        <View style={{ width: '92%', alignSelf: 'center', marginBottom: 4, borderRadius: 16, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 12, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="alert-circle" size={22} color="#fff" />
                </View>
                <AppText
                    numberOfLines={3}
                    style={{ color: '#ffffff', fontSize: 14, lineHeight: 20, marginLeft: 12, flexShrink: 1 }}
                >
                    {props.text2 || props.text1 || 'Something went wrong.'}
                </AppText>
            </View>
        </View>
    ),
    success: (props: BaseToastProps) => (
        <View style={{ width: '92%', alignSelf: 'center', marginBottom: 4, borderRadius: 16, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 12, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                </View>
                <AppText
                    numberOfLines={3}
                    style={{ color: '#ffffff', fontSize: 14, lineHeight: 20, marginLeft: 12, flexShrink: 1 }}
                >
                    {props.text2 || props.text1 || 'Done successfully.'}
                </AppText>
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
                <View style={{ flex: 1, backgroundColor: 'white' }}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            animation: 'fade',
                        }}
                    />
                    <GlobalLoader />
                </View>
            </QueryClientProvider>
            <Toast config={toastConfig} position="bottom" bottomOffset={90} visibilityTime={3000}/>
        </SafeAreaProvider>
    );
}
