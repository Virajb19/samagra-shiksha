/**
 * Headmaster View Profile Screen
 * 
 * Displays the headmaster's profile information including
 * school details, qualifications, and experience.
 * Uses NativeWind (className) for styling.
 */

import React from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getFacultyByUserId } from '../../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../../src/lib/store';
import { VerifiedBanner } from '../../../src/components/VerifiedBanner';
import ProfileLockedBanner from '../../../src/components/ProfileLockedBanner';

const NAVY = '#2c3e6b';

interface FacultyProfile {
    id: string;
    highest_qualification: string;
    years_of_experience: number;
    designation: string;
    school: {
        id: string;
        name: string;
        registration_code?: string;
        code?: string;
        district?: {
            name: string;
        };
    } | null;
}

export default function ViewProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const isActive = user?.is_active ?? false;

    const {
        data: profile,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['faculty-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error('Not authenticated');
            const data = await getFacultyByUserId(user.id);
            return data;
        },
        enabled: !!user?.id,
    });

    const formatGender = (gender: string | null | undefined) => {
        if (!gender) return 'Not specified';
        return gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender;
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8]">
                <ActivityIndicator size="large" color={NAVY} />
                <AppText className="mt-3 text-base text-gray-500">Loading profile...</AppText>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <AppText className="text-base text-gray-500 mt-3 mb-4">Failed to load profile</AppText>
                <TouchableOpacity className="bg-[#2c3e6b] px-6 py-3 rounded-[10px]" onPress={() => router.back()}>
                    <AppText className="text-white text-sm font-semibold">Go Back</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    if (!profile) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
                <AppText className="text-base text-gray-500 mt-3 mb-4">Profile not completed yet</AppText>
                <TouchableOpacity
                    className="bg-[#2c3e6b] px-6 py-3 rounded-[10px]"
                    onPress={() => router.replace('/(protected)/headmaster/complete-profile')}
                >
                    <AppText className="text-white text-sm font-semibold">Complete Profile</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#eaf0fb]" style={{ paddingTop: insets.top }}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                <ProfileLockedBanner />

                {/* My Profile Heading */}
                <View className="mb-4">
                    <AppText className="text-2xl font-bold text-[#1a1a2e]">My Profile</AppText>
                </View>

                {/* Personal Information */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Information</AppText>
                    <View className="bg-white rounded-[14px] p-4 mb-3" style={{ shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="person-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <AppText className="text-xs text-gray-400 mb-0.5">Full Name</AppText>
                                <AppText className="text-[15px] text-[#1a1a2e] font-medium">{user?.name || '-'}</AppText>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="call-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <AppText className="text-xs text-gray-400 mb-0.5">Phone Number</AppText>
                                <AppText className="text-[15px] text-[#1a1a2e] font-medium">{user?.phone || '-'}</AppText>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name={user?.gender === 'MALE' ? 'male' : user?.gender === 'FEMALE' ? 'female' : 'person-outline'} size={20} color="#6b7280" />
                            <View className="flex-1">
                                <AppText className="text-xs text-gray-400 mb-0.5">Gender</AppText>
                                <AppText className="text-[15px] text-[#1a1a2e] font-medium">{formatGender(user?.gender)}</AppText>
                            </View>
                        </View>
                        {user?.email && (
                            <>
                                <View className="h-px bg-[#f0f2f8] my-3" />
                                <View className="flex-row items-start gap-3">
                                    <Ionicons name="mail-outline" size={20} color="#6b7280" />
                                    <View className="flex-1">
                                        <AppText className="text-xs text-gray-400 mb-0.5">Email</AppText>
                                        <AppText className="text-[15px] text-[#1a1a2e] font-medium">{user.email}</AppText>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* School Information */}
                {profile.school && (
                    <View className="mb-5">
                        <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">School Information</AppText>
                        <View className="bg-white rounded-[14px] p-4 mb-3" style={{ shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                            <View className="flex-row items-start gap-3">
                                <Ionicons name="school-outline" size={20} color="#6b7280" />
                                <View className="flex-1">
                                    <AppText className="text-xs text-gray-400 mb-0.5">School Name</AppText>
                                    <AppText className="text-[15px] text-[#1a1a2e] font-medium">{profile.school.name}</AppText>
                                </View>
                            </View>
                            <View className="h-px bg-[#f0f2f8] my-3" />
                            <View className="flex-row items-start gap-3">
                                <Ionicons name="barcode-outline" size={20} color="#6b7280" />
                                <View className="flex-1">
                                    <AppText className="text-xs text-gray-400 mb-0.5">School Code</AppText>
                                    <AppText className="text-[15px] text-[#1a1a2e] font-medium">{profile.school.registration_code || profile.school.code || '-'}</AppText>
                                </View>
                            </View>
                            {profile.school.district && (
                                <>
                                    <View className="h-px bg-[#f0f2f8] my-3" />
                                    <View className="flex-row items-start gap-3">
                                        <Ionicons name="location-outline" size={20} color="#6b7280" />
                                        <View className="flex-1">
                                            <AppText className="text-xs text-gray-400 mb-0.5">District</AppText>
                                            <AppText className="text-[15px] text-[#1a1a2e] font-medium">{profile.school.district.name}</AppText>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}

                {/* Experience Details */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Experience Details</AppText>
                    <View className="bg-white rounded-[14px] p-4 mb-3" style={{ shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="briefcase-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <AppText className="text-xs text-gray-400 mb-0.5">Designation</AppText>
                                <AppText className="text-[15px] text-[#1a1a2e] font-medium">
                                    {profile.designation || 'Principal/Headmaster'}
                                </AppText>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="time-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <AppText className="text-xs text-gray-400 mb-0.5">Years of Experience</AppText>
                                <AppText className="text-[15px] text-[#1a1a2e] font-medium">
                                    {profile.years_of_experience} years
                                </AppText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Verified Banner */}
                {isActive && <VerifiedBanner />}
            </ScrollView>
        </View>
    );
}
