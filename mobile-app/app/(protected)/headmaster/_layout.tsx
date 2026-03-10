/**
 * Headmaster Routes Layout
 * Stack nav — AppShell is provided globally by the protected layout.
 */

import { Stack } from 'expo-router';

export default function HeadmasterLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="index" />
            <Stack.Screen name="view-profile" />
            <Stack.Screen name="complete-profile" />
            <Stack.Screen name="view-staffs" />
            <Stack.Screen name="events/index" />
            <Stack.Screen name="events/create" />
            <Stack.Screen name="events/[id]" />
            <Stack.Screen name="faq" />
        </Stack>
    );
}
