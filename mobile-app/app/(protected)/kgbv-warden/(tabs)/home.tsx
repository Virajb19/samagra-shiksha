/**
 * KGBV Warden Home Tab Screen
 *
 * 3-state profile flow:
 * 1. Profile incomplete → "Kindly complete your profile" banner + AccessBlockedModal
 * 2. Profile complete, not active → "Your account is under verification. Contact Admin or your headmaster"
 * 3. Active → full access
 */

import React, { useCallback, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { ProfileHeaderCard } from '@/components/ProfileHeaderCard';
import AccessBlockedModal from '@/components/AccessBlockedModal';
import HomeActionCard from '@/components/HomeActionCard';

export default function KGBVWardenHomeTabScreen() {
    const { user } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [modalMode, setModalMode] = useState<'complete' | 'verification'>('complete');

    const { data: profileStatus, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: async () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;

    useFocusEffect(
        useCallback(() => {
            refetchProfile();
        }, [refetchProfile])
    );

    const handleLockedAction = () => {
        if (!hasCompletedProfile) {
            setModalMode('complete');
            setShowProfileModal(true);
        } else if (!isActive) {
            setModalMode('verification');
            setShowProfileModal(true);
        }
    };

    return (
        <ScrollView className="flex-1 bg-[#f0f4f8]" contentContainerStyle={{ paddingBottom: 32 }}>

            {/* Blue Profile Header Card */}
            <ProfileHeaderCard roleLabel="KGBV Warden" />

            {/* Action Cards Grid */}
            <View className="px-4 mt-5">
                <View className="flex-row justify-between mb-3">
                    <HomeActionCard
                        title={hasCompletedProfile ? 'View Profile' : 'Complete Profile'}
                        iconName="person-outline"
                        onPress={() => {
                            if (!hasCompletedProfile) {
                                router.push('/(protected)/kgbv-warden/complete-profile');
                            } else {
                                router.push('/(protected)/kgbv-warden/view-profile');
                            }
                        }}
                    />
                    <HomeActionCard
                        title="Important Notices"
                        iconName="megaphone-outline"
                        onPress={() => {
                            if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; }
                            router.push('/(protected)/notices' as any);
                        }}
                        disabled={!hasCompletedProfile || !isActive}
                    />
                    <HomeActionCard
                        title="Activities Forms"
                        iconName="document-text-outline"
                        onPress={() => {
                            if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; }
                            router.push('/(protected)/activity-forms' as any);
                        }}
                        disabled={!hasCompletedProfile || !isActive}
                    />
                </View>
            </View>

            {/* Profile status banners */}
            {!loadingProfile && !hasCompletedProfile && (
                <TouchableOpacity
                    className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-[#1565C0] bg-[#e8f4fd]" style={{ borderStyle: 'dashed' }}
                    onPress={() => router.push('/(protected)/kgbv-warden/complete-profile')}
                    activeOpacity={0.8}
                >
                    <AppText className="text-[#1565C0] text-[16px] font-semibold">Kindly complete your profile</AppText>
                </TouchableOpacity>
            )}

            {!loadingProfile && hasCompletedProfile && !isActive && (
                <View className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-[#1565C0] bg-[#e8f4fd]" style={{ borderStyle: 'dashed' }}>
                    <AppText className="text-[#1565C0] text-[16px] font-semibold text-center">Your account is under verification. Contact Admin or your headmaster</AppText>
                </View>
            )}

            {/* Access Blocked Modal */}
            <AccessBlockedModal
                visible={showProfileModal}
                mode={modalMode}
                onClose={() => setShowProfileModal(false)}
                onComplete={() => {
                    setShowProfileModal(false);
                    router.push('/(protected)/kgbv-warden/complete-profile');
                }}
            />
        </ScrollView>
    );
}
