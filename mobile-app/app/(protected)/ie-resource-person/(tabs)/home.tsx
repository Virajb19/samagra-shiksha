/**
 * IE Resource Person Home Tab Screen
 * 3-state profile flow with AccessBlockedModal.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Modal, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { ProfileHeaderCard } from '@/components/ProfileHeaderCard';

const BLUE = '#1565C0';

function ActionCard({ title, iconName, onPress, disabled = false }: { title: string; iconName: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity
            className={`bg-white rounded-xl items-center justify-center py-4 px-2 w-[31%] min-h-[110px] shadow-sm ${disabled ? 'opacity-50' : ''}`}
            style={{ elevation: 2 }}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View className="w-16 h-16 rounded-full bg-[#1565C0] justify-center items-center mb-2">
                <Ionicons name={iconName} size={34} color={disabled ? '#9ca3af' : BLUE} />
            </View>
            <AppText className={`text-[11px] font-bold text-center leading-[14px] ${disabled ? 'text-gray-400' : 'text-gray-800'}`} numberOfLines={2}>{title}</AppText>
        </TouchableOpacity>
    );
}

function AccessBlockedModal({ visible, mode, onClose, onComplete }: { visible: boolean; mode: 'complete' | 'verification'; onClose: () => void; onComplete: () => void }) {
    const isVerification = mode === 'verification';
    const [internalVisible, setInternalVisible] = useState(false);
    const translateY = useRef(new Animated.Value(280)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setInternalVisible(true); translateY.setValue(280); opacity.setValue(0);
            Animated.parallel([
                Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else if (internalVisible) {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 280, duration: 220, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start(() => setInternalVisible(false));
        }
    }, [visible]);
    if (!internalVisible) return null;

    return (
        <Modal visible={internalVisible} transparent statusBarTranslucent onRequestClose={onClose}>
            <Animated.View
                className="flex-1 justify-center items-center px-6"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity }}
            >
                <TouchableOpacity className="absolute top-0 left-0 right-0 bottom-0" activeOpacity={1} onPress={onClose} />
                <Animated.View
                    className="bg-white rounded-3xl w-full px-7 pt-8 pb-7 items-center"
                    style={{ transform: [{ translateY }] }}
                >
                    <Image source={{ uri: isVerification ? 'https://cdn-icons-png.flaticon.com/512/6195/6195699.png' : 'https://cdn-icons-png.flaticon.com/512/3596/3596165.png' }} className="w-[140px] h-[140px] mb-5" resizeMode="contain" />
                    <AppText className="text-[22px] font-bold text-[#1a1a2e] text-center mb-2">{isVerification ? 'Account under verification' : 'Complete your profile'}</AppText>
                    <AppText className="text-sm text-gray-500 text-center leading-[22px] mb-7">{isVerification ? 'Your account is currently under verification by the admin. You will be able to access this once approved.' : 'Kindly complete your profile by filling up relevant experience details.'}</AppText>
                    {isVerification ? (
                        <TouchableOpacity className="bg-[#1565C0] rounded-xl py-3.5 w-full items-center" onPress={onClose}><AppText className="text-white text-base font-semibold">OK, Got it</AppText></TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity className="bg-[#1565C0] rounded-xl py-3.5 w-full items-center mb-3" onPress={onComplete}><AppText className="text-white text-base font-semibold">Complete Profile</AppText></TouchableOpacity>
                            <TouchableOpacity onPress={onClose} className="py-2"><AppText className="text-gray-400 text-sm">Maybe later</AppText></TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

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
                    <ActionCard title={hasCompletedProfile ? 'View Profile' : 'Complete Profile'} iconName="person-outline" onPress={() => {
                        if (!hasCompletedProfile) router.push('/(protected)/ie-resource-person/complete-profile');
                        else router.push('/(protected)/ie-resource-person/view-profile');
                    }} />
                    <ActionCard title="Important Notices" iconName="megaphone-outline" onPress={() => { if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; } router.push('/(protected)/notices' as any); }} disabled={!hasCompletedProfile || !isActive} />
                    <ActionCard title="Activities Forms" iconName="document-text-outline" onPress={() => { if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; } router.push('/(protected)/activity-forms' as any); }} disabled={!hasCompletedProfile || !isActive} />
                </View>
            </View>

            {!loadingProfile && !hasCompletedProfile && (
                <TouchableOpacity
                    className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-dashed border-[#1565C0] bg-[#1565C0]"
                    onPress={() => router.push('/(protected)/ie-resource-person/complete-profile')}
                    activeOpacity={0.8}
                >
                    <AppText className="text-[#1565C0] text-[15px] font-semibold">Kindly complete your profile</AppText>
                </TouchableOpacity>
            )}
            {!loadingProfile && hasCompletedProfile && !isActive && (
                <View className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-dashed border-[#1565C0] bg-[#1565C0]">
                    <AppText className="text-[#1565C0] text-[15px] font-semibold">Your account is under verification</AppText>
                </View>
            )}

            <AccessBlockedModal visible={showProfileModal} mode={modalMode} onClose={() => setShowProfileModal(false)} onComplete={() => { setShowProfileModal(false); router.push('/(protected)/ie-resource-person/complete-profile'); }} />
        </ScrollView>
    );
}
