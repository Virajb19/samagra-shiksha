/**
 * Junior Engineer Events Tab Screen
 * Reuses the same events logic — 3-state access model.
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
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { getEvents } from '../../../../src/services/firebase/content.firestore';

const BLUE = '#1565C0';

interface Event {
    id: string;
    title: string;
    description?: string;
    event_date?: string;
    location?: string;
    created_at?: string;
}

export default function EventsTabScreen() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: profileStatus } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: async () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;
    const canAccess = hasCompletedProfile && isActive;

    const { data: events, isLoading, refetch, isRefetching } = useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: getEvents,
        enabled: canAccess,
    });

    // Refetch events when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    if (!canAccess) {
        return (
            <View className="flex-1 bg-[#f0f4f8] justify-center items-center px-6">
                <View className="rounded-2xl py-6 px-4 items-center w-full" style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}>
                    <Ionicons name={!hasCompletedProfile ? 'person-circle-outline' : 'time-outline'} size={48} color={BLUE} />
                    <Text style={{ color: BLUE, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                        {!hasCompletedProfile ? 'Kindly complete your profile' : 'Your account is under verification'}
                    </Text>
                    <Text className="text-gray-500 text-sm text-center mt-2">
                        {!hasCompletedProfile ? 'Complete your profile to access events.' : 'Please wait for admin to verify your account.'}
                    </Text>
                </View>
            </View>
        );
    }

    const filteredEvents = events?.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <ScrollView
            className="flex-1 bg-[#f0f4f8]"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            {/* Search */}
            <View className="flex-row items-center bg-white rounded-xl px-3 mb-4" style={{ elevation: 1 }}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                    className="flex-1 py-3 px-2 text-[15px] text-gray-900"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
            ) : filteredEvents.length === 0 ? (
                <View className="items-center mt-10">
                    <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-400 mt-3">No events found</Text>
                </View>
            ) : (
                filteredEvents.map((event) => (
                    <View key={event.id} className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
                        <Text className="text-base font-semibold text-gray-900">{event.title}</Text>
                        {event.description && <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>{event.description}</Text>}
                        {event.event_date && (
                            <View className="flex-row items-center mt-2">
                                <Ionicons name="calendar" size={14} color="#6b7280" />
                                <Text className="text-xs text-gray-500 ml-1">{new Date(event.event_date).toLocaleDateString()}</Text>
                            </View>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
}
