/**
 * Teacher Events Screen
 * 
 * Displays list of school events created by headmaster.
 * Teachers can view events from their school.
 */

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEvents } from '../../../src/services/firebase/content.firestore';

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: string;
    event_time?: string;
    location?: string;
    event_type: 'MEETING' | 'EXAM' | 'HOLIDAY' | 'OTHER';
    creator?: { id: string; name: string };
    school?: { id: string; name: string };
    created_at: string;
}

export default function TeacherEventsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        data: events,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Event[]>({
        queryKey: ['teacher-events'],
        queryFn: async () => {
            const data = await getEvents();
            return data;
        },
    });

    // Refetch events when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const getEventIcon = (type: Event['event_type']) => {
        switch (type) {
            case 'MEETING':
                return { name: 'people', color: '#3b82f6' };
            case 'EXAM':
                return { name: 'document-text', color: '#f59e0b' };
            case 'HOLIDAY':
                return { name: 'sunny', color: '#10b981' };
            default:
                return { name: 'calendar', color: '#8b5cf6' };
        }
    };

    const getEventTypeStyle = (type: Event['event_type']) => {
        switch (type) {
            case 'MEETING':
                return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
            case 'EXAM':
                return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
            case 'HOLIDAY':
                return { bg: '#d1fae5', text: '#059669', border: '#a7f3d0' };
            default:
                return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb]">
                <ActivityIndicator size="large" color="#1e3a5f" />
                <Text className="mt-3 text-base text-gray-500">Loading events...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-base text-gray-500 mt-3 mb-4">Failed to load events</Text>
                <TouchableOpacity className="bg-[#1e3a5f] px-6 py-3 rounded-lg" onPress={() => refetch()}>
                    <Text className="text-white text-sm font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f9fafb]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 bg-[#1e3a5f]" style={{ paddingTop: insets.top + 12 }}>
                <TouchableOpacity
                    className="p-2"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-white">School Events</Text>
                <View className="w-10" />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {events && events.length > 0 ? (
                    events.map((event) => {
                        const icon = getEventIcon(event.event_type);
                        const typeStyle = getEventTypeStyle(event.event_type);

                        return (
                            <View key={event.id} className="bg-white rounded-xl p-4 mb-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                                <View className="flex-row items-start mb-3">
                                    <View
                                        className="w-12 h-12 rounded-xl justify-center items-center mr-3"
                                        style={{ backgroundColor: typeStyle.bg }}
                                    >
                                        <Ionicons
                                            name={icon.name as any}
                                            size={24}
                                            color={icon.color}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-semibold text-[#1f2937] mb-1">{event.title}</Text>
                                        <View
                                            className="self-start px-2 py-0.5 rounded border"
                                            style={{
                                                backgroundColor: typeStyle.bg,
                                                borderColor: typeStyle.border,
                                            }}
                                        >
                                            <Text className="text-[10px] font-semibold uppercase" style={{ color: typeStyle.text }}>
                                                {event.event_type}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {event.description && (
                                    <Text className="text-sm text-gray-500 leading-5 mb-3" numberOfLines={3}>
                                        {event.description}
                                    </Text>
                                )}

                                <View className="flex-row flex-wrap gap-3">
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                        <Text className="text-[13px] text-gray-500">
                                            {formatDate(event.event_date)}
                                        </Text>
                                    </View>
                                    {event.event_time && (
                                        <View className="flex-row items-center gap-1">
                                            <Ionicons name="time-outline" size={16} color="#6b7280" />
                                            <Text className="text-[13px] text-gray-500">{event.event_time}</Text>
                                        </View>
                                    )}
                                    {event.location && (
                                        <View className="flex-row items-center gap-1">
                                            <Ionicons name="location-outline" size={16} color="#6b7280" />
                                            <Text className="text-[13px] text-gray-500">{event.location}</Text>
                                        </View>
                                    )}
                                </View>

                                {event.creator && (
                                    <View className="flex-row items-center gap-1 mt-3 pt-3 border-t border-[#f3f4f6]">
                                        <Ionicons name="person-outline" size={14} color="#9ca3af" />
                                        <Text className="text-xs text-gray-400">
                                            Created by {event.creator.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                ) : (
                    <View className="flex-1 justify-center items-center pt-20">
                        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                        <Text className="text-lg font-semibold text-gray-700 mt-4">No Events</Text>
                        <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                            No events yet. Tap + to create one!
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* FAB - Create Event */}
            <TouchableOpacity
                className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-[#1e3a5f] justify-center items-center"
                style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                onPress={() => router.push('/(protected)/teacher/create-event')}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}

