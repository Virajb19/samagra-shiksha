import React, { useCallback, useMemo, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Linking,
    Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { User } from '../types';
import { useAuthStore } from '../lib/store';
import { getProfileStatus } from '../services/firebase/users.firestore';
import { getCircularsPaginated as defaultGetCircularsPaginated, type PaginatedCircularsResult } from '../services/firebase/content.firestore';

const BLUE = '#1565C0';
const CIRCULARS_PAGE_SIZE = 10;

function StatusBanner({ message }: { message: string }) {
    return (
        <View className="mx-4 mt-2">
            <View className="border-[1.5px] rounded-xl py-[18px] items-center bg-blue-50" style={{ borderColor: BLUE, borderStyle: 'dashed' }}>
                <AppText className="text-[15px] font-semibold text-center" style={{ color: BLUE }}>{message}</AppText>
            </View>
        </View>
    );
}

export interface CircularItem {
    id: string;
    title?: string;
    description?: string;
    content?: string;
    circular_no?: string;
    file_url?: string;
    issued_by?: string;
    issuer_name?: string;
    created_by_name?: string;
    creator_name?: string;
    issue_date?: string | Date | { toDate?: () => Date };
    issued_at?: string | Date | { toDate?: () => Date };
    created_at?: string | Date | { toDate?: () => Date };
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
    getCircularsPaginatedFn?: (userRole: string, userDistrictId: string | null, userSchoolId: string | null, pageSize?: number, cursor?: string | null) => Promise<PaginatedCircularsResult>;
    roleFilter?: (item: CircularItem, role: string) => boolean;
    canAccessOverride?: (args: AccessOverrideArgs) => boolean;
    onDownloadPress?: (url: string, item: CircularItem, role: string) => void | Promise<void>;
}

export default function CircularsScreen({
    role,
    queryKey,
    searchPlaceholder = 'Search circulars...',
    emptyText = 'No circulars found',
    getCircularsPaginatedFn = defaultGetCircularsPaginated,
    roleFilter,
    canAccessOverride,
    onDownloadPress,
}: CircularsScreenProps) {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');

    // Derive user location info for circular visibility filtering
    const userRole = user?.role || role.toUpperCase().replace(/-/g, '_');
    const userDistrictId = user?.district_id || null;
    const userSchoolId = user?.school_id || user?.faculty?.school_id || null;

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
        queryFn: ({ pageParam }) => getCircularsPaginatedFn(userRole, userDistrictId, userSchoolId, CIRCULARS_PAGE_SIZE, pageParam ?? null),
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

    // All hooks MUST be called before any early return to satisfy React's rules of hooks.
    // Moving useCallback / useMemo above the canAccess guard prevents the
    // "Rendered fewer hooks than expected" crash when is_active toggles.
    const filteredCirculars = useMemo(
        () =>
            allCirculars?.filter((c) => {
                const title = typeof c.title === 'string' ? c.title : '';
                const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesRole = roleFilter ? roleFilter(c, role) : true;
                return matchesSearch && matchesRole;
            }) ?? [],
        [allCirculars, searchQuery, roleFilter, role],
    );

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // ── Early return AFTER all hooks ──
    if (!canAccess) {
        return (
            <View className="flex-1 bg-[#f5f5f5]">
                <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                    <AppText className="text-[26px] font-bold text-[#1a1a1a]">Circulars</AppText>
                </View>
                <StatusBanner message={!hasCompletedProfile ? 'Kindly complete your profile' : 'Your account is under verification'} />
            </View>
        );
    }

    const formatIssuedDate = (value: CircularItem['issue_date']) => {
        if (!value) return 'N/A';
        const raw = value as any;
        const date = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : new Date(raw);
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const openFile = async (url: string, item: CircularItem) => {
        if (onDownloadPress) {
            await onDownloadPress(url, item, role);
            return;
        }
        await Linking.openURL(url);
    };

    const shareCircular = async (item: CircularItem) => {
        const title = typeof item.title === 'string' ? item.title : 'Circular';
        const body =
            typeof item.description === 'string' && item.description.trim()
                ? item.description
                : typeof item.content === 'string' && item.content.trim()
                    ? item.content
                    : '';
        const fileUrl = typeof item.file_url === 'string' ? item.file_url : '';

        const message = [title, body, fileUrl].filter(Boolean).join('\n\n');
        await Share.share({
            title,
            message,
            url: fileUrl || undefined,
        });
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
                <View>
                    <AppText weight='bold' className="text-2xl text-gray-900 mb-3">Circulars</AppText>
                    <View className="flex-row items-center bg-white rounded-xl px-3 mb-4 font-lato" style={{ elevation: 1 }}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            className="flex-1 py-3 px-2 text-[15px] text-gray-900 font-lato"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
            }
            renderItem={({ item: c }) => (
                <View className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
                    <View className="bg-blue-100 px-2 py-0.5 rounded self-start">
                        <AppText weight='bold' className="text-xs text-blue-700">{typeof c.circular_no === 'string' ? c.circular_no : ''}</AppText>
                    </View>
                    <AppText weight='bold' className="text-base text-gray-900 mt-1">{typeof c.title === 'string' ? c.title : ''}</AppText>
                    {!!(c.description || c.content) && (
                        <AppText className="text-sm text-gray-600 mt-1 leading-5">
                            {typeof c.description === 'string' && c.description.trim()
                                ? c.description
                                : typeof c.content === 'string'
                                    ? c.content
                                    : ''}
                        </AppText>
                    )}
                    <View className="mt-2">
                        <AppText className="text-xs text-gray-500">
                            Issued by:{' '}
                            <AppText weight="bold" className="text-xs text-gray-700">
                                {typeof c.issued_by === 'string' && c.issued_by.trim()
                                    ? c.issued_by
                                    : typeof c.issuer_name === 'string' && c.issuer_name.trim()
                                        ? c.issuer_name
                                        : typeof c.created_by_name === 'string' && c.created_by_name.trim()
                                            ? c.created_by_name
                                            : typeof c.creator_name === 'string' && c.creator_name.trim()
                                                ? c.creator_name
                                                : 'N/A'}
                            </AppText>
                        </AppText>
                        <AppText className="text-xs text-gray-500 mt-1">
                            Issued date:{' '}
                            <AppText weight="bold" className="text-xs text-gray-700">
                                {formatIssuedDate(c.issue_date ?? c.issued_at ?? c.created_at)}
                            </AppText>
                        </AppText>
                    </View>
                    <View className="flex-row items-center mt-2">
                        {typeof c.file_url === 'string' && c.file_url ? (
                            <TouchableOpacity className="flex-row items-center mr-4 border border-blue-500 rounded-full px-2 py-1" onPress={() => openFile(c.file_url!, c)}>
                                <Ionicons name="download-outline" size={16} color={BLUE} />
                                <AppText weight='bold' className="text-[13px] ml-1" style={{ color: BLUE }}>
                                    Download
                                </AppText>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity className="flex-row items-center border border-blue-500 rounded-full px-2 py-1" onPress={() => shareCircular(c)}>
                            <Ionicons name="share-social-outline" size={16} color={BLUE} />
                            <AppText weight='bold' className="text-[13px] ml-1" style={{ color: BLUE }}>
                                Share
                            </AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            ListEmptyComponent={
                isLoading ? (
                    <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
                ) : (
                    <View className="items-center mt-10">
                        <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                        <AppText weight='bold' className="text-gray-400 mt-3">{emptyText}</AppText>
                    </View>
                )
            }
            ListFooterComponent={
                isFetchingNextPage ? (
                    <View className="items-center py-4">
                        <ActivityIndicator size="small" color={BLUE} />
                        <AppText className="text-sm text-gray-500 mt-2 font-lato">Loading more circulars...</AppText>
                    </View>
                ) : null
            }
        />
    );
}
