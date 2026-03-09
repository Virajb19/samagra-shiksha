/**
 * Headmaster Notices Screen
 * 
 * Displays important notices for the headmaster.
 * All notices (General, Invitation, Push Notification) shown in one paginated list.
 * Invitation notices have inline accept/reject functionality.
 * Uses cursor-based pagination for user-scoped notices.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    Linking,
    Alert,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();
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
                return { bg: '#e8ecf4', text: NAVY, border: '#c5cee0', icon: 'information-circle' as const };
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={NAVY} />
                <Text style={styles.loadingText}>Loading notices...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load notices</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
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
                style={[styles.noticeCard, { borderLeftColor: typeStyle.text }]}
            >
                <View style={styles.noticeHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
                        <Ionicons name={typeStyle.icon} size={14} color={typeStyle.text} />
                        <Text style={[styles.typeText, { color: typeStyle.text }]}>{notice.type?.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(notice.created_at)}</Text>
                </View>

                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeContent} numberOfLines={3}>{notice.content}</Text>

                {/* Invitation-specific info */}
                {isInvitation && notice.venue && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 4 }}>
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>{notice.venue}</Text>
                    </View>
                )}
                {isInvitation && notice.event_date && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <Ionicons name="calendar" size={14} color="#6b7280" />
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>
                            {formatDate(notice.event_date)}
                            {notice.event_time ? ` at ${notice.event_time}` : ''}
                        </Text>
                    </View>
                )}

                {/* Invitation status + accept/reject */}
                {isInvitation && status && (
                    <View style={{ marginTop: 8 }}>
                        {status === 'PENDING' && (
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                                    disabled={acceptMutation.isPending}
                                    onPress={() => {
                                        setAcceptTarget(notice);
                                        setAcceptModalVisible(true);
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                                        {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                                    onPress={() => {
                                        setRejectTarget(notice);
                                        setRejectReason('');
                                        setRejectModalVisible(true);
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {status === 'ACCEPTED' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#16a34a' }}>Accepted</Text>
                            </View>
                        )}
                        {status === 'REJECTED' && (
                            <View style={{ marginTop: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="close-circle" size={16} color="#dc2626" />
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#dc2626' }}>Rejected</Text>
                                </View>
                                {notice.reject_reason && (
                                    <Text style={{ fontSize: 12, color: '#ef4444', fontStyle: 'italic', marginTop: 4 }}>
                                        Reason: {notice.reject_reason}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Attachment */}
                {notice.file_url && (
                    <TouchableOpacity
                        style={styles.fileAttachment}
                        onPress={async () => {
                            try {
                                const downloadUrl = await getNoticeFileURL(notice.file_url);
                                const canOpen = await Linking.canOpenURL(downloadUrl);
                                if (canOpen) await Linking.openURL(downloadUrl);
                                else Alert.alert('Error', 'Unable to open this file.');
                            } catch { Alert.alert('Error', 'Failed to open attachment.'); }
                        }}
                    >
                        <Ionicons name="document-attach" size={18} color={NAVY} />
                        <Text style={styles.fileText}>{notice.file_name || 'View Attachment'}</Text>
                        <Ionicons name="open-outline" size={16} color={NAVY} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Image source={{ uri: NO_NOTICES_IMAGE_URI }} style={styles.emptyGif} resizeMode="contain" />
            <Text style={styles.emptyTitle}>No Notices</Text>
            <Text style={styles.emptyText}>
                {searchQuery
                    ? 'No notices match your search.'
                    : 'There are no important notices at this time. Check back later for updates.'}
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={NAVY} />
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Loading more...</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>View Notices</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInput}>
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchTextInput}
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
                contentContainerStyle={styles.scrollContent}
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 56, height: 56, backgroundColor: '#fee2e2', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Ionicons name="close-circle-outline" size={32} color="#ef4444" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>Reject Invitation</Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                                Please provide a reason for rejecting this invitation.
                            </Text>
                        </View>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 12, fontSize: 16, color: '#1f2937', minHeight: 100, textAlignVertical: 'top' }}
                            placeholder="Enter reason..."
                            placeholderTextColor="#9ca3af"
                            value={rejectReason}
                            onChangeText={(t) => setRejectReason(t.slice(0, REJECT_REASON_MAX))}
                            multiline
                            maxLength={REJECT_REASON_MAX}
                        />
                        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
                            {rejectReason.length}/{REJECT_REASON_MAX}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                                onPress={() => { setRejectModalVisible(false); setRejectTarget(null); setRejectReason(''); }}
                            >
                                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: !rejectReason.trim() || rejectMutation.isPending ? 0.5 : 1 }}
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

            {/* Accept Confirmation Modal */}
            <Modal visible={acceptModalVisible} transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 56, height: 56, backgroundColor: '#d1fae5', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>Accept Invitation</Text>
                            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                                Are you sure you want to accept this invitation?
                            </Text>
                        </View>
                        {acceptTarget && (
                            <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#1f2937' }} numberOfLines={2}>{acceptTarget.title}</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                                onPress={() => { setAcceptModalVisible(false); setAcceptTarget(null); }}
                            >
                                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: acceptMutation.isPending ? 0.5 : 1 }}
                                disabled={acceptMutation.isPending}
                                onPress={() => {
                                    if (acceptTarget) {
                                        acceptMutation.mutate(acceptTarget.recipient_id, {
                                            onSuccess: () => { setAcceptModalVisible(false); setAcceptTarget(null); },
                                        });
                                    }
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>
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

const NAVY = '#2c3e6b';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, backgroundColor: NAVY,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
    placeholder: { width: 40 },
    searchContainer: {
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff',
        borderBottomWidth: 1, borderBottomColor: '#e8ecf4',
    },
    searchInput: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8ecf4',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    },
    searchTextInput: { flex: 1, fontSize: 16, color: '#1a1a2e' },
    scrollContent: { padding: 16, flexGrow: 1 },
    noticeCard: {
        backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12,
        borderLeftWidth: 4, shadowColor: NAVY, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    noticeHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
        paddingVertical: 4, borderRadius: 6, borderWidth: 1, gap: 4,
    },
    typeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    dateText: { fontSize: 12, color: '#9ca3af' },
    noticeTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 8 },
    noticeContent: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
    fileAttachment: {
        flexDirection: 'row', alignItems: 'center', marginTop: 12,
        paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#e8ecf4', borderRadius: 8, gap: 8,
    },
    fileText: { flex: 1, fontSize: 13, color: NAVY, fontWeight: '500' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f8' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f8', padding: 24 },
    errorText: { fontSize: 16, color: '#6b7280', marginTop: 12, marginBottom: 16 },
    retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
    retryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
    emptyGif: { width: 200, height: 200 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a2e', marginTop: 16 },
    emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
});
