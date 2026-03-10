/**
 * Teacher Events Screen (standalone)
 * Uses shared EventsListScreen with header and back button.
 */

import React from 'react';
import { useRouter } from 'expo-router';
import EventsListScreen from '../../../src/components/EventsListScreen';

export default function TeacherEventsScreen() {
    const router = useRouter();
    return (
        <EventsListScreen
            showHeader
            headerBgColor="#1e3a5f"
            queryKey="teacher-events"
            onEventPress={(id) => router.push({ pathname: '/(protected)/teacher/event-detail', params: { id } } as any)}
            onBackPress={() => router.back()}
        />
    );
}
