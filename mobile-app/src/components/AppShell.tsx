/**
 * AppShell — Persistent Top Bar + Bottom Tab Bar
 *
 * Wraps every role's Stack layout so that the Samagra Shiksha header
 * and the bottom tab bar are ALWAYS visible on every screen.
 *
 * Usage in role _layout.tsx:
 *   <AppShell role="junior-engineer">
 *       <Stack screenOptions={{ headerShown: false }}> ... </Stack>
 *   </AppShell>
 */

import React from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#1565C0';

type RoleSlug =
    | 'headmaster'
    | 'teacher'
    | 'kgbv-warden'
    | 'nscbav-warden'
    | 'ie-resource-person'
    | 'junior-engineer';

interface Tab {
    key: string;
    label: string;
    iconFocused: keyof typeof Ionicons.glyphMap;
    iconDefault: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
    { key: 'home', label: 'Home', iconFocused: 'grid', iconDefault: 'grid-outline' },
    { key: 'events', label: 'Events', iconFocused: 'calendar', iconDefault: 'calendar-outline' },
    { key: 'circulars', label: 'Circulars', iconFocused: 'document-text', iconDefault: 'document-text-outline' },
    { key: 'settings', label: 'Settings', iconFocused: 'person', iconDefault: 'person-outline' },
];

function getActiveTab(pathname: string): string {
    if (pathname.includes('/events')) return 'events';
    if (pathname.includes('/circulars')) return 'circulars';
    if (pathname.includes('/settings')) return 'settings';
    return 'home';
}

export default function AppShell({ role, children }: { role: RoleSlug; children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const activeTab = getActiveTab(pathname);

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top) : insets.top;

    const handleTabPress = (tabKey: string) => {
        router.navigate(`/(protected)/${role}/(tabs)/${tabKey}` as any);
    };

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            {/* ── Persistent Top Bar ── */}
            <View
                className="flex-row items-center justify-between px-3 pb-2.5"
                style={{ backgroundColor: BLUE, paddingTop: statusBarHeight + 6 }}
            >
                <Image
                    source={require('../../assets/nbse-logo.png')}
                    className="w-9 h-9 rounded-full"
                    resizeMode="contain"
                />
                <View className="items-center flex-1">
                    <Text className="text-white text-[13px] font-bold tracking-wide">
                        समग्र शिक्षा
                    </Text>
                    <Text className="text-white/85 text-[10px] font-medium tracking-wider">
                        SAMAGRA SHIKSHA NAGALAND
                    </Text>
                </View>
                <Image
                    source={require('../../assets/nbse-logo.png')}
                    className="w-9 h-9 rounded-full"
                    resizeMode="contain"
                />
            </View>

            {/* ── Content Area ── */}
            <View className="flex-1">
                {children}
            </View>

            {/* ── Persistent Bottom Tab Bar ── */}
            <View
                className="flex-row bg-white border-t border-gray-200 pt-2"
                style={{ paddingBottom: insets.bottom || 8 }}
            >
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => handleTabPress(tab.key)}
                            activeOpacity={0.7}
                            className="flex-1 items-center py-1"
                        >
                            <Ionicons
                                name={isActive ? tab.iconFocused : tab.iconDefault}
                                size={24}
                                color={isActive ? BLUE : '#9ca3af'}
                            />
                            <Text
                                className={`text-xs font-medium mt-1 ${isActive ? 'text-[#1565C0]' : 'text-gray-400'}`}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
