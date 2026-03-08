/**
 * Notice Detail Screen
 *
 * Shows full details of an invitation notice: image, venue, date/time, content.
 * Allows accept/reject for PENDING invitations.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getNoticeById,
    acceptInvitation,
    rejectInvitation,
} from '../../src/services/firebase/content.firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REJECT_REASON_MAX = 500;

export default function NoticeDetailScreen() {
    const { noticeId, recipientId, initialStatus } = useLocalSearchParams<{
        noticeId: string;
        recipientId: string;
        initialStatus?: string;
    }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [localStatus, setLocalStatus] = useState(initialStatus ?? 'PENDING');

    const {
        data: notice,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['notice-detail', noticeId],
        queryFn: () => getNoticeById(noticeId),
        enabled: !!noticeId,
    });

    const acceptMutation = useMutation({
        mutationFn: () => acceptInvitation(recipientId),
        onSuccess: () => {
            setLocalStatus('ACCEPTED');
            queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
            Alert.alert('Success', 'Invitation accepted!');
        },
        onError: () => Alert.alert('Error', 'Failed to accept invitation.'),
    });

    const rejectMutation = useMutation({
        mutationFn: (reason: string) => rejectInvitation(recipientId, reason),
        onSuccess: () => {
            setLocalStatus('REJECTED');
            queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
            setRejectModalVisible(false);
            setRejectReason('');
            Alert.alert('Done', 'Invitation rejected.');
        },
        onError: () => Alert.alert('Error', 'Failed to reject invitation.'),
    });

    const formatFirestoreDate = (ts: any) => {
        if (!ts) return '';
        if (ts.seconds)
            return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        return new Date(ts).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2c3e6b" />
            </View>
        );
    }

    if (error || !notice) {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={{ marginTop: 12, fontSize: 16, color: '#6b7280' }}>Notice not found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusColor =
        localStatus === 'ACCEPTED' ? '#16a34a' : localStatus === 'REJECTED' ? '#dc2626' : '#ca8a04';
    const statusBg =
        localStatus === 'ACCEPTED' ? '#dcfce7' : localStatus === 'REJECTED' ? '#fef2f2' : '#fef9c3';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    Notice Details
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Image */}
                {notice.file_url && (
                    <Image
                        source={{ uri: notice.file_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                )}

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{localStatus}</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>{notice.title}</Text>

                {/* Meta Info */}
                <View style={styles.metaContainer}>
                    {notice.venue && (
                        <View style={styles.metaRow}>
                            <Ionicons name="location" size={18} color="#6366f1" />
                            <Text style={styles.metaText}>{notice.venue}</Text>
                        </View>
                    )}
                    {notice.event_date && (
                        <View style={styles.metaRow}>
                            <Ionicons name="calendar" size={18} color="#6366f1" />
                            <Text style={styles.metaText}>{formatFirestoreDate(notice.event_date)}</Text>
                        </View>
                    )}
                    {notice.event_time && (
                        <View style={styles.metaRow}>
                            <Ionicons name="time" size={18} color="#6366f1" />
                            <Text style={styles.metaText}>{notice.event_time}</Text>
                        </View>
                    )}
                    {notice.created_at && (
                        <View style={styles.metaRow}>
                            <Ionicons name="document-text" size={18} color="#9ca3af" />
                            <Text style={[styles.metaText, { color: '#9ca3af' }]}>
                                Sent on {formatFirestoreDate(notice.created_at)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                {notice.content && (
                    <View style={styles.contentCard}>
                        <Text style={styles.contentText}>{notice.content}</Text>
                    </View>
                )}

                {/* Accept / Reject Buttons */}
                {localStatus === 'PENDING' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                            disabled={acceptMutation.isPending}
                            onPress={() => acceptMutation.mutate()}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>
                                {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => {
                                setRejectReason('');
                                setRejectModalVisible(true);
                            }}
                        >
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Reject Modal */}
            <Modal visible={rejectModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reject Invitation</Text>
                        <Text style={styles.modalSub}>
                            Please provide a reason for rejecting this invitation.
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter reason..."
                            placeholderTextColor="#9ca3af"
                            value={rejectReason}
                            onChangeText={(t) => setRejectReason(t.slice(0, REJECT_REASON_MAX))}
                            multiline
                            maxLength={REJECT_REASON_MAX}
                        />
                        <Text style={styles.charCount}>
                            {rejectReason.length}/{REJECT_REASON_MAX}
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]}
                                onPress={() => {
                                    setRejectModalVisible(false);
                                    setRejectReason('');
                                }}
                            >
                                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalBtn,
                                    {
                                        backgroundColor: '#ef4444',
                                        opacity: !rejectReason.trim() || rejectMutation.isPending ? 0.5 : 1,
                                    },
                                ]}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                onPress={() => rejectMutation.mutate(rejectReason.trim())}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>
                                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2c3e6b',
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    headerBack: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    image: {
        width: SCREEN_WIDTH - 32,
        height: (SCREEN_WIDTH - 32) * 0.6,
        borderRadius: 14,
        marginBottom: 16,
        backgroundColor: '#e5e7eb',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12,
    },
    statusText: { fontSize: 13, fontWeight: '700' },
    title: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
    metaContainer: { gap: 10, marginBottom: 20 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    metaText: { fontSize: 15, color: '#4b5563' },
    contentCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    contentText: { fontSize: 15, color: '#374151', lineHeight: 22 },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    backBtn: {
        marginTop: 16,
        backgroundColor: '#2c3e6b',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
    modalSub: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
});
