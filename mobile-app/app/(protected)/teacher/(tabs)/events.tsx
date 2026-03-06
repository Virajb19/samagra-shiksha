/**
 * Teacher Events Tab Screen
 *
 * 3-state access model:
 * 1. Profile NOT complete → "Kindly complete your profile" dashed banner
 * 2. Profile complete but NOT active → "Your account is under verification" dashed banner
 * 3. Active → full events list
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { getEvents } from '../../../../src/services/firebase/content.firestore';

const BLUE = '#1565C0';

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: string;
    event_time?: string;
    location?: string;
    event_type: 'MEETING' | 'EXAM' | 'HOLIDAY' | 'OTHER';
    creator?: { id: string; name: string };
    created_at: string;
}

function StatusBanner({ message }: { message: string }) {
    return (
        <View style={{ flex: 1, padding: 16 }}>
            <View style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: BLUE,
                borderRadius: 12,
                backgroundColor: '#e8f4fd',
                paddingVertical: 18,
                alignItems: 'center',
            }}>
                <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>{message}</Text>
            </View>
        </View>
    );
}

export default function EventsTabScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: profileStatus, isLoading: profileLoading } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: async () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;

    const {
        data: events,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Event[]>({
        queryKey: ['teacher-events'],
        queryFn: async () => {
            try {
                return await getEvents();
            } catch {
                return [];
            }
        },
        enabled: hasCompletedProfile && isActive,
    });

    // Refetch events when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const filteredEvents = React.useMemo(() => {
        if (!events) return [];
        if (!searchQuery.trim()) return events;
        const query = searchQuery.toLowerCase();
        return events.filter(
            e =>
                e.title.toLowerCase().includes(query) ||
                e.description?.toLowerCase().includes(query) ||
                e.event_type.toLowerCase().includes(query) ||
                e.creator?.name?.toLowerCase().includes(query)
        );
    }, [events, searchQuery]);

    const getEventIcon = (type: Event['event_type']) => {
        switch (type) {
            case 'MEETING': return { name: 'people', color: '#3b82f6' };
            case 'EXAM': return { name: 'document-text', color: '#f59e0b' };
            case 'HOLIDAY': return { name: 'sunny', color: '#10b981' };
            default: return { name: 'calendar', color: '#8b5cf6' };
        }
    };

    const getEventTypeStyle = (type: Event['event_type']) => {
        switch (type) {
            case 'MEETING': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
            case 'EXAM': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
            case 'HOLIDAY': return { bg: '#d1fae5', text: '#059669', border: '#a7f3d0' };
            default: return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    if (profileLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f4f8]">
                <ActivityIndicator size="large" color={BLUE} />
            </View>
        );
    }

    // State 1: Profile not completed
    if (!hasCompletedProfile) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <Text className="text-2xl font-bold text-gray-800 pt-5 px-4 mb-1">Events</Text>
                <StatusBanner message="Kindly complete your profile" />
            </View>
        );
    }

    // State 2: Profile complete but account not yet activated
    if (!isActive) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <Text className="text-2xl font-bold text-gray-800 pt-5 px-4 mb-1">Events</Text>
                <StatusBanner message="Your account is under verification" />
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f4f8]">
                <ActivityIndicator size="large" color={BLUE} />
                <Text className="mt-3 text-base text-gray-500">Loading events...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f4f8] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="mt-3 text-base text-red-500 text-center">Failed to load events</Text>
                <TouchableOpacity className="mt-4 px-6 py-3 rounded-lg" style={{ backgroundColor: BLUE }} onPress={() => refetch()}>
                    <Text className="text-white text-sm font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // State 3: Active — show events
    return (
        <View className="flex-1 bg-[#f0f4f8] p-4">
            <Text className="text-2xl font-bold text-gray-800 mb-4">Events</Text>
            <View className="flex-row items-center bg-gray-200 rounded-[10px] px-3 py-[10px] mb-3 gap-2">
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                    className="flex-1 text-base text-gray-800"
                    placeholder="Search events..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {filteredEvents && filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => {
                        const icon = getEventIcon(event.event_type);
                        const typeStyle = getEventTypeStyle(event.event_type);
                        return (
                            <View key={event.id} className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
                                <View className="flex-row items-start mb-3">
                                    <View className="w-12 h-12 rounded-full justify-center items-center mr-3" style={{ backgroundColor: typeStyle.bg }}>
                                        <Ionicons name={icon.name as any} size={24} color={icon.color} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-semibold text-gray-800 mb-1">{event.title}</Text>
                                        <View className="self-start px-2 py-[2px] rounded border" style={{ backgroundColor: typeStyle.bg, borderColor: typeStyle.border }}>
                                            <Text className="text-[10px] font-semibold uppercase" style={{ color: typeStyle.text }}>{event.event_type}</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text className="text-sm text-gray-500 leading-5 mb-3" numberOfLines={2}>{event.description}</Text>
                                <View className="flex-row gap-4">
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                        <Text className="text-xs text-gray-500">{formatDate(event.event_date)}</Text>
                                    </View>
                                    {event.event_time && (
                                        <View className="flex-row items-center gap-1">
                                            <Ionicons name="time-outline" size={16} color="#6b7280" />
                                            <Text className="text-xs text-gray-500">{event.event_time}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View className="flex-1 justify-center items-center py-16">
                        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                        <Text className="text-lg font-semibold text-gray-500 mt-4">No Events</Text>
                        <Text className="text-sm text-gray-400 text-center mt-2">
                            {searchQuery ? 'No events match your search.' : 'No events yet.'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                className="absolute right-5 bottom-6 w-14 h-14 rounded-full justify-center items-center"
                style={{ backgroundColor: BLUE, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                onPress={() => router.push('/(protected)/teacher/create-event')}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}
