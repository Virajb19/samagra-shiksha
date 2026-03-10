/**
 * NSCBAV Warden Home Tab Screen
 * 3-state profile flow with AccessBlockedModal.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image, Modal, Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { useQuery } from '@tanstack/react-query';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#1565C0';

function ActionCard({ title, iconName, onPress, disabled = false }: { title: string; iconName: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
    return (
        <TouchableOpacity
            className={`bg-white rounded-xl items-center justify-center py-4 px-2 ${disabled ? 'opacity-50' : ''}`}
            style={{ width: '31%', minHeight: 110, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 }}
            onPress={onPress} activeOpacity={0.75}
        >
            <View className="w-16 h-16 rounded-full bg-[#e8f4fd] justify-center items-center mb-2">
                <Ionicons name={iconName} size={34} color={disabled ? '#9ca3af' : BLUE} />
            </View>
            <Text className={`text-[11px] font-bold text-center leading-[14px] ${disabled ? 'text-gray-400' : 'text-gray-800'}`} numberOfLines={2}>{title}</Text>
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
            <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, opacity }}>
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
                <Animated.View style={{ transform: [{ translateY }], backgroundColor: '#fff', borderRadius: 24, width: '100%', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 28, alignItems: 'center' }}>
                    <Image source={{ uri: isVerification ? 'https://cdn-icons-png.flaticon.com/512/6195/6195699.png' : 'https://cdn-icons-png.flaticon.com/512/3596/3596165.png' }} style={{ width: 140, height: 140, marginBottom: 20 }} resizeMode="contain" />
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: 8 }}>
                        {isVerification ? 'Account under verification' : 'Complete your profile'}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                        {isVerification ? 'Your account is currently under verification by the admin. You will be able to access this once approved.' : 'Kindly complete your profile by filling up relevant experience details.'}
                    </Text>
                    {isVerification ? (
                        <TouchableOpacity style={{ backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center' }} onPress={onClose}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>OK, Got it</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity style={{ backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 }} onPress={onComplete}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Complete Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 8 }}>
                                <Text style={{ color: '#9ca3af', fontSize: 14 }}>Maybe later</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
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
            <View style={{ backgroundColor: BLUE, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
                <View className="flex-row items-center">
                    <View className="mr-4">
                        {user?.profile_image_url ? (
                            <Image source={{ uri: user.profile_image_url }} className="w-20 h-20 rounded-full" style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }} />
                        ) : (
                            <View className="w-20 h-20 rounded-full justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' }}>
                                <Ionicons name="person" size={38} color="rgba(255,255,255,0.8)" />
                            </View>
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-white text-2xl font-bold mb-1" numberOfLines={1}>{user?.name || 'User'}</Text>
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.8)" />
                            <Text className="text-sm ml-1 flex-1" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>{user?.email || 'No email'}</Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                            <Text className="text-white text-xs font-semibold">NSCBAV Warden</Text>
                        </View>
                    </View>
                </View>
            </View>

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
                <TouchableOpacity className="mx-4 mt-2 rounded-xl py-4 items-center" style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }} onPress={() => router.push('/(protected)/nscbav-warden/complete-profile')} activeOpacity={0.8}>
                    <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>Kindly complete your profile</Text>
                </TouchableOpacity>
            )}
            {!loadingProfile && hasCompletedProfile && !isActive && (
                <View className="mx-4 mt-2 rounded-xl py-4 items-center" style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}>
                    <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>Your account is under verification</Text>
                </View>
            )}

            <AccessBlockedModal visible={showProfileModal} mode={modalMode} onClose={() => setShowProfileModal(false)} onComplete={() => { setShowProfileModal(false); router.push('/(protected)/nscbav-warden/complete-profile'); }} />
        </ScrollView>
    );
}
