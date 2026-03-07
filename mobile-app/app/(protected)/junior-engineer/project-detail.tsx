 /**
 * Project Detail Screen
 *
 * Shows project info header + list of progress updates (expandable).
 * "Update Project Status" button navigates to the update form.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getProjectUpdates } from '../../../src/services/project.service';
import { getProjectsByDistrict } from '../../../src/services/project.service';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../../src/lib/store';
import type { Project, ProjectUpdate, District } from '../../../src/types';

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
                        <Text className="text-base font-bold text-gray-800">
                            {update.completion_status === 100 ? 'Completed' : `${update.completion_status}%`}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">{formatDate(update.created_at)}</Text>
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
                        <Text className="text-sm text-gray-600">
                            <Text className="font-semibold">Uploaded By: </Text>
                            {update.user_name}
                        </Text>

                        {/* Location */}
                        {update.location_address && (
                            <Text className="text-sm text-gray-600 mt-1">
                                <Text className="font-semibold">Location: </Text>
                                {update.location_address}
                            </Text>
                        )}

                        {/* Comment */}
                        {update.comment && (
                            <Text className="text-sm text-gray-600 mt-1">
                                <Text className="font-semibold">Comment: </Text>
                                {update.comment}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function ProjectDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();

    // Fetch districts for lookup
    const { data: districts = [] } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const userDistrictName = districts.find(d => d.id === user?.district_id)?.name || '';

    // Re-use the projects list query to get the specific project
    const { data: allProjects = [], isLoading: projectLoading } = useQuery<Project[]>({
        queryKey: ['projects-list', userDistrictName],
        queryFn: () => getProjectsByDistrict(userDistrictName),
        enabled: !!userDistrictName,
    });

    const project = allProjects.find(p => p.id === id);

    // Fetch updates for this project
    const { data: updates = [], isLoading: updatesLoading, refetch: refetchUpdates } = useQuery<ProjectUpdate[]>({
        queryKey: ['project-updates', id],
        queryFn: () => getProjectUpdates(id!),
        enabled: !!id,
    });

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
                <Text className="text-gray-400 mt-2">Project not found</Text>
            </View>
        );
    }

    const progressLabel = project.progress === 0 ? 'N/A' : project.status === 'Completed' ? 'Completed' : `${project.progress}%`;
    const isCompleted = project.status === 'Completed';

    return (
        <View className="flex-1 bg-[#f0f4f8]">
                {/* Project Info Header */}
                <View style={{ backgroundColor: BLUE, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-3">
                            <Text className="text-white/80 text-xs font-semibold">{project.activity}</Text>
                            <Text className="text-white text-xl font-bold mt-1" numberOfLines={2}>{project.school_name}</Text>
                            <Text className="text-white/70 text-xs mt-1">Project ID:  #{project.udise_code}</Text>
                            <Text className="text-white/70 text-xs">Category:  {project.category}</Text>
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                                <Text className="text-white/70 text-xs ml-1">{project.district_name}</Text>
                            </View>
                        </View>
                        <View className="rounded-lg px-3 py-1.5" style={{ backgroundColor: isCompleted ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>
                            <Text className="text-white text-xs font-bold">{progressLabel}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                    <Text className="text-base font-bold text-gray-800 mb-3">Project Details</Text>

                    {updatesLoading ? (
                        <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 32 }} />
                    ) : updates.length === 0 ? (
                        <View className="items-center py-12">
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
                                style={{ width: 100, height: 100, opacity: 0.5 }}
                                resizeMode="contain"
                            />
                            <Text className="text-gray-400 text-lg font-bold mt-4 tracking-widest">NO UPDATES</Text>
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
                        onPress={() => router.push(`/(protected)/junior-engineer/update-project-status?id=${project.id}&progress=${project.progress}`)}
                        className="rounded-xl py-4 items-center"
                        style={{ backgroundColor: BLUE, elevation: 4 }}
                        activeOpacity={0.85}
                    >
                        <Text className="text-white text-base font-bold">Update Project Status</Text>
                    </TouchableOpacity>
                </View>
        </View>
    );
}
