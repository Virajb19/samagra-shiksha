/**
 * Junior Engineer Routes Layout
 * Stack nav wrapped in AppShell for persistent top/bottom bars.
 */

import { Stack } from 'expo-router';
import AppShell from '../../../src/components/AppShell';

export default function JuniorEngineerLayout() {
    return (
        <AppShell role="junior-engineer">
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f4f6' } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="complete-profile" />
                <Stack.Screen name="view-profile" />
                <Stack.Screen name="projects" />
                <Stack.Screen name="project-detail" />
                <Stack.Screen name="update-project-status" />
            </Stack>
        </AppShell>
    );
}
