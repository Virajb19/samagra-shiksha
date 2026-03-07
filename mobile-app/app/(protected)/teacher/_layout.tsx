/**
 * Teacher Routes Layout
 * Stack nav wrapped in AppShell for persistent top/bottom bars.
 */

import { Stack } from 'expo-router';
import AppShell from '../../../src/components/AppShell';

export default function TeacherLayout() {
    return (
        <AppShell role="teacher">
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="complete-profile" />
                <Stack.Screen name="view-profile" />
                <Stack.Screen name="helpdesk" />
                <Stack.Screen name="events" />
                <Stack.Screen name="colleagues" />
                <Stack.Screen name="notices" />
                <Stack.Screen name="create-event" />
            </Stack>
        </AppShell>
    );
}
