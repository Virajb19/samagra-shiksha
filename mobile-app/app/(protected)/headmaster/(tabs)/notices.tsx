import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Linking,
    Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { styled } from 'nativewind';
import { getNotices } from '../../../../src/services/firebase/content.firestore';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchable = styled(TouchableOpacity);
const StyledInput = styled(TextInput);

interface Notice {
    id: string;
    title: string;
    content: string;
    type?: 'GENERAL' | 'INVITATION' | 'PUSH_NOTIFICATION';
    subject?: string;
    venue?: string;
    event_time?: string;
    event_date?: string;
    published_at: string;
    created_at: string;
    file_url?: string;
    file_name?: string;
    creator?: {
        id: string;
        name: string;
    };
}

type DateFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

// Type-based styling configuration
const getTypeStyle = (type?: Notice['type']) => {
    switch (type) {
        case 'INVITATION':
            return {
                bg: '#f3e8ff',
                text: '#7c3aed',
                border: '#7c3aed',
                icon: 'calendar-outline' as const,
                label: 'Invitation',
            };
        case 'PUSH_NOTIFICATION':
            return {
                bg: '#dbeafe',
                text: '#1d4ed8',
                border: '#1d4ed8',
                icon: 'notifications-outline' as const,
                label: 'Notification',
            };
        default: // GENERAL
            return {
                bg: '#f1f5f9',
                text: '#475569',
                border: '#475569',
                icon: 'document-text-outline' as const,
                label: 'General',
            };
    }
};

const DATE_OPTIONS: { value: DateFilter; label: string; icon: string; color: string }[] = [
    { value: 'ALL', label: 'All', icon: 'layers-outline', color: '#6366f1' },
    { value: 'TODAY', label: 'Today', icon: 'today-outline', color: '#10b981' },
    { value: 'THIS_WEEK', label: 'This Week', icon: 'calendar-outline', color: '#f59e0b' },
    { value: 'THIS_MONTH', label: 'This Month', icon: 'calendar-number-outline', color: '#3b82f6' },
];

