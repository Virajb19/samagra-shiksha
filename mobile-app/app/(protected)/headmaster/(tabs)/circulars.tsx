/**
 * Headmaster Circulars Tab Screen
 *
 * 3-state access model:
 * 1. Profile NOT complete → "Kindly complete your profile" dashed banner
 * 2. Profile complete but NOT active → "Your account is under verification" dashed banner
 * 3. Active → full circulars list
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
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { getCirculars } from '../../../../src/services/firebase/content.firestore';

const BLUE = '#1565C0';

interface Circular {
    id: string;
    circular_no: string;
    title: string;
    description?: string;
    file_url?: string;
    issued_by: string;
    issued_date: string;
    effective_date?: string;
    is_active: boolean;
    district_id?: string;
    school_id?: string;
    created_at: string;
    district?: { name: string };
    school?: { name: string };
    creator?: { name: string };
}

function StatusBanner({ message }: { message: string }) {
    return (
        <View className="flex-1 p-4">
            <View className="border-[1.5px] border-dashed border-[#1565C0] rounded-xl bg-[#e8f4fd] py-[18px] items-center">
                <Text className="text-[#1565C0] text-[15px] font-semibold">{message}</Text>
            </View>
        </View>
    );
}

export default function HeadmasterCircularsTabScreen() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: profileStatus, isLoading: profileLoading } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: async () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;

    const {
        data: circulars,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Circular[]>({
        queryKey: ['circulars'],
        queryFn: async () => {
            try {
                return await getCirculars();
            } catch {
                return [];
            }
        },
        enabled: hasCompletedProfile && isActive,
    });

    // Refetch circulars when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const filteredCirculars = React.useMemo(() => {
        if (!circulars) return [];
        if (!searchQuery.trim()) return circulars;
        const query = searchQuery.toLowerCase();
        return circulars.filter(
            c =>
                c.title.toLowerCase().includes(query) ||
                c.description?.toLowerCase().includes(query) ||
                c.circular_no.toLowerCase().includes(query) ||
                c.issued_by.toLowerCase().includes(query)
        );
    }, [circulars, searchQuery]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (profileLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f4f8]">
                <ActivityIndicator size="large" color={BLUE} />
            </View>
        );
    }

    if (!hasCompletedProfile) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <Text className="text-2xl font-bold text-gray-800 pt-5 px-4 mb-1">Circulars</Text>
                <StatusBanner message="Kindly complete your profile" />
            </View>
        );
    }

    if (!isActive) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <Text className="text-2xl font-bold text-gray-800 pt-5 px-4 mb-1">Circulars</Text>
                <StatusBanner message="Your account is under verification" />
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f4f8]">
                <ActivityIndicator size="large" color={BLUE} />
                <Text className="mt-3 text-base text-gray-500">Loading circulars...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f4f8] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="mt-3 text-base text-red-500 text-center">Failed to load circulars</Text>
                <TouchableOpacity className="mt-4 px-6 py-3 rounded-lg bg-[#1565C0]" onPress={() => refetch()}>
                    <Text className="text-white text-sm font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            <View className="p-4 pb-2 bg-white border-b border-[#e8ecf4]">
                <View className="flex-row items-center bg-[#e8ecf4] rounded-xl px-3 py-[10px] gap-2">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 text-base text-gray-800"
                        placeholder="Search circulars..."
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

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {filteredCirculars && filteredCirculars.length > 0 ? (
                    filteredCirculars.map((circular) => (
                        <View
                            key={circular.id}
                            className="bg-white rounded-xl p-4 mb-3 border-l-4"
                            style={{ borderLeftColor: BLUE, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
                        >
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-row items-center px-2 py-1 rounded-[6px] border gap-1 bg-[#e8f4fd] border-[#bae6fd]">
                                    <Ionicons name="document-text" size={14} color={BLUE} />
                                    <Text className="text-[10px] font-semibold uppercase text-[#1565C0]">{circular.circular_no}</Text>
                                </View>
                                <Text className="text-xs text-gray-400">{formatDate(circular.issued_date)}</Text>
                            </View>
                            <Text className="text-base font-semibold text-gray-800 mb-2">{circular.title}</Text>
                            {circular.description && (
                                <Text className="text-sm text-gray-500 leading-5" numberOfLines={3}>{circular.description}</Text>
                            )}
                            <View className="flex-row justify-between items-center mt-2">
                                <Text className="text-xs text-gray-500">Issued by: {circular.issued_by}</Text>
                                {circular.school?.name && (
                                    <Text className="text-xs font-medium text-[#1565C0]">{circular.school.name}</Text>
                                )}
                            </View>
                            {circular.file_url && (
                                <TouchableOpacity
                                    className="flex-row items-center mt-3 pt-2 gap-2 px-3 py-2 rounded-lg self-start bg-[#e8f4fd]"
                                    onPress={() => Linking.openURL(circular.file_url!)}
                                >
                                    <Ionicons name="download-outline" size={16} color={BLUE} />
                                    <Text className="text-sm font-medium text-[#1565C0]">View Attachment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                ) : (
                    <View className="flex-1 justify-center items-center py-16">
                        <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                        <Text className="text-lg font-semibold text-gray-500 mt-4">No Circulars</Text>
                        <Text className="text-sm text-gray-400 text-center mt-2">
                            {searchQuery ? 'No circulars match your search.' : 'No circulars available at this time.'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
