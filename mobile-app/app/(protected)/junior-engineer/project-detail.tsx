 /**
 * Project Detail Screen
 *
 * Shows project info header + list of progress updates (expandable).
 * "Update Project Status" button navigates to the update form.
 */

import React, { useCallback, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getProjectUpdates } from '../../../src/services/project.service';
import { getProjectById } from '../../../src/services/project.service';
import type { Project, ProjectUpdate } from '../../../src/types';

const BLUE = '#1565C0';

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return iso;
    }
}

/** Expandable update card */
function UpdateCard({ update }: { update: ProjectUpdate }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.9}
            className="bg-white rounded-xl mb-3 overflow-hidden"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 }}
        >
            <View className="p-4">
                <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                        <AppText className="text-base font-bold text-gray-800">
                            {update.completion_status === 100 ? 'Completed' : `${update.completion_status}%`}
                        </AppText>
                        <AppText className="text-xs text-gray-500 mt-0.5">{formatDate(update.created_at)}</AppText>
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#6b7280" />
                </View>

                {expanded && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                        {/* Photos */}
                        {update.photos.length > 0 && (
                            <View className="flex-row mb-3">
                                {update.photos.map((photo, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: photo }}
                                        className="w-24 h-24 rounded-lg mr-2"
                                        resizeMode="cover"
                                    />
                                ))}
                            </View>
                        )}

                        {/* Uploaded By */}
                        <AppText className="text-sm text-gray-600">
                            <AppText className="font-semibold">Uploaded By: </AppText>
                            {update.user_name}
                        </AppText>

                        {/* Location */}
                        {update.location_address && (
                            <AppText className="text-sm text-gray-600 mt-1">
                                <AppText className="font-semibold">Location: </AppText>
                                {update.location_address}
                            </AppText>
                        )}

                        {/* Comment */}
                        {update.comment && (
                            <AppText className="text-sm text-gray-600 mt-1">
                                <AppText className="font-semibold">Comment: </AppText>
                                {update.comment}
                            </AppText>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function ProjectDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    // Fetch single project by ID directly
    const { data: project, isLoading: projectLoading, refetch: refetchProject } = useQuery<Project | null>({
        queryKey: ['project', id],
        queryFn: () => getProjectById(id!),
        enabled: !!id,
    });

    // Fetch updates for this project
    const { data: updates = [], isLoading: updatesLoading, refetch: refetchUpdates } = useQuery<ProjectUpdate[]>({
        queryKey: ['project-updates', id],
        queryFn: () => getProjectUpdates(id!),
        enabled: !!id,
    });

    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
            if (id) {
                await Promise.all([refetchProject(), refetchUpdates()]);
            }
            };

            fetchData();
        }, [id, refetchProject, refetchUpdates])
     );

    if (projectLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#f0f4f8]">
                <ActivityIndicator size="large" color={BLUE} />
            </View>
        );
    }

    if (!project) {
        return (
            <View className="flex-1 items-center justify-center bg-[#f0f4f8]">
                <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
                <AppText className="text-gray-400 mt-2">Project not found</AppText>
            </View>
        );
    }

    const progressLabel =
        project.progress === 0
            ? 'N/A'
            : project.status === 'Completed'
                ? 'Completed'
                : project.progress >= 100
                    ? '100% (Pending close)'
                    : `${project.progress}%`;
    const isCompleted = project.status === 'Completed';

    return (
        <View className="flex-1 bg-[#f0f4f8]">
                {/* Project Info Header */}
                <View style={{ backgroundColor: BLUE, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-3">
                            <AppText className="text-white/80 text-xs font-semibold">{project.activity}</AppText>
                            <AppText className="text-white text-xl font-bold mt-1" numberOfLines={2}>{project.school_name}</AppText>
                            <AppText className="text-white/70 text-xs mt-1">Project ID:  #{project.udise_code}</AppText>
                            <AppText className="text-white/70 text-xs">Category:  {project.category}</AppText>
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                                <AppText className="text-white/70 text-xs ml-1">{project.district_name}</AppText>
                            </View>
                        </View>
                        <View className="rounded-lg px-3 py-1.5" style={{ backgroundColor: isCompleted ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>
                            <AppText className="text-white text-xs font-bold">{progressLabel}</AppText>
                        </View>
                    </View>
                </View>

                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                    <AppText className="text-base font-bold text-gray-800 mb-3">Project Details</AppText>

                    {updatesLoading ? (
                        <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 32 }} />
                    ) : updates.length === 0 ? (
                        <View className="items-center py-12">
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
                                style={{ width: 100, height: 100, opacity: 0.5 }}
                                resizeMode="contain"
                            />
                            <AppText className="text-gray-400 text-lg font-bold mt-4 tracking-widest">NO UPDATES</AppText>
                        </View>
                    ) : (
                        updates.map((update) => (
                            <UpdateCard key={update.id} update={update} />
                        ))
                    )}
                </ScrollView>

                {/* Update Project Status Button */}
                <View className="px-4 pb-6 pt-2" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                    <TouchableOpacity
                        onPress={() => router.push(`/(protected)/junior-engineer/update-project-status?id=${project.id}&progress=${project.progress}&school_name=${encodeURIComponent(project.school_name)}&activity=${encodeURIComponent(project.activity)}&district_name=${encodeURIComponent(project.district_name)}&category=${encodeURIComponent(project.category)}&udise_code=${project.udise_code}`)}
                        className="rounded-xl py-4 items-center"
                        style={{ backgroundColor: BLUE, elevation: 4 }}
                        activeOpacity={0.85}
                    >
                        <AppText className="text-white text-base font-bold">Update Project Status</AppText>
                    </TouchableOpacity>
                </View>
        </View>
    );
}
