import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Image,
    Linking,
    Alert,
    Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getUserNoticesPaginated,
    getUserRecipientMap,
    acceptInvitation,
    rejectInvitation,
    getNoticeFileURL,
    type PaginatedNoticesResult,
} from '../../../src/services/firebase/content.firestore';
import { useAuthStore } from '../../../src/lib/store';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const NO_NOTICES_IMAGE_URI = 'https://raw.githubusercontent.com/AliARIOGLU/react-native-gif/main/assets/empty-box.gif';
const REJECT_REASON_MAX = 500;

export default function NoticesScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const [searchQuery, setSearchQuery] = useState('');
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [acceptTarget, setAcceptTarget] = useState<any>(null);

    // Fetch recipient map (noticeId → RecipientInfo) for the user
    const {
        data: recipientMap,
        isLoading: recipientMapLoading,
    } = useQuery({
        queryKey: ['recipient-map', user?.id],
        queryFn: () => getUserRecipientMap(user!.id),
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Paginated notices (all types including invitations)
    const {
        data: noticesData,
        isLoading: noticesLoading,
        error: noticesError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch: refetchNotices,
        isRefetching: noticesRefetching,
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

    const refetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['recipient-map', user?.id] });
        refetchNotices();
    }, [refetchNotices, queryClient, user?.id]);

    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

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
        onError: () => Alert.alert('Error', 'Failed to reject invitation.'),
    });

    // Flatten paginated notices
    const allNotices = useMemo(() => {
        if (!noticesData?.pages) return [];
        return noticesData.pages.flatMap((page) => page.notices);
    }, [noticesData]);

    // Filter notices based on search query
    const filteredNotices = useMemo(() => {
        if (!searchQuery.trim()) return allNotices;
        const q = searchQuery.toLowerCase();
        return allNotices.filter(
            (notice: any) =>
                notice.title?.toLowerCase().includes(q) ||
                notice.content?.toLowerCase().includes(q)
        );
    }, [allNotices, searchQuery]);

    const isLoading = recipientMapLoading || noticesLoading;
    const isRefetching = noticesRefetching;
    const error = noticesError;

    const getNoticeTypeStyle = (type: string) => {
        switch (type) {
            case 'INVITATION':
                return { bg: '#eef2ff', text: '#6366f1', border: '#c7d2fe', icon: 'mail-open' as const };
            case 'PUSH_NOTIFICATION':
                return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: 'notifications' as const };
            default: // GENERAL
                return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: 'information-circle' as const };
        }
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return '';
        let date: Date;
        if (dateVal?.seconds) date = new Date(dateVal.seconds * 1000);
        else if (dateVal?.toDate) date = dateVal.toDate();
        else date = new Date(dateVal);
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

    const renderNoticeItem = ({ item: notice }: { item: any }) => {
        const typeStyle = getNoticeTypeStyle(notice.type);
        const isInvitation = notice.type === 'INVITATION';
        const status = notice.recipient_status;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                    router.push({
                        pathname: '/(protected)/notice-detail' as any,
                        params: { noticeId: notice.id, recipientId: notice.recipient_id, initialStatus: status },
                    })
                }
                className="bg-white rounded-xl p-4 mb-3 border-l-4"
                style={{ borderLeftColor: typeStyle.text, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
            >
                <View className="flex-row justify-between items-center mb-2">
                    <View
                        className="flex-row items-center px-2 py-1 rounded border gap-1"
                        style={{ backgroundColor: typeStyle.bg, borderColor: typeStyle.border }}
                    >
                        <Ionicons name={typeStyle.icon} size={14} color={typeStyle.text} />
                        <Text className="text-[11px] font-semibold uppercase" style={{ color: typeStyle.text }}>
                            {notice.type?.replace('_', ' ')}
                        </Text>
                    </View>
                    <Text className="text-xs text-gray-400">{formatDate(notice.created_at)}</Text>
                </View>

                <Text className="text-base font-semibold text-[#1f2937] mb-1">{notice.title}</Text>
                <Text className="text-sm text-[#4b5563] leading-5 mb-1" numberOfLines={3}>{notice.content}</Text>

                {/* Invitation-specific info */}
                {isInvitation && notice.venue && (
                    <View className="flex-row items-center gap-1 mb-1">
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text className="text-sm text-[#6b7280]">{notice.venue}</Text>
                    </View>
                )}
                {isInvitation && notice.event_date && (
                    <View className="flex-row items-center gap-1 mb-1">
                        <Ionicons name="calendar" size={14} color="#6b7280" />
                        <Text className="text-sm text-[#6b7280]">
                            {formatDate(notice.event_date)}
                            {notice.event_time ? ` at ${notice.event_time}` : ''}
                        </Text>
                    </View>
                )}

                {/* Invitation status badge + accept/reject */}
                {isInvitation && status && (
                    <View className="mt-2">
                        {status === 'PENDING' && (
                            <View className="flex-row gap-3 mt-1">
                                <TouchableOpacity
                                    className="flex-1 bg-emerald-500 py-2.5 rounded-lg items-center"
                                    disabled={acceptMutation.isPending}
                                    onPress={() => {
                                        setAcceptTarget(notice);
                                        setAcceptModalVisible(true);
                                    }}
                                >
                                    <Text className="text-white font-semibold text-sm">
                                        {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 bg-red-500 py-2.5 rounded-lg items-center"
                                    onPress={() => {
                                        setRejectTarget(notice);
                                        setRejectReason('');
                                        setRejectModalVisible(true);
                                    }}
                                >
                                    <Text className="text-white font-semibold text-sm">Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {status === 'ACCEPTED' && (
                            <View className="flex-row items-center gap-1 mt-1">
                                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                                <Text className="text-sm font-medium" style={{ color: '#16a34a' }}>Accepted</Text>
                            </View>
                        )}
                        {status === 'REJECTED' && (
                            <View className="mt-1">
                                <View className="flex-row items-center gap-1">
                                    <Ionicons name="close-circle" size={16} color="#dc2626" />
                                    <Text className="text-sm font-medium" style={{ color: '#dc2626' }}>Rejected</Text>
                                </View>
                                {notice.reject_reason && (
                                    <Text className="text-xs text-red-500 italic mt-1">Reason: {notice.reject_reason}</Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Attachment */}
                {notice.file_url && (
                    <TouchableOpacity
                        className="flex-row items-center mt-3 py-2 px-3 bg-[#eff6ff] rounded-lg gap-2"
                        onPress={async () => {
                            try {
                                const downloadUrl = await getNoticeFileURL(notice.file_url);
                                const canOpen = await Linking.canOpenURL(downloadUrl);
                                if (canOpen) await Linking.openURL(downloadUrl);
                                else Alert.alert('Error', 'Unable to open this file.');
                            } catch { Alert.alert('Error', 'Failed to open attachment.'); }
                        }}
                    >
                        <Ionicons name="document-attach" size={18} color="#3b82f6" />
                        <Text className="flex-1 text-[13px] text-blue-500 font-medium">
                            {notice.file_name || 'View Attachment'}
                        </Text>
                        <Ionicons name="open-outline" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View className="flex-1 justify-center items-center pt-10">
            <Image source={{ uri: NO_NOTICES_IMAGE_URI }} className="w-[200px] h-[200px]" resizeMode="contain" />
            <Text className="text-lg font-semibold text-gray-700 mt-4">No Notices</Text>
            <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                {searchQuery
                    ? 'No notices match your search.'
                    : 'There are no important notices at this time. Check back later for updates.'}
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-xs text-gray-400 mt-1">Loading more...</Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-[#f9fafb]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-[#e5e7eb]">
                <TouchableOpacity className="p-2" onPress={() => router.back()}>
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

            <FlatList
                data={filteredNotices}
                renderItem={renderNoticeItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage && !searchQuery.trim()) {
                        fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.3}
            />

            {/* Reject Reason Modal */}
            <Modal visible={rejectModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/50 px-6">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-xl">
                        <View className="items-center mb-4">
                            <View className="w-14 h-14 bg-red-100 rounded-full items-center justify-center mb-3">
                                <Ionicons name="close-circle-outline" size={32} color="#ef4444" />
                            </View>
                            <Text className="text-lg font-bold text-[#1f2937]">Reject Invitation</Text>
                            <Text className="text-sm text-gray-500 text-center mt-1">
                                Please provide a reason for rejecting this invitation.
                            </Text>
                        </View>
                        <TextInput
                            className="border border-gray-300 rounded-xl p-3 text-base text-[#1f2937] min-h-[100px]"
                            placeholder="Enter reason..."
                            placeholderTextColor="#9ca3af"
                            value={rejectReason}
                            onChangeText={(t) => setRejectReason(t.slice(0, REJECT_REASON_MAX))}
                            multiline
                            textAlignVertical="top"
                            maxLength={REJECT_REASON_MAX}
                        />
                        <Text className="text-xs text-gray-400 mt-1 text-right">
                            {rejectReason.length}/{REJECT_REASON_MAX}
                        </Text>
                        <View className="flex-row gap-3 mt-4">
                            <TouchableOpacity
                                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                                onPress={() => { setRejectModalVisible(false); setRejectTarget(null); setRejectReason(''); }}
                            >
                                <Text className="text-gray-700 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-red-500 py-3 rounded-xl items-center"
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                style={{ opacity: !rejectReason.trim() || rejectMutation.isPending ? 0.5 : 1 }}
                                onPress={() => {
                                    if (rejectTarget) {
                                        rejectMutation.mutate({ recipientId: rejectTarget.recipient_id, reason: rejectReason.trim() });
                                    }
                                }}
                            >
                                <Text className="text-white font-semibold">
                                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Accept Confirmation Modal */}
            <Modal visible={acceptModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/50 px-6">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-xl">
                        <View className="items-center mb-4">
                            <View className="w-14 h-14 bg-emerald-100 rounded-full items-center justify-center mb-3">
                                <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
                            </View>
                            <Text className="text-lg font-bold text-[#1f2937]">Accept Invitation</Text>
                            <Text className="text-sm text-gray-500 text-center mt-1">
                                Are you sure you want to accept this invitation?
                            </Text>
                        </View>
                        {acceptTarget && (
                            <View className="bg-gray-50 rounded-xl p-3 mb-4">
                                <Text className="text-sm font-medium text-gray-800" numberOfLines={2}>{acceptTarget.title}</Text>
                            </View>
                        )}
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
                                onPress={() => { setAcceptModalVisible(false); setAcceptTarget(null); }}
                            >
                                <Text className="text-gray-700 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-emerald-500 py-3 rounded-xl items-center"
                                disabled={acceptMutation.isPending}
                                style={{ opacity: acceptMutation.isPending ? 0.5 : 1 }}
                                onPress={() => {
                                    if (acceptTarget) {
                                        acceptMutation.mutate(acceptTarget.recipient_id, {
                                            onSuccess: () => { setAcceptModalVisible(false); setAcceptTarget(null); },
                                        });
                                    }
                                }}
                            >
                                <Text className="text-white font-semibold">
                                    {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
