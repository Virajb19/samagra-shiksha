/**
 * Teacher Home Screen
 * 
 * Main dashboard for teachers showing:
 * - Profile card
 * - Complete Profile popup (if profile not completed)
 * - View Colleagues (only if profile completed)
 * - Important Notices (only if profile completed)
 * 
 * IMPORTANT:
 * - Profile can only be created ONCE
 * - Shows modal popup if profile not completed
 * - Colleagues and Notices only available after profile completion
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    Dimensions,
    Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../src/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getProfileStatus } from '../../../src/services/firebase/users.firestore';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import ProfileCompletionBlocker from '../../../src/components/ProfileCompletionBlocker';

const { width } = Dimensions.get('window');

interface ActionCardProps {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    iconBgColor?: string;
    disabled?: boolean;
}

function ActionCard({ title, icon, onPress, iconBgColor = '#e5e7eb', disabled = false }: ActionCardProps) {
    return (
        <TouchableOpacity
            className={`bg-white rounded-xl p-4 items-center w-[31%] ${disabled ? 'opacity-60' : ''}`}
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}
            onPress={onPress}
            disabled={disabled}
        >
            <View className="w-16 h-16 rounded-full justify-center items-center mb-2" style={{ backgroundColor: iconBgColor }}>
                <Ionicons name={icon} size={32} color={disabled ? '#9ca3af' : '#374151'} />
            </View>
            <Text className={`text-xs font-semibold text-center ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{title}</Text>
        </TouchableOpacity>
    );
}


export default function TeacherHomeScreen() {
    const { user } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Fetch profile status from backend
    const { data: profileStatus, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['profile-status'],
        queryFn: async () => {
            const data = await getProfileStatus(user!.id);
            return data;
        },
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile || false;

    // Refetch profile status when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            refetchProfile();
        }, [refetchProfile])
    );

    // Show modal if profile not completed (after loading)
    useEffect(() => {
        if (!loadingProfile && !hasCompletedProfile) {
            // Delay showing modal for smooth transition
            const timer = setTimeout(() => {
                setShowProfileModal(true);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setShowProfileModal(false);
        }
    }, [loadingProfile, hasCompletedProfile]);

    const handleCompleteProfile = () => {
        setShowProfileModal(false);
        router.push('/(protected)/teacher/complete-profile');
    };

    const handleViewColleagues = () => {
        if (!hasCompletedProfile) {
            Alert.alert(
                'Profile Required',
                'Please complete your profile first to view colleagues.',
                [{ text: 'OK' }]
            );
            return;
        }
        // TODO: Navigate to colleagues screen
        router.push('/(protected)/teacher/colleagues' as any);
    };

    const handleImportantNotices = () => {
        if (!hasCompletedProfile) {
            Alert.alert(
                'Profile Required',
                'Please complete your profile first to view notices.',
                [{ text: 'OK' }]
            );
            return;
        }
        // TODO: Navigate to notices screen
        router.push('/(protected)/teacher/notices' as any);
    };

    const handleEditProfile = () => {
        if (!hasCompletedProfile) {
            router.push('/(protected)/teacher/complete-profile');
        } else {
            // Profile already exists - show view only
            router.push('/(protected)/teacher/view-profile' as any);
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-100" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {/* Profile Card */}
            <View className="bg-white rounded-2xl p-5 flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                <View className="mr-4">
                    {user?.profile_image_url ? (
                        <Image
                            source={{ uri: user.profile_image_url }}
                            className="w-20 h-20 rounded-full"
                        />
                    ) : (
                        <View className="w-20 h-20 rounded-full bg-gray-200 justify-center items-center">
                            <Ionicons name="person" size={40} color="#9ca3af" />
                        </View>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-[#1f2937] mb-1">{user?.name || 'User'}</Text>
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="mail-outline" size={16} color="#6b7280" />
                        <Text className="text-sm text-gray-500 ml-1 flex-1" numberOfLines={1}>
                            {user?.email || 'No email'}
                        </Text>
                    </View>
                    <View className="bg-gray-200 px-3 py-1 rounded-2xl self-start">
                        <Text className="text-xs text-[#4b5563] font-medium">
                            {user?.role === 'TEACHER' ? 'Teacher' : user?.role === 'HEADMASTER' ? 'Headmaster' : user?.role}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Profile Status Banner */}
            {!loadingProfile && !hasCompletedProfile && (
                <TouchableOpacity
                    className="bg-[#fef3c7] rounded-xl p-3 mt-4 flex-row items-center border border-[#fcd34d]"
                    onPress={() => setShowProfileModal(true)}
                >
                    <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                    <Text className="flex-1 ml-2 text-sm text-[#92400e] font-medium">
                        Complete your profile to access all features
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
                </TouchableOpacity>
            )}

            {hasCompletedProfile && (
                <View className="bg-[#dcfce7] rounded-xl p-3 mt-4 flex-row items-center border border-[#86efac]">
                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    <Text className="ml-2 text-sm text-[#166534] font-medium">
                        Profile completed - Pending approval
                    </Text>
                </View>
            )}

            {/* Action Cards */}
            <View className="flex-row justify-between mt-6 flex-wrap">
                <ActionCard
                    title={hasCompletedProfile ? "View Profile" : "Complete Profile"}
                    icon="person-outline"
                    onPress={handleEditProfile}
                    iconBgColor="#dbeafe"
                />
                <ActionCard
                    title="View Colleagues"
                    icon="people-outline"
                    onPress={handleViewColleagues}
                    iconBgColor={hasCompletedProfile ? "#fef3c7" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Important Notices"
                    icon="megaphone-outline"
                    onPress={handleImportantNotices}
                    iconBgColor={hasCompletedProfile ? "#fee2e2" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Events"
                    icon="calendar-outline"
                    onPress={() => router.push('/(protected)/teacher/events' as any)}
                    iconBgColor={hasCompletedProfile ? "#dcfce7" : "#e5e7eb"}
                    disabled={!hasCompletedProfile}
                />
                <ActionCard
                    title="Helpdesk"
                    icon="headset-outline"
                    onPress={() => router.push('/(protected)/teacher/helpdesk' as any)}
                    iconBgColor="#ede9fe"
                />
            </View>

            {/* Info Card - Show only if profile not completed */}
            {!hasCompletedProfile && (
                <View className="bg-[#eff6ff] rounded-xl p-4 mt-6 flex-row border border-[#bfdbfe]">
                    <Ionicons name="information-circle" size={24} color="#3b82f6" />
                    <View className="flex-1 ml-3">
                        <Text className="text-sm font-semibold text-[#1e40af] mb-1">Important Notice</Text>
                        <Text className="text-[13px] text-[#3b82f6] leading-[18px]">
                            You can only create your profile once. Please ensure all details are correct before submitting as they cannot be modified later.
                        </Text>
                    </View>
                </View>
            )}

            {/* Profile Completion Modal */}
            <ProfileCompletionBlocker
                visible={showProfileModal && !hasCompletedProfile}
                userName={user?.name}
                userRole="TEACHER"
            />

        </ScrollView>
    );
}

