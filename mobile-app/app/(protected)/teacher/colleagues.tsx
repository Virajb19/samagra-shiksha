import React, { useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getColleagues, getFacultyByUserId } from '../../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../../src/lib/store';

interface Colleague {
    id: string;
    name: string;
    email: string;
    phone: string;
    role?: string;
    highest_qualification?: string;
    years_of_experience?: number;
    subjects?: string[];
}

export default function ColleaguesScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const {
        data: colleagues,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Colleague[]>({
        queryKey: ['colleagues', user?.id],
        queryFn: async () => {
            // First fetch the faculty record to get the school_id
            const faculty = await getFacultyByUserId(user!.id);
            if (!faculty?.school_id) return [];
            return await getColleagues(faculty.school_id, user!.id);
        },
        enabled: !!user?.id,
    });

    // Refetch colleagues when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#ec4899',
            '#06b6d4',
            '#84cc16',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb]">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="mt-3 text-base text-gray-500">Loading colleagues...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-base text-gray-500 mt-3 mb-4">Failed to load colleagues</Text>
                <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg" onPress={() => refetch()}>
                    <Text className="text-white text-sm font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f9fafb]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-[#e5e7eb]">
                <TouchableOpacity
                    className="p-2"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-[#1f2937]">Colleagues</Text>
                <View className="w-10" />
            </View>

            {/* Colleagues List */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {colleagues && colleagues.length > 0 ? (
                    <>
                        <Text className="text-sm text-gray-500 mb-4">
                            {colleagues.length} colleague{colleagues.length !== 1 ? 's' : ''} in your school
                        </Text>
                        {colleagues.map((colleague) => (
                            <View key={colleague.id} className="flex-row bg-white rounded-xl p-4 mb-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                                <View
                                    className="w-[50px] h-[50px] rounded-full justify-center items-center mr-3"
                                    style={{ backgroundColor: getAvatarColor(colleague.name) }}
                                >
                                    <Text className="text-lg font-semibold text-white">
                                        {getInitials(colleague.name)}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-semibold text-[#1f2937] mb-1">{colleague.name}</Text>
                                    {colleague.highest_qualification && (
                                        <Text className="text-[13px] text-gray-500 mb-0.5">
                                            <Ionicons name="school-outline" size={12} color="#6b7280" />{' '}
                                            {colleague.highest_qualification}
                                        </Text>
                                    )}
                                    {colleague.years_of_experience !== undefined && (
                                        <Text className="text-[13px] text-gray-500 mb-0.5">
                                            <Ionicons name="time-outline" size={12} color="#6b7280" />{' '}
                                            {colleague.years_of_experience} years experience
                                        </Text>
                                    )}
                                    {colleague.subjects && colleague.subjects.length > 0 && (
                                        <View className="flex-row flex-wrap mt-2 gap-1.5">
                                            {colleague.subjects.slice(0, 3).map((subject, index) => (
                                                <View key={index} className="bg-[#eff6ff] px-2 py-1 rounded">
                                                    <Text className="text-[11px] text-blue-500 font-medium">{subject}</Text>
                                                </View>
                                            ))}
                                            {colleague.subjects.length > 3 && (
                                                <View className="bg-[#eff6ff] px-2 py-1 rounded">
                                                    <Text className="text-[11px] text-blue-500 font-medium">
                                                        +{colleague.subjects.length - 3}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </>
                ) : (
                    <View className="flex-1 justify-center items-center pt-20">
                        <Ionicons name="people-outline" size={64} color="#d1d5db" />
                        <Text className="text-lg font-semibold text-gray-700 mt-4">No Colleagues Found</Text>
                        <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                            There are no other teachers registered at your school yet.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

