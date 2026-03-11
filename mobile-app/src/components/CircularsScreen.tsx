import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { User } from '../types';
import { useAuthStore } from '../lib/store';
import { getProfileStatus } from '../services/firebase/users.firestore';
import { getCircularsPaginated, type PaginatedCircularsResult } from '../services/firebase/content.firestore';

const BLUE = '#1565C0';
const CIRCULARS_PAGE_SIZE = 10;

export interface CircularItem {
    id: string;
    title?: string;
    circular_no?: string;
    file_url?: string;
    target_roles?: string[];
    roles?: string[];
    [key: string]: unknown;
}

interface AccessOverrideArgs {
    hasCompletedProfile: boolean;
    isActive: boolean;
    user: User | null;
    role: string;
}

export interface CircularsScreenProps {
    role: string;
    queryKey?: readonly unknown[];
    searchPlaceholder?: string;
    emptyText?: string;
    getCircularsPaginatedFn?: (pageSize?: number, cursor?: string | null) => Promise<PaginatedCircularsResult>;
    roleFilter?: (item: CircularItem, role: string) => boolean;
    canAccessOverride?: (args: AccessOverrideArgs) => boolean;
    onDownloadPress?: (url: string, item: CircularItem, role: string) => void | Promise<void>;
}

export default function CircularsScreen({
    role,
    queryKey,
    searchPlaceholder = 'Search circulars...',
    emptyText = 'No circulars found',
    getCircularsPaginatedFn = getCircularsPaginated,
    roleFilter,
    canAccessOverride,
    onDownloadPress,
}: CircularsScreenProps) {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: profileStatus } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: async () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;
    const canAccess = canAccessOverride
        ? canAccessOverride({ hasCompletedProfile, isActive, user, role })
        : hasCompletedProfile && isActive;

    const circularsQueryKey = useMemo<readonly unknown[]>(
        () => [...(queryKey ?? ['circulars', role]), 'paginated'],
        [queryKey, role],
    );

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isRefetching,
    } = useInfiniteQuery({
        queryKey: circularsQueryKey,
        queryFn: ({ pageParam }) => getCircularsPaginatedFn(CIRCULARS_PAGE_SIZE, pageParam ?? null),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
        enabled: canAccess,
    });

    useFocusEffect(
        useCallback(() => {
            if (canAccess) refetch();
        }, [canAccess, refetch]),
    );

    const allCirculars = useMemo<CircularItem[]>(
        () => data?.pages?.flatMap((page) => page.circulars as CircularItem[]) ?? [],
        [data],
    );

    if (!canAccess) {
        return (
            <View className="flex-1 bg-[#f0f4f8] justify-center items-center px-6">
                <View
                    className="rounded-2xl py-6 px-4 items-center w-full"
                    style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}
                >
                    <Ionicons name={!hasCompletedProfile ? 'person-circle-outline' : 'time-outline'} size={48} color={BLUE} />
                    <Text style={{ color: BLUE, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                        {!hasCompletedProfile ? 'Kindly complete your profile' : 'Your account is under verification'}
                    </Text>
                </View>
            </View>
        );
    }

    const filteredCirculars =
        allCirculars?.filter((c) => {
            const title = typeof c.title === 'string' ? c.title : '';
            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter ? roleFilter(c, role) : true;
            return matchesSearch && matchesRole;
        }) ?? [];

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const openFile = async (url: string, item: CircularItem) => {
        if (onDownloadPress) {
            await onDownloadPress(url, item, role);
            return;
        }
        await Linking.openURL(url);
    };

    return (
        <FlatList
            className="flex-1 bg-[#f0f4f8]"
            data={filteredCirculars}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} />}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.35}
            ListHeaderComponent={
                <View className="flex-row items-center bg-white rounded-xl px-3 mb-4" style={{ elevation: 1 }}>
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-3 px-2 text-[15px] text-gray-900"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            }
            renderItem={({ item: c }) => (
                <View className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
                    <View className="bg-blue-100 px-2 py-0.5 rounded self-start">
                        <Text className="text-xs font-semibold text-blue-700">{typeof c.circular_no === 'string' ? c.circular_no : ''}</Text>
                    </View>
                    <Text className="text-base font-semibold text-gray-900 mt-1">{typeof c.title === 'string' ? c.title : ''}</Text>
                    {typeof c.file_url === 'string' && c.file_url ? (
                        <TouchableOpacity className="flex-row items-center mt-2" onPress={() => openFile(c.file_url!, c)}>
                            <Ionicons name="download-outline" size={16} color={BLUE} />
                            <Text style={{ color: BLUE, fontSize: 13, marginLeft: 4, fontWeight: '500' }}>Download</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            )}
            ListEmptyComponent={
                isLoading ? (
                    <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
                ) : (
                    <View className="items-center mt-10">
                        <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                        <Text className="text-gray-400 mt-3">{emptyText}</Text>
                    </View>
                )
            }
            ListFooterComponent={
                isFetchingNextPage ? (
                    <View className="items-center py-4">
                        <ActivityIndicator size="small" color={BLUE} />
                        <Text className="text-sm text-gray-500 mt-2">Loading more circulars...</Text>
                    </View>
                ) : null
            }
        />
    );
}
