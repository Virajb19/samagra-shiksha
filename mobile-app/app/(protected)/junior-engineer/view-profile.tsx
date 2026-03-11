/**
 * Junior Engineer View Profile Screen
 * 
 * Displays the Junior Engineer's profile information including
 * phone, EBRC, district, years of experience.
 * Shows "Your account is verified" only when the account is active.
 * 
 * Uses NativeWind (className) for styling.
 */

import React from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../../src/lib/store';
import { District } from '../../../src/types';

const BLUE = '#1565C0';

function InfoRow({ icon, label, value, loading = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; loading?: boolean }) {
    return (
        <View className="flex-row items-center gap-3 py-1">
            <Ionicons name={icon} size={22} color="#374151" />
            <AppText className="text-[15px] font-semibold text-gray-900">{label}:</AppText>
            {loading ? (
                <ActivityIndicator size="small" color={BLUE} />
            ) : (
                <AppText className="text-[15px] text-gray-700 flex-1">{value}</AppText>
            )}
        </View>
    );
}

export default function JuniorEngineerViewProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const districtName = districts.find(d => d.id === user?.district_id)?.name || '-';
    const isActive = user?.is_active ?? false;

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <AppText className="text-base text-gray-500 mt-3 mb-4">Not authenticated</AppText>
                <TouchableOpacity className="px-6 py-3 rounded-xl" style={{ backgroundColor: BLUE }} onPress={() => router.back()}>
                    <AppText className="text-white text-sm font-semibold">Go Back</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    if (!user.has_completed_profile) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
                <AppText className="text-base text-gray-500 mt-3 mb-4">Profile not completed yet</AppText>
                <TouchableOpacity
                    className="px-6 py-3 rounded-xl"
                    style={{ backgroundColor: BLUE }}
                    onPress={() => router.replace('/(protected)/junior-engineer/complete-profile')}
                >
                    <AppText className="text-white text-sm font-semibold">Complete Profile</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f0f2f8]">
            {/* Blue Profile Header */}
            <View
                style={{ backgroundColor: BLUE, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingTop: insets.top + 12 }}
                className="px-5 pb-7"
            >
                {/* Back Button */}
                <TouchableOpacity className="p-1 mb-3 self-start" onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <View className="mr-4">
                        {user.profile_image_url ? (
                            <Image
                                source={{ uri: user.profile_image_url }}
                                className="w-20 h-20 rounded-full"
                                style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }}
                            />
                        ) : (
                            <View
                                className="w-20 h-20 rounded-full justify-center items-center"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' }}
                            >
                                <Ionicons name="person" size={38} color="rgba(255,255,255,0.8)" />
                            </View>
                        )}
                    </View>
                    <View className="flex-1">
                        <AppText className="text-white text-2xl font-bold mb-1" numberOfLines={1}>{user.name || 'User'}</AppText>
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.8)" />
                            <AppText className="text-sm ml-1 flex-1" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>{user.email || 'No email'}</AppText>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                            <AppText className="text-white text-xs font-semibold">Junior Engineer</AppText>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {/* Profile Details */}
                <View className="mb-5">
                    <AppText className="text-lg font-bold text-gray-900 mb-4">Junior Engineer</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="call-outline" label="Phone" value={user.phone || '-'} />
                        <View className="h-[1px] bg-[#f0f2f8] my-3" />
                        <InfoRow icon="business-outline" label="EBRC" value={user.ebrc || '-'} />
                        <View className="h-[1px] bg-[#f0f2f8] my-3" />
                        <InfoRow icon="location-outline" label="District" value={districtName} loading={loadingDistricts} />
                        <View className="h-[1px] bg-[#f0f2f8] my-3" />
                        <InfoRow icon="time-outline" label="Experience" value={user.years_of_experience != null ? `${user.years_of_experience} years` : '-'} />
                    </View>
                </View>

                {/* Verified Banner — only shown when account is active */}
                {isActive && (
                    <View
                        className="rounded-xl py-4 items-center flex-row justify-center gap-2"
                        style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#34d399', backgroundColor: '#ecfdf5' }}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <AppText className="text-[15px] font-semibold text-emerald-500">Your account is verified</AppText>
                    </View>
                )}

                {/* Under Verification Banner — when profile is complete but not yet active */}
                {!isActive && (
                    <View
                        className="rounded-xl py-4 items-center flex-row justify-center gap-2"
                        style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}
                    >
                        <Ionicons name="time-outline" size={24} color={BLUE} />
                        <AppText style={{ color: BLUE }} className="text-[15px] font-semibold">Your account is under verification</AppText>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
