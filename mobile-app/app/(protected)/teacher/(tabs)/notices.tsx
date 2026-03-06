import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Linking,
    TextInput,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { getNotices } from '../../../../src/services/firebase/content.firestore';

// No notices image URI
const NO_NOTICES_IMAGE_URI = 'https://raw.githubusercontent.com/AliARIOGLU/react-native-gif/main/assets/empty-box.gif';

interface Notice {
    id: string;
    title: string;
    content: string;
    type?: 'GENERAL' | 'INVITATION' | 'PUSH_NOTIFICATION';
    subject?: string;
    venue?: string;
    event_time?: string;
    event_date?: string;
    file_url?: string;
    file_name?: string;
    published_at: string;
    created_at: string;
    creator?: {
        id: string;
        name: string;
    };
}

// Type-based styling configuration
const getTypeStyle = (type?: Notice['type']) => {
    switch (type) {
        case 'INVITATION':
            return {
                bg: '#f3e8ff',
                text: '#7c3aed',
                border: '#d8b4fe',
                icon: 'calendar-outline' as const,
                label: 'Invitation',
            };
        case 'PUSH_NOTIFICATION':
            return {
                bg: '#dbeafe',
                text: '#1d4ed8',
                border: '#93c5fd',
                icon: 'notifications-outline' as const,
                label: 'Notification',
            };
        default: // GENERAL
            return {
                bg: '#f1f5f9',
                text: '#475569',
                border: '#cbd5e1',
                icon: 'document-text-outline' as const,
                label: 'General',
            };
    }
};

export default function NoticesScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    const {
        data: notices,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Notice[]>({
        queryKey: ['notices'],
        queryFn: async () => {
            try {
                const data = await getNotices();
                return data;
            } catch (err: any) {
                console.error('Failed to fetch notices:', err);
                return [];
            }
        },
    });

    // Refetch notices when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    // Filter notices based on search query
    const filteredNotices = useMemo(() => {
        if (!notices) return [];
        if (!searchQuery.trim()) return notices;

        const query = searchQuery.toLowerCase();
        return notices.filter(
            notice =>
                notice.title.toLowerCase().includes(query) ||
                notice.content.toLowerCase().includes(query)
        );
    }, [notices, searchQuery]);

    const formatEventDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatEventTime = (timeString?: string) => {
        if (!timeString) return '';
        // Time is in HH:MM format
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const openFile = async (fileUrl?: string) => {
        if (fileUrl) {
            try {
                const canOpen = await Linking.canOpenURL(fileUrl);
                if (canOpen) {
                    await Linking.openURL(fileUrl);
                } else {
                    Alert.alert('Error', 'Unable to open this file. Please try again later.');
                }
            } catch (err) {
                console.log('Failed to open file:', err);
                Alert.alert('Error', 'Failed to open attachment.');
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb]">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="mt-3 text-base text-gray-500">Loading notices...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-base text-gray-500 mt-3 mb-4">Failed to load notices</Text>
                <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg" onPress={() => refetch()}>
                    <Text className="text-white text-sm font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f9fafb]">
            {/* Search Bar */}
            <View className="px-4 py-3 bg-white border-b border-b-gray-200">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-[10px] gap-2">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 text-base text-gray-800"
                        placeholder="Search notices..."
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
            </View>

            {/* Notices List */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {filteredNotices && filteredNotices.length > 0 ? (
                    <>
                        {filteredNotices.map((notice) => {
                            const typeStyle = getTypeStyle(notice.type);

                            return (
                                <View
                                    key={notice.id}
                                    className="bg-white rounded-xl p-4 mb-3 border-l-4"
                                    style={{ borderLeftColor: typeStyle.text, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                                >
                                    {/* Header with Type Badge and Date */}
                                    <View className="flex-row justify-between items-center mb-3">
                                        <View
                                            className="flex-row items-center px-2 py-1 rounded border gap-1"
                                            style={{ backgroundColor: typeStyle.bg, borderColor: typeStyle.border }}
                                        >
                                            <Ionicons
                                                name={typeStyle.icon}
                                                size={14}
                                                color={typeStyle.text}
                                            />
                                            <Text
                                                className="text-[11px] font-semibold uppercase"
                                                style={{ color: typeStyle.text }}
                                            >
                                                {typeStyle.label}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-gray-400">
                                            {formatDate(notice.published_at || notice.created_at)}
                                        </Text>
                                    </View>

                                    {/* Title */}
                                    <Text className="text-base font-semibold text-gray-800 mb-2">{notice.title}</Text>

                                    {/* Invitation Details */}
                                    {notice.type === 'INVITATION' && (
                                        <View className="bg-[#faf5ff] rounded-lg p-3 mb-3 gap-2">
                                            {notice.venue && (
                                                <View className="flex-row items-center gap-2">
                                                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                                                    <Text className="text-sm text-gray-700">{notice.venue}</Text>
                                                </View>
                                            )}
                                            {notice.event_date && (
                                                <View className="flex-row items-center gap-2">
                                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                                    <Text className="text-sm text-gray-700">{formatEventDate(notice.event_date)}</Text>
                                                </View>
                                            )}
                                            {notice.event_time && (
                                                <View className="flex-row items-center gap-2">
                                                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                                                    <Text className="text-sm text-gray-700">{formatEventTime(notice.event_time)}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* Content/Message */}
                                    <Text className="text-sm text-gray-600 leading-5">{notice.content}</Text>

                                    {/* File Attachment */}
                                    {notice.file_url && (
                                        <TouchableOpacity
                                            className="flex-row items-center bg-[#eff6ff] px-3 py-2 rounded-lg mt-3 gap-[6px] self-start"
                                            onPress={() => openFile(notice.file_url)}
                                        >
                                            <Ionicons name="attach" size={16} color="#3b82f6" />
                                            <Text className="text-[13px] text-blue-500 font-medium">
                                                {notice.file_name || 'View Attachment'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Author */}
                                    {/* {notice.creator?.name && (
                                        <Text style={styles.authorText}>— {notice.creator.name}</Text>
                                    )} */}
                                </View>
                            );
                        })}
                    </>
                ) : (
                    <View className="flex-1 justify-center items-center pt-10">
                        <Image
                            source={{ uri: NO_NOTICES_IMAGE_URI }}
                            className="w-[200px] h-[200px]"
                            resizeMode="contain"
                        />
                        <Text className="text-lg font-semibold text-gray-700 mt-4">No Notices</Text>
                        <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                            {searchQuery
                                ? 'No notices match your search.'
                                : 'There are no important notices at this time. Check back later for updates.'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
