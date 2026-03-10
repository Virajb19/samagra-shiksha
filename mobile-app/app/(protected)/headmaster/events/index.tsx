/**
 * Headmaster Events Screen (standalone)
 * Uses shared EventsListScreen with header, back button, and create button.
 */

import React from 'react';
import { useRouter } from 'expo-router';
import EventsListScreen from '../../../../src/components/EventsListScreen';

export default function EventsScreen() {
    const router = useRouter();
    return (
        <EventsListScreen
            showHeader
            headerBgColor="#374151"
            queryKey="school-events"
            onEventPress={(id) => router.push(`/(protected)/headmaster/events/${id}` as any)}
            onCreatePress={() => router.push('/(protected)/headmaster/events/create' as any)}
            onBackPress={() => router.back()}
        />
    );
}
