/**
 * Junior Engineer Settings/Profile Tab Screen
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';

interface SettingsItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBgColor: string;
    route?: string;
    action?: () => void;
}

export default function SettingsTabScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const settingsSections: { title: string; items: SettingsItem[] }[] = [
        {
            title: 'Profile',
            items: [
                {
                    id: 'edit-personal-details',
                    title: 'Edit Personal Details',
                    subtitle: 'Update your name, phone, and gender',
                    icon: 'create-outline',
                    iconColor: '#3b82f6',
                    iconBgColor: '#dbeafe',
                },
            ],
        },
        {
            title: 'Support',
            items: [
                {
                    id: 'about',
                    title: 'About App',
                    subtitle: 'Version 1.0.0',
                    icon: 'information-circle-outline',
                    iconColor: '#6b7280',
                    iconBgColor: '#f3f4f6',
                    action: () => {
                        Alert.alert(
                            'NBSE Connect',
                            'Version 1.0.0\n\n© 2024 NBSE. All rights reserved.\n\nBuilt for the Nagaland Board of School Education.',
                            [{ text: 'OK' }]
                        );
                    },
                },
            ],
        },
    ];

    const handleItemPress = (item: SettingsItem) => {
        if (item.action) {
            item.action();
        } else if (item.route) {
            router.push(item.route as any);
        }
    };

    return (
        <ScrollView className="flex-1 bg-[#f0f2f8]" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {/* Profile Card */}
            <View className="bg-[#2c3e6b] rounded-2xl p-5 flex-row items-center mb-6" style={{ shadowColor: '#2c3e6b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}>
                <View className="relative">
                    <View className="w-16 h-16 rounded-full bg-white/20 justify-center items-center border-2 border-white/30">
                        <Text className="text-2xl font-bold text-white">
                            {user?.name?.charAt(0)?.toUpperCase() || 'J'}
                        </Text>
                    </View>
                    <View className="absolute bottom-[2px] right-[2px] w-[14px] h-[14px] rounded-full bg-green-500 border-2 border-[#2c3e6b]" />
                </View>
                <View className="ml-4 flex-1">
                    <Text className="text-lg font-semibold text-white">{user?.name || 'Junior Engineer'}</Text>
                    <Text className="text-sm text-white/80 font-medium mt-[2px]">Junior Engineer</Text>
                    <Text className="text-[13px] text-white/60 mt-1">{user?.email || ''}</Text>
                </View>
            </View>

            {/* Settings Sections */}
            {settingsSections.map((section) => (
                <View key={section.title} className="mb-5">
                    <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.5px] mb-2 ml-1">{section.title}</Text>
                    <View className="bg-white rounded-[14px] overflow-hidden" style={{ shadowColor: '#2c3e6b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        {section.items.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                className={`flex-row items-center p-4 ${index < section.items.length - 1 ? 'border-b border-b-[#f0f2f8]' : ''}`}
                                onPress={() => handleItemPress(item)}
                            >
                                <View className="w-10 h-10 rounded-[10px] justify-center items-center" style={{ backgroundColor: item.iconBgColor }}>
                                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                                </View>
                                <View className="flex-1 ml-3">
                                    <Text className="text-[15px] font-medium text-[#1a1a2e]">{item.title}</Text>
                                    {item.subtitle && (
                                        <Text className="text-[13px] text-gray-500 mt-[2px]">{item.subtitle}</Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}

            {/* Logout Button */}
            <TouchableOpacity className="flex-row items-center justify-center bg-red-100 py-[14px] rounded-xl mt-2 gap-2" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text className="text-base font-semibold text-red-500">Logout</Text>
            </TouchableOpacity>

            <Text className="text-center text-xs text-gray-400 mt-6">NBSE Connect v1.0.0</Text>
        </ScrollView>
    );
}
