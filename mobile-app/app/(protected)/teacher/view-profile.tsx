/**
 * Teacher View Profile Screen
 * 
 * Displays the teacher's profile information including
 * school details, qualifications, and teaching assignments.
 * Matches the headmaster navy theme.
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getFacultyByUserId } from '../../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../../src/lib/store';

interface FacultyProfile {
    id: string;
    highest_qualification: string;
    years_of_experience: number;
    is_profile_locked: boolean;
    school: {
        id: string;
        name: string;
        registration_code: string;
        district?: {
            name: string;
        };
    };
}

interface ProfileResponse {
    has_profile: boolean;
    faculty: FacultyProfile | null;
}

export default function ViewProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const {
        data: profileData,
        isLoading,
        error,
        refetch,
    } = useQuery<ProfileResponse>({
        queryKey: ['faculty-profile'],
        queryFn: async () => {
            const data = await getFacultyByUserId(user!.id);
            return { has_profile: data !== null, faculty: data };
        },
    });

    // Refetch profile when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const profile = profileData?.faculty;

    // Format gender for display
    const formatGender = (gender: string | null | undefined) => {
        if (!gender) return 'Not specified';
        return gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender;
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8]">
                <ActivityIndicator size="large" color={NAVY} />
                <Text className="mt-3 text-base text-gray-500">Loading profile...</Text>
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-base text-gray-500 mt-3 mb-4">
                    {!profileData?.has_profile
                        ? 'No profile found. Please complete your profile first.'
                        : 'Failed to load profile'}
                </Text>
                <TouchableOpacity
                    className="bg-[#2c3e6b] px-6 py-3 rounded-[10px]"
                    onPress={() => router.back()}
                >
                    <Text className="text-white text-sm font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f0f2f8]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 bg-[#2c3e6b]" style={{ paddingTop: insets.top }}>
                <TouchableOpacity
                    className="p-2"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-white">My Profile</Text>
                {!profile.is_profile_locked && (
                    <TouchableOpacity
                        className="bg-white/20 px-3 py-1.5 rounded-lg"
                        onPress={() => router.push('/(protected)/teacher/complete-profile')}
                    >
                        <Text className="text-white text-sm font-medium">Edit Details</Text>
                    </TouchableOpacity>
                )}
                {profile.is_profile_locked && <View className="w-20" />}
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {/* Profile Locked Badge */}
                {profile.is_profile_locked && (
                    <View className="flex-row items-center bg-[#e8ecf4] border border-[#c5cee0] rounded-[10px] p-3 mb-4 gap-2">
                        <Ionicons name="lock-closed" size={16} color={NAVY} />
                        <Text className="text-[13px] text-[#2c3e6b] font-medium">
                            Profile is locked and cannot be edited
                        </Text>
                    </View>
                )}

                {/* Personal Information */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Information</Text>
                    <View className="bg-white rounded-[14px] p-4 mb-3" style={{ shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="person-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">Full Name</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">{user?.name || '-'}</Text>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="call-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">Phone Number</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">{user?.phone || '-'}</Text>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name={user?.gender === 'MALE' ? 'male' : user?.gender === 'FEMALE' ? 'female' : 'person-outline'} size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">Gender</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">{formatGender(user?.gender)}</Text>
                            </View>
                        </View>
                        {user?.email && (
                            <>
                                <View className="h-px bg-[#f0f2f8] my-3" />
                                <View className="flex-row items-start gap-3">
                                    <Ionicons name="mail-outline" size={20} color="#6b7280" />
                                    <View className="flex-1">
                                        <Text className="text-xs text-gray-400 mb-0.5">Email</Text>
                                        <Text className="text-[15px] text-[#1a1a2e] font-medium">{user.email}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* School Information */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">School Information</Text>
                    <View className="bg-white rounded-[14px] p-4 mb-3" style={{ shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="school-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">School Name</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">{profile.school.name}</Text>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="barcode-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">School Code</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">{profile.school.registration_code}</Text>
                            </View>
                        </View>
                        {profile.school.district && (
                            <>
                                <View className="h-px bg-[#f0f2f8] my-3" />
                                <View className="flex-row items-start gap-3">
                                    <Ionicons name="location-outline" size={20} color="#6b7280" />
                                    <View className="flex-1">
                                        <Text className="text-xs text-gray-400 mb-0.5">District</Text>
                                        <Text className="text-[15px] text-[#1a1a2e] font-medium">{profile.school.district.name}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Qualifications */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Qualifications</Text>
                    <View className="bg-white rounded-[14px] p-4 mb-3" style={{ shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="ribbon-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">Highest Qualification</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">
                                    {profile.highest_qualification}
                                </Text>
                            </View>
                        </View>
                        <View className="h-px bg-[#f0f2f8] my-3" />
                        <View className="flex-row items-start gap-3">
                            <Ionicons name="time-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 mb-0.5">Years of Experience</Text>
                                <Text className="text-[15px] text-[#1a1a2e] font-medium">
                                    {profile.years_of_experience} years
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const NAVY = '#2c3e6b';
