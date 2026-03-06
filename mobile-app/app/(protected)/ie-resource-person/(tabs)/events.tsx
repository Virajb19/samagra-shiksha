/**
 * IE Resource Person Events Tab — 3-state access model.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { getEvents } from '../../../../src/services/firebase/content.firestore';

const BLUE = '#1565C0';

export default function EventsTabScreen() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const { data: profileStatus } = useQuery({ queryKey: ['profile-status', user?.id], queryFn: async () => getProfileStatus(user!.id), enabled: !!user?.id });
    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;
    const canAccess = hasCompletedProfile && isActive;
    const { data: events, isLoading, refetch, isRefetching } = useQuery<any[]>({ queryKey: ['events'], queryFn: getEvents, enabled: canAccess });

    // Refetch events when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    if (!canAccess) {
        return (
            <View className="flex-1 bg-[#f0f4f8] justify-center items-center px-6">
                <View className="rounded-2xl py-6 px-4 items-center w-full" style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}>
                    <Ionicons name={!hasCompletedProfile ? 'person-circle-outline' : 'time-outline'} size={48} color={BLUE} />
                    <Text style={{ color: BLUE, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>{!hasCompletedProfile ? 'Kindly complete your profile' : 'Your account is under verification'}</Text>
                </View>
            </View>
        );
    }

    const filteredEvents = events?.filter((e: any) => e.title?.toLowerCase().includes(searchQuery.toLowerCase())) || [];

    return (
        <ScrollView className="flex-1 bg-[#f0f4f8]" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
            <View className="flex-row items-center bg-white rounded-xl px-3 mb-4" style={{ elevation: 1 }}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput className="flex-1 py-3 px-2 text-[15px] text-gray-900" placeholder="Search events..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            {isLoading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} /> : filteredEvents.length === 0 ? (
                <View className="items-center mt-10"><Ionicons name="calendar-outline" size={48} color="#d1d5db" /><Text className="text-gray-400 mt-3">No events found</Text></View>
            ) : filteredEvents.map((event: any) => (
                <View key={event.id} className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
                    <Text className="text-base font-semibold text-gray-900">{event.title}</Text>
                    {event.description && <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>{event.description}</Text>}
                </View>
            ))}
        </ScrollView>
    );
}
