/**
 * NSCBAV Warden Settings Tab
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';

export default function SettingsTabScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
        ]);
    };

    return (
        <ScrollView className="flex-1 bg-[#f0f2f8]" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View className="bg-[#2c3e6b] rounded-2xl p-5 flex-row items-center mb-6" style={{ elevation: 4 }}>
                <View className="w-16 h-16 rounded-full bg-white/20 justify-center items-center border-2 border-white/30">
                    <Text className="text-2xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() || 'N'}</Text>
                </View>
                <View className="ml-4 flex-1">
                    <Text className="text-lg font-semibold text-white">{user?.name || 'NSCBAV Warden'}</Text>
                    <Text className="text-sm text-white/80 font-medium mt-[2px]">NSCBAV Warden</Text>
                    <Text className="text-[13px] text-white/60 mt-1">{user?.email || ''}</Text>
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.5px] mb-2 ml-1">Support</Text>
                <View className="bg-white rounded-[14px] overflow-hidden" style={{ elevation: 2 }}>
                    <TouchableOpacity className="flex-row items-center p-4" onPress={() => Alert.alert('NBSE Connect', 'Version 1.0.0\n\n© 2024 NBSE. All rights reserved.')}>
                        <View className="w-10 h-10 rounded-[10px] justify-center items-center bg-gray-100"><Ionicons name="information-circle-outline" size={20} color="#6b7280" /></View>
                        <View className="flex-1 ml-3"><Text className="text-[15px] font-medium text-[#1a1a2e]">About App</Text><Text className="text-[13px] text-gray-500 mt-[2px]">Version 1.0.0</Text></View>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity className="flex-row items-center justify-center bg-red-100 py-[14px] rounded-xl mt-2 gap-2" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text className="text-base font-semibold text-red-500">Logout</Text>
            </TouchableOpacity>
            <Text className="text-center text-xs text-gray-400 mt-6">NBSE Connect v1.0.0</Text>
        </ScrollView>
    );
}
