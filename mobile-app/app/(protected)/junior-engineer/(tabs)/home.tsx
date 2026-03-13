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
import HomeActionCard from '@/components/HomeActionCard';
import ProjectCard from '@/components/ProjectCard';
import StatusBanner from '@/components/StatusBanner';

const BLUE = '#1565C0';

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
                    <HomeActionCard
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
                                    className="rounded-2xl overflow-hidden mb-4 shadow-md"
                                    style={{ elevation: 3 }}
                                />
                            ))}
                            <TouchableOpacity
                                onPress={() => router.push('/(protected)/junior-engineer/projects')}
                                className="items-center py-3"
                            >
                                <AppText className="text-[#1565C0] text-[16px] font-semibold">View All</AppText>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            {/* Profile status banners */}
            {!hasCompletedProfile && (
                <StatusBanner
                    message="Kindly complete your profile"
                    onPress={() => router.push('/(protected)/junior-engineer/complete-profile')}
                />
            )}

            {hasCompletedProfile && !isActive && (
                <StatusBanner message="Your account is under verification. Contact Admin or your headmaster" />
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
