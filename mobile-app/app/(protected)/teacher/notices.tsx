import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Image,
    Linking,
    Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getNotices } from '../../../src/services/firebase/content.firestore';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'INFO' | 'WARNING' | 'URGENT' | 'ANNOUNCEMENT';
    created_at: string;
    author?: string;
    file_url?: string;
    file_name?: string;
}

// No notices image - using a URI since the GIF needs to be added to assets
// To use: Place the no-notices.gif file in mobile-app/assets/ folder
const NO_NOTICES_IMAGE_URI = 'https://raw.githubusercontent.com/AliARIOGLU/react-native-gif/main/assets/empty-box.gif';

export default function NoticesScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: notices,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Notice[]>({
        queryKey: ['notices'],
        queryFn: async () => {
            const data = await getNotices();
            return data;
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

    const getNoticeIcon = (type: Notice['type']) => {
        switch (type) {
            case 'URGENT':
                return { name: 'alert-circle', color: '#ef4444' };
            case 'WARNING':
                return { name: 'warning', color: '#f59e0b' };
            case 'ANNOUNCEMENT':
                return { name: 'megaphone', color: '#8b5cf6' };
            default:
                return { name: 'information-circle', color: '#3b82f6' };
        }
    };

    const getNoticeTypeStyle = (type: Notice['type']) => {
        switch (type) {
            case 'URGENT':
                return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
            case 'WARNING':
                return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
            case 'ANNOUNCEMENT':
                return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
            default:
                return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
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
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-[#e5e7eb]">
                <TouchableOpacity
                    className="p-2"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-[#1f2937]">Important Notices</Text>
                <View className="w-10" />
            </View>

            {/* Search Bar */}
            <View className="px-4 py-3 bg-white border-b border-[#e5e7eb]">
                <View className="flex-row items-center bg-[#f3f4f6] rounded-lg px-3 py-2.5 gap-2">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 text-base text-[#1f2937]"
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
                            const icon = getNoticeIcon(notice.type);
                            const typeStyle = getNoticeTypeStyle(notice.type);

                            return (
                                <View
                                    key={notice.id}
                                    className="bg-white rounded-xl p-4 mb-3 border-l-4"
                                    style={{ borderLeftColor: typeStyle.text, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                                >
                                    <View className="flex-row justify-between items-center mb-3">
                                        <View
                                            className="flex-row items-center px-2 py-1 rounded border gap-1"
                                            style={{
                                                backgroundColor: typeStyle.bg,
                                                borderColor: typeStyle.border,
                                            }}
                                        >
                                            <Ionicons
                                                name={icon.name as any}
                                                size={14}
                                                color={typeStyle.text}
                                            />
                                            <Text
                                                className="text-[11px] font-semibold uppercase"
                                                style={{ color: typeStyle.text }}
                                            >
                                                {notice.type}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-gray-400">
                                            {formatDate(notice.created_at)}
                                        </Text>
                                    </View>
                                    <Text className="text-base font-semibold text-[#1f2937] mb-2">{notice.title}</Text>
                                    <Text className="text-sm text-[#4b5563] leading-5">{notice.content}</Text>
                                    {notice.author && (
                                        <Text className="text-[13px] text-gray-500 italic mt-3">— {notice.author}</Text>
                                    )}
                                    {/* File attachment */}
                                    {notice.file_url && (
                                        <TouchableOpacity
                                            className="flex-row items-center mt-3 py-2 px-3 bg-[#eff6ff] rounded-lg gap-2"
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
                                        >
                                            <Ionicons name="document-attach" size={18} color="#3b82f6" />
                                            <Text className="flex-1 text-[13px] text-blue-500 font-medium">
                                                {notice.file_name || 'View Attachment'}
                                            </Text>
                                            <Ionicons name="open-outline" size={16} color="#3b82f6" />
                                        </TouchableOpacity>
                                    )}
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

