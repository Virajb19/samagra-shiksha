/**
 * View Staffs Screen - Headmaster
 * 
 * Shows all faculty members at the headmaster's school.
 * Headmaster can activate/deactivate teachers.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchoolStaffs, getFacultyByUserId, toggleUserActive } from '../../../src/services/firebase/faculty.firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/lib/store';

interface StaffUser {
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    gender: string;
    profile_image_url?: string | null;
    is_active: boolean;
}

interface Staff {
    id: string;
    user: StaffUser;
    years_of_experience?: number;
    designation?: string;
}

const BLUE = '#1565C0';
const NAVY = '#2c3e6b';

interface StaffCardProps {
    staff: Staff;
    expanded: boolean;
    onToggle: () => void;
    onToggleActive: (active: boolean) => void;
    isUpdating: boolean;
    isCurrentUser: boolean;
}

function StaffCard({ staff, expanded, onToggle, onToggleActive, isUpdating, isCurrentUser }: StaffCardProps) {
    const isActive = staff.user.is_active;

    const getStatusBadge = () => {
        if (isActive) return { color: '#22c55e', icon: 'checkmark-circle' as const };
        return { color: '#ef4444', icon: 'close-circle' as const };
    };

    const badge = getStatusBadge();

    const getRoleDisplay = () => {
        switch (staff.user.role) {
            case 'HEADMASTER': return 'Headmaster';
            case 'TEACHER': return 'Teacher';
            default: return staff.user.role;
        }
    };

    return (
        <View style={styles.staffCard}>
            <TouchableOpacity style={styles.staffHeader} onPress={onToggle}>
                <View style={styles.avatarContainer}>
                    {staff.user.profile_image_url ? (
                        <Image
                            source={{ uri: staff.user.profile_image_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {staff.user.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
                        <Ionicons name={badge.icon} size={16} color="#ffffff" />
                    </View>
                </View>
                <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{staff.user.name}</Text>
                    <Text style={styles.staffRole}>{getRoleDisplay()}</Text>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={BLUE}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContent}>
                    {staff.user.phone ? (
                        <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <Text style={styles.detailLabel}>Phone:</Text>
                            <Text style={styles.detailValue}>{staff.user.phone}</Text>
                        </View>
                    ) : null}
                    {staff.user.email ? (
                        <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <Text style={styles.detailLabel}>Email:</Text>
                            <Text style={styles.detailValue} numberOfLines={1}>{staff.user.email}</Text>
                        </View>
                    ) : null}
                    {staff.years_of_experience != null && (
                        <View style={styles.detailRow}>
                            <Ionicons name="briefcase-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <Text style={styles.detailLabel}>Experience:</Text>
                            <Text style={styles.detailValue}>{staff.years_of_experience} years</Text>
                        </View>
                    )}
                    {staff.designation ? (
                        <View style={styles.detailRow}>
                            <Ionicons name="ribbon-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <Text style={styles.detailLabel}>Designation:</Text>
                            <Text style={styles.detailValue}>{staff.designation}</Text>
                        </View>
                    ) : null}

                    {/* Activate/Deactivate button — only for teachers, not self */}
                    {staff.user.role === 'TEACHER' && !isCurrentUser && (
                        <View style={{ marginTop: 12 }}>
                            {isUpdating ? (
                                <ActivityIndicator size="small" color={BLUE} />
                            ) : isActive ? (
                                <TouchableOpacity
                                    style={styles.deactivateButton}
                                    onPress={() => onToggleActive(false)}
                                >
                                    <Ionicons name="close-circle" size={18} color="#ffffff" />
                                    <Text style={styles.deactivateButtonText}>Deactivate</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.activateButton}
                                    onPress={() => onToggleActive(true)}
                                >
                                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                                    <Text style={styles.activateButtonText}>Activate</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

export default function ViewStaffsScreen() {
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const { user: currentUser } = useAuthStore();

    // Fetch headmaster's faculty profile (to get school_id)
    const { data: profile } = useQuery({
        queryKey: ['faculty-profile'],
        queryFn: async () => {
            const profileData = await getFacultyByUserId(currentUser!.id);
            return profileData;
        },
    });

    // Fetch all staff at the headmaster's school
    const { data: staffList, isLoading, refetch, isRefetching } = useQuery<Staff[]>({
        queryKey: ['school-staffs', profile?.school_id],
        queryFn: async () => {
            const data = await getSchoolStaffs(profile!.school_id);
            return data;
        },
        enabled: !!profile?.school_id,
    });

    // Mutation to toggle active status
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
            await toggleUserActive(userId, isActive);
        },
        onSuccess: (_, variables) => {
            const statusText = variables.isActive ? 'activated' : 'deactivated';
            Alert.alert('Success', `User has been ${statusText} successfully!`);
            queryClient.invalidateQueries({ queryKey: ['school-staffs'] });
            setUpdatingId(null);
        },
        onError: (error: any) => {
            Alert.alert('Error', error?.message || 'Failed to update user status');
            setUpdatingId(null);
        },
    });

    const handleToggleActive = (staff: Staff, active: boolean) => {
        const action = active ? 'activate' : 'deactivate';
        Alert.alert(
            `${active ? 'Activate' : 'Deactivate'} User`,
            `Are you sure you want to ${action} ${staff.user.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: active ? 'Activate' : 'Deactivate',
                    style: active ? 'default' : 'destructive',
                    onPress: () => {
                        setUpdatingId(staff.id);
                        toggleActiveMutation.mutate({ userId: staff.user.id, isActive: active });
                    },
                },
            ]
        );
    };

    const schoolName = profile?.school
        ? `${profile.school.registration_code} - ${profile.school.name}`
        : 'Your School';

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Filter staff by search query and exclude the current user
    const filteredStaff = staffList?.filter(staff =>
        staff.user.id !== currentUser?.id &&
        staff.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={NAVY} />
                <Text style={styles.loadingText}>Loading staff...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>View Staffs</Text>
                    <Text style={styles.headerSubtitle}>{schoolName}</Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.cardContainer}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                >
                    <Text style={styles.sectionTitle}>Find your colleagues</Text>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBadge}>
                            <Text style={styles.statNumber}>{filteredStaff.length}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.statNumber, { color: '#22c55e' }]}>{filteredStaff.filter(s => s.user.is_active).length}</Text>
                            <Text style={[styles.statLabel, { color: '#16a34a' }]}>Active</Text>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: '#fee2e2' }]}>
                            <Text style={[styles.statNumber, { color: '#ef4444' }]}>{filteredStaff.filter(s => !s.user.is_active).length}</Text>
                            <Text style={[styles.statLabel, { color: '#dc2626' }]}>Inactive</Text>
                        </View>
                    </View>

                    {filteredStaff.length > 0 ? (
                        filteredStaff.map((staff) => (
                            <StaffCard
                                key={staff.id}
                                staff={staff}
                                expanded={expandedId === staff.id}
                                onToggle={() => setExpandedId(expandedId === staff.id ? null : staff.id)}
                                onToggleActive={(active) => handleToggleActive(staff, active)}
                                isUpdating={updatingId === staff.id}
                                isCurrentUser={staff.user.id === currentUser?.id}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No staff found matching your search' : 'No staff found'}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f8' },
    header: { backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 40, flexDirection: 'row', alignItems: 'flex-start' },
    backButton: { padding: 8, marginRight: 8 },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 32, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
    cardContainer: { flex: 1, backgroundColor: '#ffffff', marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8ecf4', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
    searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, color: '#1a1a2e' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statBadge: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: '700', color: BLUE },
    statLabel: { fontSize: 11, fontWeight: '500', color: '#3b82f6', marginTop: 2 },
    staffCard: { backgroundColor: '#ffffff', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e8ecf4', overflow: 'hidden' },
    staffHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    avatarContainer: { position: 'relative', marginRight: 12 },
    avatar: { width: 50, height: 50, borderRadius: 10 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontWeight: '600', color: NAVY },
    statusBadge: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff' },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
    staffRole: { fontSize: 13, color: NAVY },
    expandedContent: { padding: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f2f8' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    detailLabel: { fontSize: 13, color: '#6b7280', width: 90 },
    detailValue: { fontSize: 13, color: '#1a1a2e', fontWeight: '500', flex: 1 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 12 },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
    toggleHint: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
    activateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, gap: 6 },
    activateButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    deactivateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, gap: 6 },
    deactivateButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f8' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12, textAlign: 'center' },
});
