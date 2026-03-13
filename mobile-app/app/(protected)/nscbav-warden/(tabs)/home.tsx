/**
 * NSCBAV Warden Home Tab Screen
 * 3-state profile flow with AccessBlockedModal.
 */

import React, { useCallback, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View, ScrollView, TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { Ionicons } from '@expo/vector-icons';
import { ProfileHeaderCard } from '@/components/ProfileHeaderCard';
import AccessBlockedModal from '@/components/AccessBlockedModal';

const BLUE = '#1565C0';

function ActionCard({ title, iconName, onPress, disabled = false }: { title: string; iconName: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity
            className={`bg-white rounded-xl items-center justify-center py-4 px-2 w-[31%] min-h-[110px] shadow-sm ${disabled ? 'opacity-50' : ''}`}
            style={{ elevation: 2 }}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View className="w-16 h-16 rounded-full bg-[#e8f4fd] justify-center items-center mb-2">
                <Ionicons name={iconName} size={34} color={disabled ? '#9ca3af' : BLUE} />
            </View>
            <AppText className={`text-[11px] font-bold text-center leading-[14px] ${disabled ? 'text-gray-400' : 'text-gray-800'}`} numberOfLines={2}>{title}</AppText>
        </TouchableOpacity>
    );
}

export default function NSCBAVWardenHomeTabScreen() {
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
            <ProfileHeaderCard roleLabel="NSCBAV Warden" />

            <View className="px-4 mt-5">
                <View className="flex-row justify-between mb-3">
                    <ActionCard title={hasCompletedProfile ? 'View Profile' : 'Complete Profile'} iconName="person-outline" onPress={() => {
                        if (!hasCompletedProfile) router.push('/(protected)/nscbav-warden/complete-profile');
                        else router.push('/(protected)/nscbav-warden/view-profile');
                    }} />
                    <ActionCard title="Important Notices" iconName="megaphone-outline" onPress={() => { if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; } router.push('/(protected)/notices' as any); }} disabled={!hasCompletedProfile || !isActive} />
                    <ActionCard title="Activities Forms" iconName="document-text-outline" onPress={() => { if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; } router.push('/(protected)/activity-forms' as any); }} disabled={!hasCompletedProfile || !isActive} />
                </View>
            </View>

            {!loadingProfile && !hasCompletedProfile && (
                <TouchableOpacity
                    className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-[#1565C0] bg-[#e8f4fd]" style={{ borderStyle: 'dashed' }}
                    onPress={() => router.push('/(protected)/nscbav-warden/complete-profile')}
                    activeOpacity={0.8}
                >
                    <AppText className="text-[#1565C0] text-[15px] font-semibold">Kindly complete your profile</AppText>
                </TouchableOpacity>
            )}
            {!loadingProfile && hasCompletedProfile && !isActive && (
                <View className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-[#1565C0] bg-[#e8f4fd]" style={{ borderStyle: 'dashed' }}>
                    <AppText className="text-[#1565C0] text-[15px] font-semibold text-center">Your account is under verification. Contact Admin or your headmaster</AppText>
                </View>
            )}

            <AccessBlockedModal visible={showProfileModal} mode={modalMode} onClose={() => setShowProfileModal(false)} onComplete={() => { setShowProfileModal(false); router.push('/(protected)/nscbav-warden/complete-profile'); }} />
        </ScrollView>
    );
}
