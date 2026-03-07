/**
 * Headmaster Routes Layout
 * Stack nav wrapped in AppShell for persistent top/bottom bars.
 */

import { Stack } from 'expo-router';
import AppShell from '../../../src/components/AppShell';

export default function HeadmasterLayout() {
    return (
        <AppShell role="headmaster">
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="view-profile" />
                <Stack.Screen name="complete-profile" />
                <Stack.Screen name="edit-personal-details" />
                <Stack.Screen name="view-staffs" />
                <Stack.Screen name="notices" />
                <Stack.Screen name="events/index" />
                <Stack.Screen name="events/create" />
                <Stack.Screen name="events/[id]" />
                <Stack.Screen name="helpdesk" />
                <Stack.Screen name="faq" />
                <Stack.Screen name="notification-settings" />
            </Stack>
        </AppShell>
    );
}
