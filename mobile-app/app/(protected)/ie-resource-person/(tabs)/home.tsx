/**
 * IE Resource Person Home Tab Screen
 * 3-state profile flow with AccessBlockedModal.
 */
import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { AppText } from '@/components/AppText';
import { ProfileHeaderCard } from '@/components/ProfileHeaderCard';
import AccessBlockedModal from '@/components/AccessBlockedModal';
import HomeActionCard from '@/components/HomeActionCard';
import StatusBanner from '@/components/StatusBanner';

export default function IEResourcePersonHomeTabScreen() {
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
    useFocusEffect(useCallback(() => { refetchProfile(); }, [refetchProfile]));

    const handleLockedAction = () => {
        if (!hasCompletedProfile) { setModalMode('complete'); setShowProfileModal(true); }
        else if (!isActive) { setModalMode('verification'); setShowProfileModal(true); }
    };

    return (
        <ScrollView className="flex-1 bg-[#f0f4f8]" contentContainerStyle={{ paddingBottom: 32 }}>
            <ProfileHeaderCard roleLabel="IE Resource Person" />

            <View className="px-4 mt-5">
                <View className="flex-row justify-between mb-3">
                    <HomeActionCard title={hasCompletedProfile ? 'View Profile' : 'Complete Profile'} iconName="person-outline" onPress={() => {
                        if (!hasCompletedProfile) router.push('/(protected)/ie-resource-person/complete-profile');
                        else router.push('/(protected)/ie-resource-person/view-profile');
                    }} />
                    <HomeActionCard title="Important Notices" iconName="megaphone-outline" onPress={() => { if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; } router.push('/(protected)/notices' as any); }} disabled={!hasCompletedProfile || !isActive} />
                    <HomeActionCard title="Activities Forms" iconName="document-text-outline" onPress={() => { if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; } router.push('/(protected)/activity-forms' as any); }} disabled={!hasCompletedProfile || !isActive} />
                </View>
            </View>

            {!loadingProfile && !hasCompletedProfile && (
                <StatusBanner
                    message="Kindly complete your profile"
                    onPress={() => router.push('/(protected)/ie-resource-person/complete-profile')}
                />
            )}
            {!loadingProfile && hasCompletedProfile && !isActive && (
                <StatusBanner message="Your account is under verification. Contact Admin or your headmaster" />
            )}

            <AccessBlockedModal visible={showProfileModal} mode={modalMode} onClose={() => setShowProfileModal(false)} onComplete={() => { setShowProfileModal(false); router.push('/(protected)/ie-resource-person/complete-profile'); }} />
        </ScrollView>
    );
}
