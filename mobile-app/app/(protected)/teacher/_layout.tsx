/**
 * Teacher Routes Layout
 * Stack nav — AppShell is provided globally by the protected layout.
 */

import { Stack } from 'expo-router';

export default function TeacherLayout() {
    return (
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
    );
}
