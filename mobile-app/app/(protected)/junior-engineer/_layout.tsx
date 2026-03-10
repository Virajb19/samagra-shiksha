/**
 * Junior Engineer Routes Layout
 * Stack nav — AppShell is provided globally by the protected layout.
 */

import { Stack } from 'expo-router';

export default function JuniorEngineerLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="complete-profile" />
            <Stack.Screen name="edit-personal-details" />
            <Stack.Screen name="helpdesk" />
            <Stack.Screen name="view-profile" />
            <Stack.Screen name="projects" />
            <Stack.Screen name="project-detail" />
            <Stack.Screen name="update-project-status" />
        </Stack>
    );
}
