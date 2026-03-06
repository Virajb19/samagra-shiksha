/**
 * Teacher Routes Layout
 * 
 * Layout for all teacher-specific screens.
 * Includes tabs and stack screens.
 */

import { Stack } from 'expo-router';

export default function TeacherLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#2c3e6b',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                contentStyle: { backgroundColor: '#f3f4f6' },
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="complete-profile"
                options={{
                    title: 'Complete Profile',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="view-profile"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="helpdesk"
                options={{
                    title: 'Helpdesk',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="events"
                options={{
                    title: 'School Events',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="colleagues"
                options={{
                    title: 'Colleagues',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="notices"
                options={{
                    title: 'Important Notices',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name="create-event"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}

