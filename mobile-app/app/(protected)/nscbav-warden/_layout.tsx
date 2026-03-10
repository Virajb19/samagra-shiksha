/**
 * NSCBAV Warden Routes Layout
 * Stack nav — AppShell is provided globally by the protected layout.
 */

import { Stack } from 'expo-router';

export default function NSCBAVWardenLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="complete-profile" />
            <Stack.Screen name="view-profile" />
        </Stack>
    );
}
