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

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getAllRecentProjects } from '../../../../src/services/project.service';
import type { Project } from '../../../../src/types';

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
            className={`bg-white rounded-xl items-center justify-center py-4 px-2 ${disabled ? 'opacity-50' : ''}`}
            style={{ width: '31%', minHeight: 110, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 }}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View className="w-16 h-16 rounded-full bg-[#e8f4fd] justify-center items-center mb-2">
                <Ionicons name={iconName} size={34} color={disabled ? '#9ca3af' : BLUE} />
            </View>
            <Text
                className={`text-[11px] font-bold text-center leading-[14px] ${disabled ? 'text-gray-400' : 'text-gray-800'}`}
                numberOfLines={2}
            >
                {title}
            </Text>
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
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, opacity }}
            >
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
                <Animated.View
                    style={{ transform: [{ translateY }], backgroundColor: '#fff', borderRadius: 24, width: '100%', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 28, alignItems: 'center' }}
                >
                    <Image
                        source={{
                            uri: isVerification
                                ? 'https://cdn-icons-png.flaticon.com/512/6195/6195699.png'
                                : 'https://cdn-icons-png.flaticon.com/512/3596/3596165.png'
                        }}
                        style={{ width: 140, height: 140, marginBottom: 20 }}
                        resizeMode="contain"
                    />
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: 8 }}>
                        {isVerification ? 'Account under verification' : 'Complete your profile'}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                        {isVerification
                            ? 'Your account is currently under verification by the admin. You will be able to access this once approved.'
                            : 'Kindly complete your profile by filling up relevant experience details.'}
                    </Text>
                    {isVerification ? (
                        <TouchableOpacity
                            style={{ backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 }}
                            onPress={onClose}
                        >
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>OK, Got it</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={{ backgroundColor: BLUE, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 }}
                                onPress={onComplete}
                            >
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

/** Project card for home screen */
function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
    const progressWidth = `${Math.min(project.progress, 100)}%` as import('react-native').DimensionValue;
    const isCompleted = project.status === 'Completed';
    const progressLabel = project.progress === 0 ? 'N/A' : isCompleted ? 'Completed' : `${project.progress}%`;
    const progressColor = isCompleted ? '#22c55e' : project.progress > 0 ? BLUE : '#9ca3af';

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            className="rounded-2xl overflow-hidden mb-4"
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
        >
            <View style={{ backgroundColor: BLUE, padding: 16 }}>
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                        <Text className="text-white/80 text-xs font-semibold mb-1">{project.activity}</Text>
                        <Text className="text-white text-lg font-bold" numberOfLines={1}>{project.school_name}</Text>
                    </View>
                    <View className="rounded-lg px-3 py-1" style={{ backgroundColor: isCompleted ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>
                        <Text className="text-white text-xs font-bold">{progressLabel}</Text>
                    </View>
                </View>
                <View className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <View style={{ width: progressWidth, backgroundColor: '#fff', height: '100%', borderRadius: 999 }} />
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <Text className="text-white/70 text-xs ml-1">{project.district_name}</Text>
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
    const { data: recentProjects = [], isLoading: loadingProjects } = useQuery<Project[]>({
        queryKey: ['recent-projects-all'],
        queryFn: () => getAllRecentProjects(),
        enabled: hasCompletedProfile && isActive,
    });

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
            <View style={{ backgroundColor: BLUE, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
                <View className="flex-row items-center">
                    <View className="mr-4">
                        {user?.profile_image_url ? (
                            <Image
                                source={{ uri: user.profile_image_url }}
                                className="w-20 h-20 rounded-full"
                                style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }}
                            />
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
                            <Text className="text-white text-xs font-semibold">Junior Engineer</Text>
                        </View>
                    </View>
                </View>
            </View>

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
                            Alert.alert('Coming Soon', 'Notices will be available soon.');
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
                    <Text className="text-xl font-bold text-gray-800 mb-3">Projects</Text>
                    {loadingProjects ? (
                        <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 24 }} />
                    ) : recentProjects.length === 0 ? (
                        <View className="bg-white rounded-xl py-8 items-center" style={{ elevation: 1 }}>
                            <Ionicons name="folder-open-outline" size={40} color="#9ca3af" />
                            <Text className="text-gray-400 mt-2 text-sm">No projects assigned yet</Text>
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
                                <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>View All</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            {/* Profile status banners */}
            {!hasCompletedProfile && (
                <TouchableOpacity
                    className="mx-4 mt-2 rounded-xl py-4 items-center"
                    style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}
                    onPress={() => router.push('/(protected)/junior-engineer/complete-profile')}
                    activeOpacity={0.8}
                >
                    <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>Kindly complete your profile</Text>
                </TouchableOpacity>
            )}

            {hasCompletedProfile && !isActive && (
                <View
                    className="mx-4 mt-2 rounded-xl py-4 items-center"
                    style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}
                >
                    <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>Your account is under verification</Text>
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
