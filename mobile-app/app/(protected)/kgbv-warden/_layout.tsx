/**
 * KGBV Warden Routes Layout
 * Stack nav — AppShell is provided globally by the protected layout.
 */

import { Stack } from 'expo-router';

export default function KGBVWardenLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="complete-profile" />
        </Stack>
    );
}
