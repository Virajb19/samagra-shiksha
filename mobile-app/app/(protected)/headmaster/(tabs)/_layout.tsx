/**
 * Headmaster Tabs Layout
 * Header and tab bar hidden — AppShell provides both persistently.
 */

import { Tabs } from 'expo-router';

export default function HeadmasterTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
            }}
        >
            <Tabs.Screen name="home" />
            <Tabs.Screen name="events" />
            <Tabs.Screen name="circulars" />
            <Tabs.Screen name="settings" />
        </Tabs>
    );
}