export default function NoticesScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');

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
                return [];
            }
        },
    });

    // Refetch notices when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const filteredNotices = useMemo(() => {
        if (!notices) return [];

        let filtered = notices;

        // Date filter
        if (dateFilter !== 'ALL') {
            const now = new Date();
            let cutoff: Date;

            if (dateFilter === 'TODAY') {
                cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (dateFilter === 'THIS_WEEK') {
                const dayOfWeek = now.getDay();
                cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            } else {
                // THIS_MONTH
                cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            filtered = filtered.filter(notice => {
                const publishedDate = new Date(notice.published_at || notice.created_at);
                return publishedDate >= cutoff;
            });
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                notice =>
                    notice.title.toLowerCase().includes(query) ||
                    notice.content.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [notices, dateFilter, searchQuery]);

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
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
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
            <StyledView className="flex-1 justify-center items-center bg-gray-50">
                <StyledView className="bg-white p-8 rounded-3xl items-center"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <StyledText className="mt-4 text-base text-gray-600 font-medium">
                        Loading notices...
                    </StyledText>
                </StyledView>
            </StyledView>
        );
    }

    if (error) {
        return (
            <StyledView className="flex-1 justify-center items-center bg-gray-50 p-6">
                <StyledView className="bg-white p-8 rounded-3xl items-center"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, maxWidth: 320 }}>
                    <StyledView className="w-20 h-20 rounded-full bg-red-50 justify-center items-center mb-4">
                        <Ionicons name="cloud-offline-outline" size={40} color="#ef4444" />
                    </StyledView>
                    <StyledText className="text-lg font-bold text-gray-800 mb-2">
                        Connection Error
                    </StyledText>
                    <StyledText className="text-sm text-gray-500 text-center mb-6">
                        Unable to load notices. Please check your connection.
                    </StyledText>
                    <StyledTouchable
                        className="bg-indigo-500 px-8 py-3 rounded-xl"
                        onPress={() => refetch()}
                        activeOpacity={0.8}
                    >
                        <StyledText className="text-white font-semibold">Try Again</StyledText>
                    </StyledTouchable>
                </StyledView>
            </StyledView>
        );
    }

    return (
        <StyledView className="flex-1 bg-gray-100">
            {/* Header Section */}
            <StyledView className="bg-white px-4 pt-3 pb-4"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
                {/* Search Bar */}
                <StyledView className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3 mb-3">
                    <Ionicons name="search" size={20} color="#64748b" />
                    <StyledInput
                        className="flex-1 ml-3 text-base text-gray-800"
                        placeholder="Search notices..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <StyledTouchable onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </StyledTouchable>
                    )}
                </StyledView>

                {/* Date Filter Pills */}
                <StyledScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 2 }}
                >
                    {DATE_OPTIONS.map((option) => {
                        const isActive = dateFilter === option.value;
                        return (
                            <StyledTouchable
                                key={option.value}
                                onPress={() => setDateFilter(option.value)}
                                activeOpacity={0.8}
                                className={`flex-row items-center px-4 py-2.5 mr-2 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-gray-100'
                                    }`}
                            >
                                <Ionicons
                                    name={option.icon as any}
                                    size={16}
                                    color={isActive ? '#ffffff' : option.color}
                                />
                                <StyledText
                                    className={`ml-2 text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-600'
                                        }`}
                                >
                                    {option.label}
                                </StyledText>
                            </StyledTouchable>
                        );
                    })}
                </StyledScrollView>
            </StyledView>

            {/* Notices List */}
            <StyledScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        colors={['#6366f1']}
                        tintColor="#6366f1"
                    />
                }
            >
                {filteredNotices && filteredNotices.length > 0 ? (
                    filteredNotices.map((notice) => {
                        const typeStyle = getTypeStyle(notice.type);

                        return (
                            <StyledView
                                key={notice.id}
                                className="bg-white rounded-2xl mb-4 overflow-hidden"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.06,
                                    shadowRadius: 8,
                                    elevation: 3,
                                    borderLeftWidth: 4,
                                    borderLeftColor: typeStyle.border,
                                }}
                            >
                                {/* Card Header */}
                                <StyledView className="flex-row justify-between items-center px-4 pt-4 pb-2">
                                    <StyledView className="flex-row items-center gap-2">
                                        {/* Type Badge */}
                                        <StyledView
                                            className="flex-row items-center px-3 py-1.5 rounded-full"
                                            style={{ backgroundColor: typeStyle.bg }}
                                        >
                                            <Ionicons
                                                name={typeStyle.icon}
                                                size={14}
                                                color={typeStyle.text}
                                            />
                                            <StyledText
                                                className="ml-1.5 text-xs font-bold"
                                                style={{ color: typeStyle.text, textTransform: 'uppercase' }}
                                            >
                                                {typeStyle.label}
                                            </StyledText>
                                        </StyledView>
                                    </StyledView>
                                    <StyledView className="flex-row items-center">
                                        <Ionicons name="time-outline" size={14} color="#94a3b8" />
                                        <StyledText className="ml-1 text-xs text-gray-400">
                                            {formatDate(notice.published_at || notice.created_at)}
                                        </StyledText>
                                    </StyledView>
                                </StyledView>

                                {/* Card Content */}
                                <StyledView className="px-4 pb-4">
                                    <StyledText className="text-lg font-bold text-gray-800 mb-2">
                                        {notice.title}
                                    </StyledText>

                                    {/* Invitation Details */}
                                    {notice.type === 'INVITATION' && (
                                        <StyledView className="bg-purple-50 rounded-lg p-3 mb-3">
                                            {notice.venue && (
                                                <StyledView className="flex-row items-center mb-2">
                                                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                                                    <StyledText className="ml-2 text-sm text-gray-700">{notice.venue}</StyledText>
                                                </StyledView>
                                            )}
                                            {notice.event_date && (
                                                <StyledView className="flex-row items-center mb-2">
                                                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                                    <StyledText className="ml-2 text-sm text-gray-700">{formatEventDate(notice.event_date)}</StyledText>
                                                </StyledView>
                                            )}
                                            {notice.event_time && (
                                                <StyledView className="flex-row items-center">
                                                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                                                    <StyledText className="ml-2 text-sm text-gray-700">{formatEventTime(notice.event_time)}</StyledText>
                                                </StyledView>
                                            )}
                                        </StyledView>
                                    )}

                                    <StyledText className="text-sm text-gray-600 leading-5" numberOfLines={3}>
                                        {notice.content}
                                    </StyledText>

                                    {/* File Attachment */}
                                    {notice.file_url && (
                                        <StyledTouchable
                                            className="flex-row items-center bg-indigo-50 mt-4 px-4 py-3 rounded-xl"
                                            onPress={async () => {
                                                if (notice.file_url) {
                                                    try {
                                                        const canOpen = await Linking.canOpenURL(notice.file_url);
                                                        if (canOpen) {
                                                            await Linking.openURL(notice.file_url);
                                                        } else {
                                                            Alert.alert('Error', 'Unable to open this file.');
                                                        }
                                                    } catch (err) {
                                                        Alert.alert('Error', 'Failed to open attachment.');
                                                    }
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <StyledView className="w-10 h-10 bg-indigo-100 rounded-xl justify-center items-center mr-3">
                                                <MaterialCommunityIcons
                                                    name="file-document-outline"
                                                    size={22}
                                                    color="#6366f1"
                                                />
                                            </StyledView>
                                            <StyledView className="flex-1">
                                                <StyledText className="text-sm font-semibold text-indigo-700" numberOfLines={1}>
                                                    {notice.file_name || 'View Attachment'}
                                                </StyledText>
                                                <StyledText className="text-xs text-indigo-400">
                                                    Tap to open file
                                                </StyledText>
                                            </StyledView>
                                            <Ionicons name="open-outline" size={18} color="#6366f1" />
                                        </StyledTouchable>
                                    )}

                                    {/* Author Info */}
                                    {/* {notice.creator?.name && (
                                        <StyledView className="flex-row items-center mt-4 pt-3 border-t border-gray-100">
                                            <StyledView className="w-8 h-8 bg-gray-100 rounded-full justify-center items-center mr-2">
                                                <Ionicons name="person" size={16} color="#64748b" />
                                            </StyledView>
                                            <StyledView>
                                                <StyledText className="text-xs text-gray-400">Posted by</StyledText>
                                                <StyledText className="text-sm font-medium text-gray-700">
                                                    {notice.creator.name}
                                                </StyledText>
                                            </StyledView>
                                        </StyledView>
                                    )} */}
                                </StyledView>
                            </StyledView>
                        );
                    })
                ) : (
                    <StyledView className="flex-1 justify-center items-center pt-20">
                        <StyledView className="w-24 h-24 bg-gray-200 rounded-full justify-center items-center mb-6">
                            <Ionicons name="notifications-off-outline" size={48} color="#94a3b8" />
                        </StyledView>
                        <StyledText className="text-xl font-bold text-gray-700 mb-2">
                            No Notices
                        </StyledText>
                        <StyledText className="text-sm text-gray-500 text-center px-8 mb-6">
                            {searchQuery || dateFilter !== 'ALL'
                                ? 'No notices match your filter criteria.'
                                : 'There are no notices at this time. Check back later for updates.'}
                        </StyledText>
                        {(searchQuery || dateFilter !== 'ALL') && (
                            <StyledTouchable
                                className="bg-gray-200 px-6 py-3 rounded-xl"
                                onPress={() => {
                                    setSearchQuery('');
                                    setDateFilter('ALL');
                                }}
                                activeOpacity={0.8}
                            >
                                <StyledText className="text-gray-700 font-semibold">Clear Filters</StyledText>
                            </StyledTouchable>
                        )}
                    </StyledView>
                )}
            </StyledScrollView>
        </StyledView>
    );
}
