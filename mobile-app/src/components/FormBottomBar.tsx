/**
 * FormBottomBar — Persistent bottom navigation bar for form screens.
 *
 * Since form screens are Stack screens outside the Tab navigator,
 * the native tab bar is hidden. This component replicates the tab
 * bar so users can still navigate directly to Home, Events, Circulars, and Settings.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store';

const BLUE = '#1565C0';

type TabItem = {
    name: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconFocused: keyof typeof Ionicons.glyphMap;
};

const TABS: TabItem[] = [
    { name: 'home', label: 'Home', icon: 'grid-outline', iconFocused: 'grid' },
    { name: 'events', label: 'Events', icon: 'calendar-outline', iconFocused: 'calendar' },
    { name: 'circulars', label: 'Circulars', icon: 'document-text-outline', iconFocused: 'document-text' },
    { name: 'settings', label: 'Settings', icon: 'person-outline', iconFocused: 'person' },
];

function getRolePrefix(role: string): string {
    switch (role) {
        case 'HEADMASTER': return 'headmaster';
        case 'TEACHER': return 'teacher';
        case 'KGBV_WARDEN': return 'kgbv-warden';
        case 'NSCBAV_WARDEN': return 'nscbav-warden';
        case 'IE_RESOURCE_PERSON': return 'ie-resource-person';
        default: return 'teacher';
    }
}

export default function FormBottomBar() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const rolePrefix = getRolePrefix(user?.role || 'TEACHER');

    const navigateToTab = (tabName: string) => {
        router.replace(`/(protected)/${rolePrefix}/(tabs)/${tabName}` as any);
    };

    return (
        <View
            style={{
                flexDirection: 'row',
                backgroundColor: '#ffffff',
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
                paddingTop: 8,
                paddingBottom: insets.bottom || 8,
                height: 70 + (insets.bottom > 0 ? insets.bottom - 8 : 0),
            }}
        >
            {TABS.map((tab) => (
                <TouchableOpacity
                    key={tab.name}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => navigateToTab(tab.name)}
                    activeOpacity={0.7}
                >
                    <Ionicons name={tab.icon} size={24} color="#9ca3af" />
                    <Text style={{ fontSize: 12, fontWeight: '500', marginTop: 4, color: '#9ca3af' }}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
