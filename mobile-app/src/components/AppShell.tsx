/**
 * AppShell — Persistent Top Bar + Bottom Tab Bar
 *
 * Wraps the protected Stack layout so that the Samagra Shiksha header
 * and the bottom tab bar are ALWAYS visible on every screen.
 *
 * Determines tab navigation paths from the current user's role.
 */

import React from 'react';
import { View, TouchableOpacity, Platform, StatusBar, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { useAuthStore } from '../lib/store';
import { AppText } from '@/components/AppText';

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
    icon: ImageSourcePropType;
}

const TABS: Tab[] = [
  {
    key: 'home',
    label: 'Home',
    icon: require('../../assets/material-icons/assets_dashboard_white.png'),
  },
  {
    key: 'events',
    label: 'Events',
    icon: require('../../assets/material-icons/assets_calender.png'),
  },
  {
    key: 'circulars',
    label: 'Circulars',
    icon: require('../../assets/material-icons/assets_circular_white.png'),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: require('../../assets/material-icons/assets_user_white.png'),
  },
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
                className="flex-row items-center justify-between pr-3 pb-2.5"
                style={{ backgroundColor: BLUE, paddingTop: statusBarHeight + 6 }}
            >
                <Image
                    source={require('../../assets/assets_banner.png')}
                    className="w-[230px] h-12 -ml-7"
                    resizeMode="contain"
                />
                <Image
                    source={require('../../assets/assets_gon_logo.png')}
                    className="w-12 h-12 rounded-full"
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
                            className="flex-1 items-center justify-center py-1"
                        >
                            <View
                                className={`items-center justify-center ${
                                    isActive ? 'bg-[#1565C0] w-12 h-12 rounded-full' : ''
                                }`}
                                  >
                                <Image
                                    source={tab.icon}
                                    className="w-6 h-6"
                                    resizeMode="contain"
                                    style={{ tintColor: isActive ? '#ffffff' : '#000000' }}
                                />
                             </View>
                            {!isActive && (
                                  <AppText
                                     className={`text-xs font-medium mt-1 text-black`}
                                      >
                                   {tab.label}
                               </AppText>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
