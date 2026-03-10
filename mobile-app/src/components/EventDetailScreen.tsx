/**
 * Shared Event Detail Screen — used by all roles.
 * Hero image, event details, resolved creator name.
 */

import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getEventById } from '../services/firebase/content.firestore';
import { getDistricts } from '../services/firebase/master-data.firestore';
import { District } from '../types';

const BLUE = '#1E88E5';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toJsDate(d: any): Date {
    if (!d) return new Date();
    if (d.toDate) return d.toDate();
    return new Date(d);
}

function formatDateNice(d: any): string {
    const date = toJsDate(d);
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${day}${suffix} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatDateRange(start: any, end: any): string {
    const startStr = formatDateNice(start);
    if (!end) return startStr;
    const e = toJsDate(end);
    const s = toJsDate(start);
    if (e.toDateString() === s.toDateString()) return startStr;
    return `${startStr} to ${formatDateNice(end)}`;
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View className="flex-row items-center mb-[18px] gap-3.5">
            <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: BLUE }}>
                <Ionicons name={icon as any} size={20} color="#fff" />
            </View>
            <View className="flex-1">
                <Text className="text-[15px] text-[#4a4a4a] leading-5">
                    <Text className="font-bold text-[#1a1a1a]">{label}:  </Text>
                    {value}
                </Text>
            </View>
        </View>
    );
}

export default function EventDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data: event, isLoading } = useQuery({
        queryKey: ['event-detail', id],
        queryFn: () => getEventById(id!),
        enabled: !!id,
    });

    const { data: districts = [] } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const handleShare = async () => {
        if (!event) return;
        try {
            await Share.share({
                title: event.title,
                message: `${event.title}\n${event.description || ''}\nDate: ${formatDateNice(event.event_date)}${event.location ? `\nVenue: ${event.location}` : ''}`,
            });
        } catch { }
    };

    if (isLoading || !event) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color={BLUE} />
                {!isLoading && !event && <Text className="mt-3 text-gray-500">Event not found</Text>}
            </View>
        );
    }

    const districtName = event.district_id ? districts.find((d: District) => d.id === event.district_id)?.name : null;
    const locationStr = [event.location, districtName].filter(Boolean).join(', ');
    const dateStr = formatDateRange(event.event_date, event.event_end_date);
    const createdByName = event.creator_name || 'Unknown';
    const createdByDate = event.created_at ? formatDateNice(event.created_at) : '';
    const createdByStr = `${createdByName}${createdByDate ? `, on ${createdByDate}` : ''}`;

    const placeholderColors = ['#1565C0', '#0277BD', '#00838F', '#00695C', '#2E7D32'];
    const hash = (event.id || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    const bgColor = placeholderColors[hash % placeholderColors.length];

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" bounces={false}>
                {/* Hero Image */}
                <View className="relative w-full h-[300px]">
                    {event.flyer_url ? (
                        <Image source={{ uri: event.flyer_url }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="w-full h-full justify-center items-center" style={{ backgroundColor: bgColor }}>
                            <Ionicons name="calendar" size={64} color="rgba(255,255,255,0.4)" />
                        </View>
                    )}
                    <TouchableOpacity
                        className="absolute top-4 left-4 w-10 h-10 rounded-full justify-center items-center"
                        style={{ backgroundColor: BLUE, elevation: 4 }}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="absolute top-4 right-4 w-10 h-10 rounded-full justify-center items-center"
                        style={{ backgroundColor: BLUE, elevation: 4 }}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-social" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View className="p-5 pb-10">
                    <Text className="text-2xl font-extrabold text-[#1a1a1a] mb-3 leading-[30px]">{event.title}</Text>
                    {event.description ? (
                        <Text className="text-[15px] text-[#4a4a4a] leading-[22px] mb-4">{event.description}</Text>
                    ) : null}
                    <View className="h-px bg-gray-200 my-4" />
                    <Text className="text-lg font-bold text-[#1a1a1a] mb-5">Event Details</Text>
                    {event.activity_type && <DetailRow icon="megaphone-outline" label="Activity" value={event.activity_type} />}
                    <DetailRow icon="calendar-outline" label="Date" value={dateStr} />
                    {locationStr && <DetailRow icon="location-outline" label="Location" value={locationStr} />}
                    {event.male_participants != null && <DetailRow icon="man-outline" label="Male Participants" value={String(event.male_participants)} />}
                    {event.female_participants != null && <DetailRow icon="woman-outline" label="Female Participants" value={String(event.female_participants)} />}
                    <DetailRow icon="person-add-outline" label="Created by" value={createdByStr} />
                </View>
            </ScrollView>
        </View>
    );
}
