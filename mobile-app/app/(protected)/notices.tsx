/**
 * Shared Notices Screen — All Roles
 *
 * Displays important notices for the authenticated user regardless of role.
 * Features:
 * - Server-side type filter (Firestore where clause)
 * - Title search (re-queries on change)
 * - Filter dialog with type selector
 * - Cursor-based infinite pagination
 * - Accept / Reject invitation with confirmation dialogs
 * - Empty state with local Empty.gif asset
 * - Waving-hand greeting in header
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AppText } from '@/components/AppText';
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
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
    getUserNoticesPaginated,
    getUserRecipientMap,
    acceptInvitation,
    rejectInvitation,
    getNoticeFileURL,
    type PaginatedNoticesResult,
    type NoticeTypeFilter,
} from '../../src/services/firebase/content.firestore';
import { useAuthStore } from '../../src/lib/store';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const NAVY = '#2c3e6b';
const REJECT_REASON_MAX = 500;
const PAGE_SIZE = 10;

const NOTICE_TYPE_OPTIONS: { label: string; value: NoticeTypeFilter | null }[] = [
    { label: 'All Types', value: null },
    { label: 'General', value: 'GENERAL' },
    { label: 'Invitation', value: 'INVITATION' },
    { label: 'Push Notification', value: 'PUSH_NOTIFICATION' },
];

export default function NoticesScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<NoticeTypeFilter | null>(null);
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [filterDialogVisible, setFilterDialogVisible] = useState(false);
    // Temp filter state inside dialog
    const [tempTypeFilter, setTempTypeFilter] = useState<NoticeTypeFilter | null>(null);
    const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
    const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // Accept / Reject dialog state
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [acceptTarget, setAcceptTarget] = useState<any>(null);

    // Fetch recipient map
    const {
        data: recipientMap,
        isLoading: recipientMapLoading,
    } = useQuery({
        queryKey: ['recipient-map', user?.id],
        queryFn: () => getUserRecipientMap(user!.id),
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Paginated notices with server-side filters
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
        queryKey: ['user-notices', user?.id, recipientMap?.size ?? 0, appliedSearch, typeFilter, dateFrom?.toISOString() ?? null, dateTo?.toISOString() ?? null],
        queryFn: ({ pageParam }) =>
            getUserNoticesPaginated(
                user!.id,
                recipientMap ?? new Map(),
                PAGE_SIZE,
                (pageParam as QueryDocumentSnapshot<DocumentData> | null) ?? null,
                { titleSearch: appliedSearch || undefined, typeFilter, dateFrom, dateTo },
            ),
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
        enabled: !!user?.id && !!recipientMap,
    });

    const refetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['recipient-map', user?.id] });
        refetchNotices();
    }, [refetchNotices, queryClient, user?.id]);

    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    // Mutations
    const acceptMutation = useMutation({
        mutationFn: (recipientId: string) => acceptInvitation(recipientId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipient-map'] });
            queryClient.invalidateQueries({ queryKey: ['user-notices'] });
            Toast.show({
                type: 'success',
                text2: 'Invitation accepted successfully.',
            });
        },
        onError: () =>
            Toast.show({
                type: 'error',
                text2: 'Failed to accept invitation.',
            }),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ recipientId, reason }: { recipientId: string; reason: string }) =>
            rejectInvitation(recipientId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipient-map'] });
            queryClient.invalidateQueries({ queryKey: ['user-notices'] });
            Toast.show({
                type: 'success',
                text2: 'Invitation rejected.',
            });
        },
        onError: () =>
            Toast.show({
                type: 'error',
                text2: 'Failed to reject invitation.',
            }),
    });

    // Flatten paginated notices
    const allNotices = useMemo(() => {
        if (!noticesData?.pages) return [];
        return noticesData.pages.flatMap((page) => page.notices);
    }, [noticesData]);

    const isLoading = recipientMapLoading || noticesLoading;
    const isRefetching = noticesRefetching;
    const error = noticesError;

    const hasActiveFilters = !!appliedSearch || !!typeFilter || !!dateFrom || !!dateTo;

    // ── Helpers ──

    const getUserFirstName = () => {
        const name = user?.name || 'User';
        return name.split(' ')[0];
    };

    const getNoticeTypeStyle = (type: string) => {
        switch (type) {
            case 'INVITATION':
                return { bg: '#eef2ff', text: '#6366f1', border: '#c7d2fe', icon: 'mail-open' as const };
            case 'PUSH_NOTIFICATION':
                return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: 'notifications' as const };
            default:
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
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getAttachmentLabel = (noticeType?: string) => {
        if (noticeType === 'INVITATION') return 'View invitation';
        return 'View File';
    };

    const handleSearch = () => {
        setAppliedSearch(searchQuery.trim());
    };

    const openFilterDialog = () => {
        setTempTypeFilter(typeFilter);
        setTempDateFrom(dateFrom);
        setTempDateTo(dateTo);
        setShowFromPicker(false);
        setShowToPicker(false);
        setFilterDialogVisible(true);
    };

    const applyFilters = () => {
        setTypeFilter(tempTypeFilter);
        setDateFrom(tempDateFrom);
        setDateTo(tempDateTo);
        setFilterDialogVisible(false);
    };

    const clearAllFilters = () => {
        setSearchQuery('');
        setAppliedSearch('');
        setTypeFilter(null);
        setTempTypeFilter(null);
        setDateFrom(null);
        setDateTo(null);
        setTempDateFrom(null);
        setTempDateTo(null);
    };

    // ── Loading / Error states ──

    if (isLoading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color={NAVY} />
                <AppText style={styles.loadingText}>Loading notices...</AppText>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centeredContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <AppText style={styles.errorText}>Failed to load notices</AppText>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <AppText style={styles.retryButtonText}>Retry</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Render items ──

    const renderNoticeItem = ({ item: notice }: { item: any }) => {
        const typeStyle = getNoticeTypeStyle(notice.type);
        const isInvitation = notice.type === 'INVITATION';
        const status = notice.recipient_status;

        return (
            <View
                style={[styles.noticeCard, { borderLeftColor: typeStyle.text }]}
            >
                <View style={styles.noticeHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
                        <Ionicons name={typeStyle.icon} size={14} color={typeStyle.text} />
                        <AppText style={[styles.typeText, { color: typeStyle.text }]}>{notice.type?.replace('_', ' ')}</AppText>
                    </View>
                    <AppText style={styles.dateText}>{formatDate(notice.created_at)}</AppText>
                </View>

                <AppText style={styles.noticeTitle}>{notice.title}</AppText>
                <AppText style={styles.noticeContent} numberOfLines={3}>{notice.content}</AppText>

                {/* Invitation-specific info */}
                {isInvitation && notice.venue && (
                    <View style={styles.infoRow}>
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <AppText style={styles.infoText}>{notice.venue}</AppText>
                    </View>
                )}
                {isInvitation && notice.event_date && (
                    <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Ionicons name="calendar" size={14} color="#6b7280" />
                        <AppText style={styles.infoText}>
                            {formatDate(notice.event_date)}
                            {notice.event_time ? ` at ${notice.event_time}` : ''}
                        </AppText>
                    </View>
                )}

                {/* Invitation status + accept/reject */}
                {isInvitation && status && (
                    <View style={{ marginTop: 8 }}>
                        {status === 'PENDING' && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.acceptButton, acceptMutation.isPending && styles.buttonDisabled]}
                                    disabled={acceptMutation.isPending}
                                    onPress={() => { setAcceptTarget(notice); setAcceptModalVisible(true); }}
                                >
                                    <AppText style={styles.buttonText}>
                                        {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                                    </AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.rejectButton}
                                    onPress={() => { setRejectTarget(notice); setRejectReason(''); setRejectModalVisible(true); }}
                                >
                                    <AppText style={styles.buttonText}>Reject</AppText>
                                </TouchableOpacity>
                            </View>
                        )}
                        {status === 'ACCEPTED' && (
                            <View style={styles.statusRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                                <AppText style={[styles.statusText, { color: '#16a34a' }]}>Accepted</AppText>
                            </View>
                        )}
                        {status === 'REJECTED' && (
                            <View style={{ marginTop: 4 }}>
                                <View style={styles.statusRow}>
                                    <Ionicons name="close-circle" size={16} color="#dc2626" />
                                    <AppText style={[styles.statusText, { color: '#dc2626' }]}>Rejected</AppText>
                                </View>
                                {notice.reject_reason && (
                                    <AppText style={styles.rejectionReason}>Reason: {notice.reject_reason}</AppText>
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
                        <AppText style={styles.fileText}>{getAttachmentLabel(notice.type)}</AppText>
                        <Ionicons name="open-outline" size={16} color={NAVY} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Image source={require('../../assets/Empty.gif')} style={styles.emptyGif} resizeMode="contain" />
            <AppText style={styles.emptyTitle}>No Notices</AppText>
            <AppText style={styles.emptyText}>
                {hasActiveFilters
                    ? 'No notices match your search or filter.'
                    : 'There are no important notices at this time. Check back later for updates.'}
            </AppText>
            {hasActiveFilters && (
                <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                    <AppText style={styles.clearFiltersBtnText}>Clear Filters</AppText>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={NAVY} />
                <AppText style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Loading more...</AppText>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.headerSection}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.greetingRow}>
                            <AppText style={styles.greetingText}>Hey {getUserFirstName()} </AppText>
                            <Image
                                source={require('../../assets/material-icons/waving_hand_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png')}
                                style={styles.wavingHand}
                            />
                        </View>
                        <AppText style={styles.screenTitle}>View Notices</AppText>
                    </View>
                    {user?.profile_image_url ? (
                        <Image source={{ uri: user.profile_image_url }} style={styles.profilePhoto} />
                    ) : (
                        <View style={styles.profilePhotoPlaceholder}>
                            <Ionicons name="person" size={24} color="#9ca3af" />
                        </View>
                    )}
                </View>
            </View>

            {/* ── Search Bar ── */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputRow}>
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchTextInput}
                        placeholder="Search"
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setAppliedSearch(''); }}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                    {/* Filter icon */}
                    <TouchableOpacity onPress={openFilterDialog} style={styles.filterIconBtn}>
                        <Ionicons name="options-outline" size={22} color={hasActiveFilters ? NAVY : '#6b7280'} />
                        {hasActiveFilters && <View style={styles.filterDot} />}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Active filter chips */}
            {hasActiveFilters && (
                <View style={styles.chipRow}>
                    {appliedSearch ? (
                        <View style={styles.chip}>
                            <AppText style={styles.chipText}>Title: "{appliedSearch}"</AppText>
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setAppliedSearch(''); }}>
                                <Ionicons name="close" size={14} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    {typeFilter ? (
                        <View style={styles.chip}>
                            <AppText style={styles.chipText}>{typeFilter.replace('_', ' ')}</AppText>
                            <TouchableOpacity onPress={() => setTypeFilter(null)}>
                                <Ionicons name="close" size={14} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    {dateFrom ? (
                        <View style={styles.chip}>
                            <AppText style={styles.chipText}>From: {formatDate(dateFrom)}</AppText>
                            <TouchableOpacity onPress={() => { setDateFrom(null); setTempDateFrom(null); }}>
                                <Ionicons name="close" size={14} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    {dateTo ? (
                        <View style={styles.chip}>
                            <AppText style={styles.chipText}>To: {formatDate(dateTo)}</AppText>
                            <TouchableOpacity onPress={() => { setDateTo(null); setTempDateTo(null); }}>
                                <Ionicons name="close" size={14} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            )}

            {/* ── Notices List ── */}
            <FlatList
                data={allNotices}
                renderItem={renderNoticeItem}
                keyExtractor={(item) => `${item.id}-${item.recipient_id}`}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.3}
            />

            {/* ── Filter Dialog ── */}
            <Modal visible={filterDialogVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setFilterDialogVisible(false)}>
                    <Pressable style={styles.filterDialog} onPress={() => {}}>
                        <AppText style={styles.filterDialogTitle}>Filter Notices</AppText>

                        <AppText style={styles.filterLabel}>Notice Type</AppText>
                        {NOTICE_TYPE_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.label}
                                style={[
                                    styles.filterOption,
                                    tempTypeFilter === opt.value && styles.filterOptionActive,
                                ]}
                                onPress={() => setTempTypeFilter(opt.value)}
                            >
                                <Ionicons
                                    name={tempTypeFilter === opt.value ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={tempTypeFilter === opt.value ? NAVY : '#9ca3af'}
                                />
                                <AppText style={[
                                    styles.filterOptionText,
                                    tempTypeFilter === opt.value && { color: NAVY, fontWeight: '600' },
                                ]}>
                                    {opt.label}
                                </AppText>
                            </TouchableOpacity>
                        ))}

                        {/* Date Range Filter */}
                        <AppText style={[styles.filterLabel, { marginTop: 16 }]}>Date Range</AppText>

                        <TouchableOpacity
                            style={styles.datePickerRow}
                            onPress={() => { setShowFromPicker(true); setShowToPicker(false); }}
                        >
                            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                            <AppText style={styles.datePickerText}>
                                {tempDateFrom ? formatDate(tempDateFrom) : 'From date'}
                            </AppText>
                            {tempDateFrom && (
                                <TouchableOpacity onPress={() => { setTempDateFrom(null); setShowFromPicker(false); }}>
                                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {showFromPicker && (
                            <DateTimePicker
                                value={tempDateFrom || new Date()}
                                mode="date"
                                display="default"
                                maximumDate={tempDateTo || new Date()}
                                onChange={(_e: any, d?: Date) => {
                                    setShowFromPicker(Platform.OS === 'ios');
                                    if (d) setTempDateFrom(d);
                                }}
                            />
                        )}

                        <TouchableOpacity
                            style={styles.datePickerRow}
                            onPress={() => { setShowToPicker(true); setShowFromPicker(false); }}
                        >
                            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                            <AppText style={styles.datePickerText}>
                                {tempDateTo ? formatDate(tempDateTo) : 'To date'}
                            </AppText>
                            {tempDateTo && (
                                <TouchableOpacity onPress={() => { setTempDateTo(null); setShowToPicker(false); }}>
                                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {showToPicker && (
                            <DateTimePicker
                                value={tempDateTo || new Date()}
                                mode="date"
                                display="default"
                                minimumDate={tempDateFrom || undefined}
                                maximumDate={new Date()}
                                onChange={(_e: any, d?: Date) => {
                                    setShowToPicker(Platform.OS === 'ios');
                                    if (d) setTempDateTo(d);
                                }}
                            />
                        )}

                        <View style={styles.filterDialogActions}>
                            <TouchableOpacity
                                style={styles.filterCancelBtn}
                                onPress={() => setFilterDialogVisible(false)}
                            >
                                <AppText style={styles.filterCancelText}>Cancel</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filterApplyBtn} onPress={applyFilters}>
                                <AppText style={styles.filterApplyText}>Apply</AppText>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Accept Confirmation Dialog ── */}
            <Modal visible={acceptModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dialogWrapper}>
                        <View style={styles.confirmDialog}>
                            <View style={styles.dialogIconWrapper}>
                                <View style={[styles.dialogIconCircle, { backgroundColor: '#d1fae5' }]}>
                                    <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
                                </View>
                                <AppText style={styles.dialogTitle}>Accept Invitation</AppText>
                                <AppText style={styles.dialogSubtitle}>
                                    Are you sure you want to accept this invitation?
                                </AppText>
                            </View>
                            {acceptTarget && (
                                <View style={styles.dialogNoticePreview}>
                                    <AppText style={styles.dialogNoticeTitle} numberOfLines={2}>{acceptTarget.title}</AppText>
                                </View>
                            )}
                            <View style={styles.dialogActions}>
                                <TouchableOpacity
                                    style={styles.dialogCancelBtn}
                                    onPress={() => { setAcceptModalVisible(false); setAcceptTarget(null); }}
                                >
                                    <AppText style={styles.dialogCancelText}>Cancel</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dialogAcceptBtn, acceptMutation.isPending && { opacity: 0.5 }]}
                                    disabled={acceptMutation.isPending}
                                    onPress={() => {
                                        if (acceptTarget) {
                                            const recipientId = acceptTarget.recipient_id;
                                            setAcceptModalVisible(false);
                                            setAcceptTarget(null);
                                            acceptMutation.mutate(recipientId);
                                        }
                                    }}
                                >
                                    <AppText style={styles.dialogAcceptText}>
                                        {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* ── Reject Reason Dialog ── */}
            <Modal visible={rejectModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dialogWrapper}>
                        <View style={styles.confirmDialog}>
                            <View style={styles.dialogIconWrapper}>
                                <View style={[styles.dialogIconCircle, { backgroundColor: '#fee2e2' }]}>
                                    <Ionicons name="close-circle-outline" size={32} color="#ef4444" />
                                </View>
                                <AppText style={styles.dialogTitle}>Reject Invitation</AppText>
                                <AppText style={styles.dialogSubtitle}>
                                    Please provide a reason for rejecting this invitation.
                                </AppText>
                            </View>
                            <TextInput
                                style={styles.rejectReasonInput}
                                placeholder="Enter reason..."
                                placeholderTextColor="#9ca3af"
                                value={rejectReason}
                                onChangeText={(t) => setRejectReason(t.slice(0, REJECT_REASON_MAX))}
                                multiline
                                maxLength={REJECT_REASON_MAX}
                            />
                            <AppText style={styles.charCount}>
                                {rejectReason.length}/{REJECT_REASON_MAX}
                            </AppText>
                            <View style={styles.dialogActions}>
                                <TouchableOpacity
                                    style={styles.dialogCancelBtn}
                                    onPress={() => { setRejectModalVisible(false); setRejectTarget(null); setRejectReason(''); }}
                                >
                                    <AppText style={styles.dialogCancelText}>Cancel</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.dialogRejectBtn,
                                        (!rejectReason.trim() || rejectMutation.isPending) && { opacity: 0.5 },
                                    ]}
                                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                                    onPress={() => {
                                        if (rejectTarget) {
                                            const payload = {
                                                recipientId: rejectTarget.recipient_id,
                                                reason: rejectReason.trim(),
                                            };
                                            setRejectModalVisible(false);
                                            setRejectTarget(null);
                                            setRejectReason('');
                                            rejectMutation.mutate(payload);
                                        }
                                    }}
                                >
                                    <AppText style={styles.dialogRejectText}>
                                        {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fb' },

    /* Header */
    headerSection: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    greetingText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    wavingHand: {
        width: 20,
        height: 20,
        tintColor: '#000000',
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginTop: 2,
    },
    profilePhoto: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    profilePhotoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },

    /* Search */
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },
    filterIconBtn: {
        padding: 4,
        position: 'relative',
    },
    filterDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },

    /* Filter chips */
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#ffffff',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8ecf4',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: NAVY,
    },

    /* List */
    scrollContent: {
        padding: 16,
        flexGrow: 1,
    },

    /* Notice card */
    noticeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    noticeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
    },
    typeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    dateText: { fontSize: 12, color: '#9ca3af' },
    noticeTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 8 },
    noticeContent: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    infoText: { fontSize: 14, color: '#6b7280' },

    /* Invitation action buttons */
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    acceptButton: {
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    rejectButton: {
        flex: 1,
        backgroundColor: '#ef4444',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    buttonDisabled: { opacity: 0.5 },

    /* Status indicators */
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    statusText: { fontSize: 14, fontWeight: '500' },
    rejectionReason: { fontSize: 12, color: '#ef4444', fontStyle: 'italic', marginTop: 4 },

    /* File attachment */
    fileAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#e8ecf4',
        borderRadius: 8,
        gap: 8,
    },
    fileText: { flex: 1, fontSize: 13, color: NAVY, fontWeight: '500' },

    /* Loading / Error */
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fb',
        padding: 24,
    },
    loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
    errorText: { fontSize: 16, color: '#6b7280', marginTop: 12, marginBottom: 16 },
    retryButton: {
        backgroundColor: NAVY,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    retryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

    /* Empty state */
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyGif: { width: 220, height: 220 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a2e', marginTop: 16 },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    clearFiltersBtn: {
        marginTop: 16,
        backgroundColor: NAVY,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    clearFiltersBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    /* ── Modals ── */
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 24,
    },
    dialogWrapper: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },

    /* Filter Dialog */
    filterDialog: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    filterDialogTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 20,
        textAlign: 'center',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        gap: 10,
        marginBottom: 4,
    },
    filterOptionActive: {
        backgroundColor: '#e8ecf4',
    },
    filterOptionText: {
        fontSize: 15,
        color: '#4b5563',
    },
    filterDialogActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    filterCancelBtn: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    filterCancelText: { color: '#374151', fontWeight: '600' },
    filterApplyBtn: {
        flex: 1,
        backgroundColor: NAVY,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    filterApplyText: { color: '#fff', fontWeight: '600' },
    datePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 10,
        marginBottom: 8,
    },
    datePickerText: {
        flex: 1,
        fontSize: 15,
        color: '#4b5563',
    },

    /* Confirm Dialogs */
    confirmDialog: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    dialogIconWrapper: {
        alignItems: 'center',
        marginBottom: 16,
    },
    dialogIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    dialogTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
    dialogSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 4,
    },
    dialogNoticePreview: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    dialogNoticeTitle: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
    dialogActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    dialogCancelBtn: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    dialogCancelText: { color: '#374151', fontWeight: '600' },
    dialogAcceptBtn: {
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    dialogAcceptText: { color: '#fff', fontWeight: '600' },
    dialogRejectBtn: {
        flex: 1,
        backgroundColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    dialogRejectText: { color: '#fff', fontWeight: '600' },
    rejectReasonInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
        textAlign: 'right',
    },
});
