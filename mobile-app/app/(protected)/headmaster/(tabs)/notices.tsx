import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Linking,
    Alert,
    ScrollView,
    Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { styled } from 'nativewind';
import {
    getUserNoticesPaginated,
    getUserRecipientMap,
    acceptInvitation,
    rejectInvitation,
    type PaginatedNoticesResult,
} from '../../../../src/services/firebase/content.firestore';
import { useAuthStore } from '../../../../src/lib/store';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const StyledView = styled(View);
const StyledText = styled(Text);
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
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');
    const user = useAuthStore((s) => s.user);

    // Fetch recipient map for the user (cached)
    const {
        data: recipientMap,
        isLoading: recipientMapLoading,
    } = useQuery({
        queryKey: ['recipient-map', user?.id],
        queryFn: () => getUserRecipientMap(user!.id),
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Paginated notices
    const {
        data: noticesData,
        isLoading: noticesLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isRefetching,
    } = useInfiniteQuery<PaginatedNoticesResult>({
        queryKey: ['user-notices', user?.id, recipientMap?.size ?? 0],
        queryFn: ({ pageParam }) => {
            return getUserNoticesPaginated(
                user!.id,
                recipientMap ?? new Map(),
                10,
                (pageParam as QueryDocumentSnapshot<DocumentData> | null) ?? null,
            );
        },
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
        enabled: !!user?.id && !!recipientMap,
    });

    // Refetch notices when screen gains focus
    const queryClient = useQueryClient();
    useFocusEffect(useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['recipient-map', user?.id] });
        refetch();
    }, [refetch, queryClient, user?.id]));

    const acceptMutation = useMutation({
        mutationFn: (recipientId: string) => acceptInvitation(recipientId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipient-map'] });
            queryClient.invalidateQueries({ queryKey: ['user-notices'] });
            Alert.alert('Success', 'Invitation accepted!');
        },
        onError: () => Alert.alert('Error', 'Failed to accept invitation.'),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ recipientId, reason }: { recipientId: string; reason: string }) =>
            rejectInvitation(recipientId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipient-map'] });
            queryClient.invalidateQueries({ queryKey: ['user-notices'] });
            setRejectModalVisible(false);
            setRejectTarget(null);
            setRejectReason('');
            Alert.alert('Done', 'Invitation rejected.');
        },
        onError: (err: any) => {
            console.log(err);
            Alert.alert('Error', 'Failed to reject invitation.')
        },
    });

    // Flatten paginated notices
    const allNotices = useMemo(() => {
        if (!noticesData?.pages) return [];
        return noticesData.pages.flatMap((page) => page.notices);
    }, [noticesData]);

    const filteredNotices = useMemo(() => {
        let filtered = allNotices;

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

            filtered = filtered.filter((notice: any) => {
                const publishedDate = new Date(notice.published_at || notice.created_at);
                return publishedDate >= cutoff;
            });
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (notice: any) =>
                    notice.title?.toLowerCase().includes(query) ||
                    notice.content?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [allNotices, dateFilter, searchQuery]);

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

    const isLoading = recipientMapLoading || noticesLoading;

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

    const renderNoticeItem = ({ item: notice }: { item: any }) => {
        const typeStyle = getTypeStyle(notice.type);

        return (
            <StyledView
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
                                        if (canOpen) await Linking.openURL(notice.file_url);
                                        else Alert.alert('Error', 'Unable to open this file.');
                                    } catch { Alert.alert('Error', 'Failed to open attachment.'); }
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <StyledView className="w-10 h-10 bg-indigo-100 rounded-xl justify-center items-center mr-3">
                                <MaterialCommunityIcons name="file-document-outline" size={22} color="#6366f1" />
                            </StyledView>
                            <StyledView className="flex-1">
                                <StyledText className="text-sm font-semibold text-indigo-700" numberOfLines={1}>
                                    {notice.file_name || 'View Attachment'}
                                </StyledText>
                                <StyledText className="text-xs text-indigo-400">Tap to open file</StyledText>
                            </StyledView>
                            <Ionicons name="open-outline" size={18} color="#6366f1" />
                        </StyledTouchable>
                    )}

                    {/* Invitation Accept/Reject */}
                    {notice.type === 'INVITATION' && notice.recipient_status && (
                        <StyledView className="mt-3">
                            {notice.recipient_status === 'PENDING' && (
                                <StyledView className="flex-row gap-3">
                                    <StyledTouchable
                                        className="flex-1 bg-emerald-500 py-2.5 rounded-lg items-center"
                                        disabled={acceptMutation.isPending}
                                        onPress={() => acceptMutation.mutate(notice.recipient_id)}
                                    >
                                        <StyledText className="text-white font-semibold text-sm">
                                            {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                                        </StyledText>
                                    </StyledTouchable>
                                    <StyledTouchable
                                        className="flex-1 bg-red-500 py-2.5 rounded-lg items-center"
                                        onPress={() => {
                                            setRejectTarget(notice);
                                            setRejectReason('');
                                            setRejectModalVisible(true);
                                        }}
                                    >
                                        <StyledText className="text-white font-semibold text-sm">Reject</StyledText>
                                    </StyledTouchable>
                                </StyledView>
                            )}
                            {notice.recipient_status === 'ACCEPTED' && (
                                <StyledView className="flex-row items-center gap-1">
                                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                                    <StyledText className="text-sm font-medium" style={{ color: '#16a34a' }}>Accepted</StyledText>
                                </StyledView>
                            )}
                            {notice.recipient_status === 'REJECTED' && (
                                <StyledView>
                                    <StyledView className="flex-row items-center gap-1">
                                        <Ionicons name="close-circle" size={16} color="#dc2626" />
                                        <StyledText className="text-sm font-medium" style={{ color: '#dc2626' }}>Rejected</StyledText>
                                    </StyledView>
                                    {notice.reject_reason && (
                                        <StyledText className="text-xs text-red-500 italic mt-1">Reason: {notice.reject_reason}</StyledText>
                                    )}
                                </StyledView>
                            )}
                        </StyledView>
                    )}
                </StyledView>
            </StyledView>
        );
    };

    const renderEmpty = () => (
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
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <StyledView className="py-4 items-center">
                <ActivityIndicator size="small" color="#6366f1" />
                <StyledText className="text-xs text-gray-400 mt-1">Loading more...</StyledText>
            </StyledView>
        );
    };

    const renderHeader = () => (
        <StyledView className="bg-white px-4 pt-3 pb-4 mb-4"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginHorizontal: -16, marginTop: -16 }}>
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
            <ScrollView
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
            </ScrollView>
        </StyledView>
    );

    return (
        <StyledView className="flex-1 bg-gray-100">
            <FlatList
                data={filteredNotices}
                renderItem={renderNoticeItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={refetch}
                        colors={['#6366f1']}
                        tintColor="#6366f1"
                    />
                }
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage && !searchQuery.trim()) {
                        fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.3}
            />

            {/* Reject Reason Modal */}
            <Modal visible={rejectModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 }}>Reject Invitation</Text>
                        <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                            Please provide a reason for rejecting this invitation.
                        </Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, color: '#1f2937', minHeight: 100, textAlignVertical: 'top' }}
                            placeholder="Enter reason..."
                            placeholderTextColor="#9ca3af"
                            value={rejectReason}
                            onChangeText={(t) => setRejectReason(t.slice(0, 500))}
                            multiline
                            maxLength={500}
                        />
                        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
                            {rejectReason.length}/500
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#e5e7eb', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}
                                onPress={() => { setRejectModalVisible(false); setRejectTarget(null); setRejectReason(''); }}
                            >
                                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 10, alignItems: 'center', opacity: !rejectReason.trim() || rejectMutation.isPending ? 0.5 : 1 }}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                onPress={() => {
                                    if (rejectTarget) {
                                        rejectMutation.mutate({ recipientId: rejectTarget.recipient_id, reason: rejectReason.trim() });
                                    }
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>
                                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </StyledView>
    );
}
