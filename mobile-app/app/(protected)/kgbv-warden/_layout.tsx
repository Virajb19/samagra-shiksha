/**
 * KGBV Warden Routes Layout
 * Stack nav wrapped in AppShell for persistent top/bottom bars.
 */

import { Stack } from 'expo-router';
import AppShell from '../../../src/components/AppShell';

export default function KGBVWardenLayout() {
    return (
        <AppShell role="kgbv-warden">
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="complete-profile" />
            </Stack>
        </AppShell>
    );
}
