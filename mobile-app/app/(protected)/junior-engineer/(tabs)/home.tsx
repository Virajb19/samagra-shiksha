/**
 * Junior Engineer Home Tab Screen
 *
 * 3-state profile flow:
 * 1. Profile incomplete → "Kindly complete your profile" banner + AccessBlockedModal
 * 2. Profile complete, not active → "Your account is under verification. Contact Admin or your headmaster"
 * 3. Active → full access
 *
 * Action cards: Complete/View Profile, Notices, View Projects
 * Projects section: Shows 2 recent projects with View All button
 */

import React, { useCallback, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getAllRecentProjects } from '../../../../src/services/project.service';
import type { Project } from '../../../../src/types';
import { ProfileHeaderCard } from '@/components/ProfileHeaderCard';
import AccessBlockedModal from '@/components/AccessBlockedModal';

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
            <View className="w-16 h-16 rounded-full bg-[#e8f4fd] justify-center items-center mb-2">
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
                    className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-[#1565C0] bg-[#e8f4fd]" style={{ borderStyle: 'dashed' }}
                    onPress={() => router.push('/(protected)/junior-engineer/complete-profile')}
                    activeOpacity={0.8}
                >
                    <AppText className="text-[#1565C0] text-[15px] font-semibold">Kindly complete your profile</AppText>
                </TouchableOpacity>
            )}

            {hasCompletedProfile && !isActive && (
                <View className="mx-4 mt-2 rounded-xl py-4 items-center border-[1.5px] border-[#1565C0] bg-[#e8f4fd]" style={{ borderStyle: 'dashed' }}>
                    <AppText className="text-[#1565C0] text-[15px] font-semibold text-center">Your account is under verification. Contact Admin or your headmaster</AppText>
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
