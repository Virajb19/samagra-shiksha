/**
 * IE Resource Person Routes Layout
 * Stack nav wrapped in AppShell for persistent top/bottom bars.
 */

import { Stack } from 'expo-router';
import AppShell from '../../../src/components/AppShell';

export default function IEResourcePersonLayout() {
    return (
        <AppShell role="ie-resource-person">
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="complete-profile" />
                <Stack.Screen name="view-profile" />
                <Stack.Screen name="school-visit-form" />
                <Stack.Screen name="home-visit-form" />
            </Stack>
        </AppShell>
    );
}
