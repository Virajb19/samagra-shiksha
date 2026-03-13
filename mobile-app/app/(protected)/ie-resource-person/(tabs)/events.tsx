/**
 * IEResourcePerson Events Tab Screen
 * Uses shared EventsListScreen. View-only (no create).
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import EventsListScreen from '../../../../src/components/EventsListScreen';
import { AppText } from '@/components/AppText';

const BLUE = '#1565C0';

function StatusBanner({ message }: { message: string }) {
    return (
        <View className="flex-1 p-4">
            <View className="border-[1.5px] border-dashed rounded-xl py-[18px] items-center bg-[#1565C0]" style={{ borderColor: BLUE }}>
                <AppText className="text-[15px] font-semibold" style={{ color: BLUE }}>{message}</AppText>
            </View>
        </View>
    );
}

export default function IEResourcePersonEventsTabScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const { data: profileStatus, isLoading: profileLoading } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;

    if (profileLoading) return <View className="flex-1 justify-center items-center bg-[#f5f5f5]"><ActivityIndicator size="large" color={BLUE} /></View>;
    if (!hasCompletedProfile) return (<View className="flex-1 bg-[#f5f5f5]"><View className="flex-row justify-between items-center px-4 pt-3 pb-2"><AppText className="text-[26px] font-bold text-[#1a1a1a]">Events</AppText></View><StatusBanner message="Kindly complete your profile" /></View>);
    if (!isActive) return (<View className="flex-1 bg-[#f5f5f5]"><View className="flex-row justify-between items-center px-4 pt-3 pb-2"><AppText className="text-[26px] font-bold text-[#1a1a1a]">Events</AppText></View><StatusBanner message="Your account is under verification" /></View>);

    return (
        <EventsListScreen
            queryKey="ie-events"
            onEventPress={(id) => router.push({ pathname: '/(protected)/ie-resource-person/event-detail', params: { id } } as any)}
        />
    );
}
