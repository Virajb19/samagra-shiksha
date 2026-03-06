/**
 * Headmaster Routes Layout
 * 
 * Layout for all headmaster-specific screens.
 * Uses Stack navigation with tabs as the index.
 */

import { Stack } from 'expo-router';
import { StyleSheet, Platform, StatusBar, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HeadmasterLayout() {
    const insets = useSafeAreaInsets();

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
            {/* Tab navigation is the main screen */}
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
                name="view-profile"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="complete-profile"
                options={{
                    title: 'Complete Profile',
                }}
            />
            <Stack.Screen
                name="edit-personal-details"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="view-staffs"
                options={{
                    title: 'View Colleagues',
                }}
            />
            <Stack.Screen
                name="notices"
                options={{
                    title: 'Important Notices',
                }}
            />
            <Stack.Screen
                name="events/index"
                options={{
                    title: 'Events',
                }}
            />
            <Stack.Screen
                name="events/create"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="events/[id]"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="helpdesk"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="faq"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="notification-settings"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}

const styles = StyleSheet.create({
    logo: {
        width: 32,
        height: 32,
        marginLeft: 8,
    },
    logoutButton: {
        marginRight: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 6,
    },
    logoutText: {
        color: '#ffffff',
        fontWeight: '500',
        fontSize: 14,
    },
});
