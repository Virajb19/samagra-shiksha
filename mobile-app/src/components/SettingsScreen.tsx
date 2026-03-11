import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Modal, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../lib/store';
import { getImagePreviewUrl } from '../services/storage.service';
import { AppText } from '@/components/AppText';

/** Human-readable role labels for the settings profile card. */
const ROLE_LABELS: Record<string, string> = {
    TEACHER: 'Teacher',
    HEADMASTER: 'Headmaster',
    IE_RESOURCE_PERSON: 'IE Resource Person',
    KGBV_WARDEN: 'KGBV Warden',
    NSCBAV_WARDEN: 'NSCBAV Warden',
    JUNIOR_ENGINEER: 'Junior Engineer',
};

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const profileUrl = getImagePreviewUrl(user?.profile_image_url);

    const roleLabel = ROLE_LABELS[user?.role ?? ''] || user?.role || 'User';

    const handleLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
    };

    const handleShareApp = async () => {
        try {
            await Share.share({
                title: 'Samagra Shiksha Nagaland',
                message: Platform.OS === 'ios'
                    ? 'Check out Samagra Shiksha Nagaland app!'
                    : 'Check out Samagra Shiksha Nagaland app!\nhttps://play.google.com/store/apps/details?id=com.samagrashiksha.nagaland',
                url: 'https://apps.apple.com/app/samagra-shiksha-nagaland',
            });
        } catch { }
    };

    return (
        <ScrollView className="flex-1 bg-[#eaf0fb]" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Profile Card */}
            <View className="bg-white rounded-2xl p-5 items-center mb-5" style={{ elevation: 2 }}>
                <View className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-[3px] border-[#3b82f6] mb-3">
                    {profileUrl ? (
                        <Image source={{ uri: profileUrl }} className="w-full h-full" />
                    ) : (
                        <View className="w-full h-full justify-center items-center bg-gray-300">
                            <Ionicons name="person" size={40} color="#9ca3af" />
                        </View>
                    )}
                </View>
                <AppText className="text-xl font-bold text-[#1a1a2e]">{user?.name || roleLabel}</AppText>
                <View className="flex-row items-center mt-1 gap-1">
                    <Ionicons name="mail-outline" size={14} color="#6b7280" />
                    <AppText className="text-sm text-gray-500">{user?.email || ''}</AppText>
                </View>
                <View className="bg-[#dbeafe] px-5 py-1.5 rounded-full mt-3">
                    <AppText className="text-sm font-semibold text-[#3b82f6]">{roleLabel}</AppText>
                </View>
            </View>

            {/* Menu Items */}
            <TouchableOpacity
                className="bg-white rounded-2xl p-4 flex-row items-center mb-3"
                style={{ elevation: 1 }}
                onPress={() => router.push('/(protected)/edit-personal-details' as any)}
            >
                <View className="w-12 h-12 rounded-full bg-[#dbeafe] justify-center items-center">
                    <Ionicons name="person-outline" size={24} color="#3b82f6" />
                </View>
                <AppText className="flex-1 text-base font-semibold text-[#1a1a2e] ml-4">Edit Profile</AppText>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-white rounded-2xl p-4 flex-row items-center mb-3"
                style={{ elevation: 1 }}
                onPress={() => router.push('/(protected)/helpdesk' as any)}
            >
                <View className="w-12 h-12 rounded-full bg-[#ede9fe] justify-center items-center">
                    <Ionicons name="help-circle-outline" size={24} color="#8b5cf6" />
                </View>
                <AppText className="flex-1 text-base font-semibold text-[#1a1a2e] ml-4">Helpdesk / Support</AppText>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-white rounded-2xl p-4 flex-row items-center mb-3"
                style={{ elevation: 1 }}
                onPress={handleShareApp}
            >
                <View className="w-12 h-12 rounded-full bg-[#d1fae5] justify-center items-center">
                    <Ionicons name="share-social-outline" size={24} color="#10b981" />
                </View>
                <AppText className="flex-1 text-base font-semibold text-[#1a1a2e] ml-4">Share the app</AppText>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-white rounded-2xl p-4 flex-row items-center mb-3"
                style={{ elevation: 1 }}
                onPress={() => setShowLogoutDialog(true)}
            >
                <View className="w-12 h-12 rounded-full bg-[#fee2e2] justify-center items-center">
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </View>
                <AppText className="flex-1 text-base text-[#1a1a2e] ml-4">Logout</AppText>
                <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
            </TouchableOpacity>

            {/* Logout Modal */}
            <Modal visible={showLogoutDialog} transparent animationType="fade" onRequestClose={() => setShowLogoutDialog(false)}>
                <View className="flex-1 justify-center items-center bg-black/50 px-8">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-[320px]" style={{ elevation: 8 }}>
                        <View className="items-center mb-4">
                            <View className="w-14 h-14 rounded-full bg-red-100 justify-center items-center mb-3">
                                <Ionicons name="log-out-outline" size={28} color="#ef4444" />
                            </View>
                            <AppText className="text-lg font-bold text-[#1f2937]">Logout</AppText>
                            <AppText className="text-sm text-gray-500 text-center mt-2">Are you sure you want to logout?</AppText>
                        </View>
                        <View className="flex-row gap-3 mt-2">
                            <TouchableOpacity className="flex-1 py-3 rounded-xl bg-[#f3f4f6] items-center" onPress={() => setShowLogoutDialog(false)}>
                                <AppText className="text-[15px] font-semibold text-[#374151]">Cancel</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-1 py-3 rounded-xl bg-red-500 items-center" onPress={handleLogout}>
                                <AppText className="text-[15px] font-semibold text-white">Logout</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}
