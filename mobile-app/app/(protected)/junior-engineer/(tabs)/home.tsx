/**
 * Junior Engineer Home Tab Screen
 *
 * 3-state profile flow:
 * 1. Profile incomplete → "Kindly complete your profile" banner + AccessBlockedModal
 * 2. Profile complete, not active → "Your account is under verification"
 * 3. Active → full access
 *
 * Action cards: Complete/View Profile, Notices, View Projects
 * Projects section: Shows 2 recent projects with View All button
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Modal,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getAllRecentProjects } from '../../../../src/services/project.service';
import type { Project } from '../../../../src/types';
import { ProfileHeaderCard } from '@/components/ProfileHeaderCard';

const BLUE = '#1565C0';

interface ActionCardProps {
    title: string;
    iconName: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    disabled?: boolean;
}

function ActionCard({ title, iconName, onPress, disabled = false }: ActionCardProps) {
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
            <AppText
                className={`text-[11px] font-bold text-center leading-[14px] ${disabled ? 'text-gray-400' : 'text-gray-800'}`}
                numberOfLines={2}
            >
                {title}
            </AppText>
        </TouchableOpacity>
    );
}

/** Center-screen animated modal for locked actions */
function AccessBlockedModal({ visible, mode, onClose, onComplete }: {
    visible: boolean;
    mode: 'complete' | 'verification';
    onClose: () => void;
    onComplete: () => void;
}) {
    const isVerification = mode === 'verification';
    const [internalVisible, setInternalVisible] = useState(false);
    const translateY = useRef(new Animated.Value(280)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setInternalVisible(true);
            translateY.setValue(280);
            opacity.setValue(0);
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
                    <Image
                        source={{
                            uri: isVerification
                                ? 'https://cdn-icons-png.flaticon.com/512/6195/6195699.png'
                                : 'https://cdn-icons-png.flaticon.com/512/3596/3596165.png'
                        }}
                        className="w-[140px] h-[140px] mb-5"
                        resizeMode="contain"
                    />
                    <AppText className="text-[22px] font-bold text-[#1a1a2e] text-center mb-2">
                        {isVerification ? 'Account under verification' : 'Complete your profile'}
                    </AppText>
                    <AppText className="text-sm text-gray-500 text-center leading-[22px] mb-7">
                        {isVerification
                            ? 'Your account is currently under verification by the admin. You will be able to access this once approved.'
                            : 'Kindly complete your profile by filling up relevant experience details.'}
                    </AppText>
                    {isVerification ? (
                        <TouchableOpacity
                            className="bg-[#1565C0] rounded-xl py-3.5 w-full items-center mb-3"
                            onPress={onClose}
                        >
                            <AppText className="text-white text-base font-semibold">OK, Got it</AppText>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity
                                className="bg-[#1565C0] rounded-xl py-3.5 w-full items-center mb-3"
                                onPress={onComplete}
                            >
                                <AppText className="text-white text-base font-semibold">Complete Profile</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} className="py-2">
                                <AppText className="text-gray-400 text-sm">Maybe later</AppText>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

/** Project card for home screen */
function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
    const progressWidth = `${Math.min(project.progress, 100)}%` as import('react-native').DimensionValue;
    const isCompleted = project.status === 'Completed';
    const progressLabel =
        project.progress === 0
            ? 'N/A'
            : isCompleted
                ? 'Completed'
                : project.progress >= 100
                    ? '100% (Pending close)'
                    : `${project.progress}%`;
    const progressColor = isCompleted ? '#22c55e' : project.progress > 0 ? BLUE : '#9ca3af';

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            className="rounded-2xl overflow-hidden mb-4 shadow-md"
            style={{ elevation: 3 }}
        >
            <View className="bg-[#1565C0] p-4">
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                        <AppText className="text-white/80 text-xs font-semibold mb-1">{project.activity}</AppText>
                        <AppText className="text-white text-lg font-bold" numberOfLines={1}>{project.school_name}</AppText>
                    </View>
                    <View className={`rounded-lg px-3 py-1 ${isCompleted ? 'bg-green-500' : 'bg-white/20'}`}>
                        <AppText className="text-white text-xs font-bold">{progressLabel}</AppText>
                    </View>
                </View>
                <View className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <View style={{ width: progressWidth, backgroundColor: '#fff', height: '100%', borderRadius: 999 }} />
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <AppText className="text-white/70 text-xs ml-1">{project.district_name}</AppText>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function JuniorEngineerHomeTabScreen() {
    const { user } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [modalMode, setModalMode] = useState<'complete' | 'verification'>('complete');

    // Derive from real-time store user (kept up-to-date via onSnapshot in store)
    const hasCompletedProfile = user?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;

    // Recent projects (2) for home screen — across all districts
    const {
        data: recentProjects = [],
        isLoading: loadingProjects,
        refetch: refetchRecentProjects,
    } = useQuery<Project[]>({
        queryKey: ['recent-projects-all'],
        queryFn: () => getAllRecentProjects(),
        enabled: hasCompletedProfile && isActive,
    });

    useFocusEffect(
        useCallback(() => {
            if (hasCompletedProfile && isActive) {
                refetchRecentProjects();
            }
        }, [hasCompletedProfile, isActive, refetchRecentProjects]),
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
            <ProfileHeaderCard roleLabel="Junior Engineer" />

            {/* Action Cards Grid */}
            <View className="px-4 mt-5">
                <View className="flex-row justify-between mb-3">
                    <ActionCard
                        title={hasCompletedProfile ? 'View Profile' : 'Complete Profile'}
                        iconName="person-outline"
                        onPress={() => {
                            if (!hasCompletedProfile) {
                                router.push('/(protected)/junior-engineer/complete-profile');
                            } else {
                                router.push('/(protected)/junior-engineer/view-profile');
                            }
                        }}
                    />
                    <ActionCard
                        title="Important Notices"
                        iconName="megaphone-outline"
                        onPress={() => {
                            if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; }
                            router.push('/(protected)/notices' as any);
                        }}
                        disabled={!hasCompletedProfile || !isActive}
                    />
                    <ActionCard
                        title="View Projects"
                        iconName="document-text-outline"
                        onPress={() => {
                            if (!hasCompletedProfile || !isActive) { handleLockedAction(); return; }
                            router.push('/(protected)/junior-engineer/projects');
                        }}
                        disabled={!hasCompletedProfile || !isActive}
                    />
                </View>
            </View>

            {/* Projects Section */}
            {hasCompletedProfile && isActive && (
                <View className="px-4 mt-4">
                    <AppText weight='bold' className="text-xl text-gray-800 mb-3">Projects</AppText>
                    {loadingProjects ? (
                        <ActivityIndicator size="small" color={BLUE} className="my-6" />
                    ) : recentProjects.length === 0 ? (
                        <View className="bg-white rounded-xl py-8 items-center shadow-sm" style={{ elevation: 1 }}>
                            <Ionicons name="folder-open-outline" size={40} color="#9ca3af" />
                            <AppText className="text-gray-400 mt-2 text-sm">No projects assigned yet</AppText>
                        </View>
                    ) : (
                        <>
                            {recentProjects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onPress={() => router.push(`/(protected)/junior-engineer/project-detail?id=${project.id}`)}
                                />
                            ))}
                            <TouchableOpacity
                                onPress={() => router.push('/(protected)/junior-engineer/projects')}
                                className="items-center py-3"
                            >
                                <AppText className="text-[#1565C0] text-[15px] font-semibold">View All</AppText>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            {/* Profile status banners */}
            {!hasCompletedProfile && (
                <TouchableOpacity
                    className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-dashed border-[#1565C0] bg-[#1565C0]"
                    onPress={() => router.push('/(protected)/junior-engineer/complete-profile')}
                    activeOpacity={0.8}
                >
                    <AppText className="text-[#1565C0] text-[15px] font-semibold">Kindly complete your profile</AppText>
                </TouchableOpacity>
            )}

            {hasCompletedProfile && !isActive && (
                <View className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-dashed border-[#1565C0] bg-[#1565C0]">
                    <AppText className="text-[#1565C0] text-[15px] font-semibold">Your account is under verification</AppText>
                </View>
            )}

            {/* Access Blocked Modal */}
            <AccessBlockedModal
                visible={showProfileModal}
                mode={modalMode}
                onClose={() => setShowProfileModal(false)}
                onComplete={() => {
                    setShowProfileModal(false);
                    router.push('/(protected)/junior-engineer/complete-profile');
                }}
            />
        </ScrollView>
    );
}
