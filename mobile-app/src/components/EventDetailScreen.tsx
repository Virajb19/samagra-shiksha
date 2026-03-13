/**
 * Shared Event Detail Screen — used by all roles.
 * Square hero image (object-contain), event details, resolved creator name.
 * Uses Expo MaterialIcons for all detail rows.
 */

import React from 'react';
import { AppText } from '@/components/AppText';
import {
    View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getEventById } from '../services/firebase/content.firestore';
import { getDistricts } from '../services/firebase/master-data.firestore';
import { District } from '../types';

const BLUE = '#1565C0';
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

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function DetailRow({
    iconName,
    label,
    value,
    iconOverlayName,
    iconOverlayColor,
}: {
    iconName: MaterialIconName;
    label: string;
    value: string;
    iconOverlayName?: MaterialIconName;
    iconOverlayColor?: string;
}) {
    return (
        <View className="flex-row items-center mb-[18px] gap-3.5">
            <View className="w-[22px] h-[22px] justify-center items-center relative">
                <MaterialIcons name={iconName} size={22} color="#111" />
                {iconOverlayName ? (
                    <View
                        className="absolute rounded-full bg-white"
                        style={{ right: -5, bottom: -5 }}
                    >
                        <MaterialIcons name={iconOverlayName} size={12} color={iconOverlayColor || '#111'} />
                    </View>
                ) : null}
            </View>
            <View className="flex-1">
                <AppText className="text-[15px] text-[#4a4a4a] leading-5">
                    <AppText className="font-bold text-[#1a1a1a]">{label}:  </AppText>
                    {value}
                </AppText>
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
                {!isLoading && !event && <AppText className="mt-3 text-gray-500">Event not found</AppText>}
            </View>
        );
    }

    const districtName = event.district_id ? districts.find((d: District) => d.id === event.district_id)?.name : null;
    const locationStr = [event.location, districtName].filter(Boolean).join(', ');
    const startDateStr = formatDateNice(event.event_date);
    const endDateStr = event.event_end_date ? formatDateNice(event.event_end_date) : 'Not specified';
    const createdByName = event.creator_name || 'Unknown';
    const createdByDate = event.created_at ? formatDateNice(event.created_at) : '';
    const createdByStr = `${createdByName}${createdByDate ? `, on ${createdByDate}` : ''}`;

    const placeholderColors = ['#1565C0', '#1565C0', '#1565C0', '#1565C0', '#2E7D32'];
    const hash = (event.id || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    const bgColor = placeholderColors[hash % placeholderColors.length];

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" bounces={false}>
                {/* Square Hero Image with object-contain */}
                <View className="relative w-full bg-white mt-1" style={{ aspectRatio: 1 }}>
                    {event.flyer_url ? (
                        <Image source={{ uri: event.flyer_url }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                        <View className="w-full h-full justify-center items-center" style={{ backgroundColor: bgColor }}>
                            <MaterialIcons name="calendar-month" size={64} color="rgba(255,255,255,0.45)" />
                        </View>
                    )}
                    <TouchableOpacity
                        className="absolute top-4 left-4 w-10 h-10 rounded-full justify-center items-center"
                        style={{ backgroundColor: BLUE, elevation: 4 }}
                        onPress={() => router.back()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="absolute top-4 right-4 w-10 h-10 rounded-full justify-center items-center"
                        style={{ backgroundColor: BLUE, elevation: 4 }}
                        onPress={handleShare}
                    >
                        <MaterialIcons name="share" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View className="p-5 pb-10">
                    <AppText className="text-2xl font-extrabold text-[#1a1a1a] mb-3 leading-[30px]">{event.title}</AppText>
                    {event.description ? (
                        <AppText className="text-[15px] font-bold text-[#3f3f46] leading-[22px] mb-4">{event.description}</AppText>
                    ) : null}
                    <View className="h-px bg-gray-200 my-4" />
                    <AppText className="text-lg font-bold text-[#1a1a1a] mb-5">Event Details</AppText>
                    {event.activity_type && <DetailRow iconName="sports-volleyball" label="Activity" value={event.activity_type} />}
                    <DetailRow iconName="calendar-month" iconOverlayName="add" iconOverlayColor="#2E7D32" label="Starting date" value={startDateStr} />
                    <DetailRow iconName="calendar-month" iconOverlayName="remove" iconOverlayColor="#C62828" label="Ending date" value={endDateStr} />
                    {locationStr && <DetailRow iconName="location-on" label="Location" value={locationStr} />}
                    {event.male_participants != null && <DetailRow iconName="face" label="Male Participants" value={String(event.male_participants)} />}
                    {event.female_participants != null && <DetailRow iconName="face-3" label="Female Participants" value={String(event.female_participants)} />}
                    <DetailRow iconName="person-4" label="Created by" value={createdByStr} />
                </View>
            </ScrollView>
        </View>
    );
}
