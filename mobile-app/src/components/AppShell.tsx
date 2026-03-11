/**
 * AppShell — Persistent Top Bar + Bottom Tab Bar
 *
 * Wraps the protected Stack layout so that the Samagra Shiksha header
 * and the bottom tab bar are ALWAYS visible on every screen.
 *
 * Determines tab navigation paths from the current user's role.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Platform, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../lib/store';

const BLUE = '#1565C0';

type RoleSlug =
    | 'headmaster'
    | 'teacher'
    | 'kgbv-warden'
    | 'nscbav-warden'
    | 'ie-resource-person'
    | 'junior-engineer';

/** Map user role to the route slug used in navigation */
function getRoleSlug(role?: string): RoleSlug {
    switch (role) {
        case 'HEADMASTER': return 'headmaster';
        case 'KGBV_WARDEN': return 'kgbv-warden';
        case 'NSCBAV_WARDEN': return 'nscbav-warden';
        case 'IE_RESOURCE_PERSON': return 'ie-resource-person';
        case 'JUNIOR_ENGINEER': return 'junior-engineer';
        default: return 'teacher';
    }
}

interface Tab {
    key: string;
    label: string;
    iconFocused: keyof typeof MaterialIcons.glyphMap;
    iconDefault: keyof typeof MaterialIcons.glyphMap;
}

const TABS: Tab[] = [
    { key: 'home', label: 'Home', iconFocused: 'dashboard', iconDefault: 'dashboard' },
    { key: 'events', label: 'Events', iconFocused: 'event', iconDefault: 'event' },
    { key: 'circulars', label: 'Circulars', iconFocused: 'description', iconDefault: 'description' },
    { key: 'settings', label: 'Settings', iconFocused: 'person', iconDefault: 'person-outline' },
];

function getActiveTab(pathname: string): string {
    if (pathname.includes('/events')) return 'events';
    if (pathname.includes('/circulars')) return 'circulars';
    if (pathname.includes('/settings')) return 'settings';
    return 'home';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const activeTab = getActiveTab(pathname);
    const { user } = useAuthStore();
    const roleSlug = getRoleSlug(user?.role);

    const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top) : insets.top;

    const handleTabPress = (tabKey: string) => {
        router.navigate(`/(protected)/${roleSlug}/(tabs)/${tabKey}` as any);
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
            <View className="flex-1 mx-1">
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
                            <MaterialIcons
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
