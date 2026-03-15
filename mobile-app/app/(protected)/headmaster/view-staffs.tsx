/**
 * View Staffs Screen - Headmaster
 * 
 * Shows all faculty members at the headmaster's school.
 * Headmaster can activate/deactivate teachers.
 */

import React, { useState, useCallback } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Modal,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchoolStaffs, getFacultyByUserId, toggleUserActive } from '../../../src/services/firebase/faculty.firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/lib/store';
import Toast from 'react-native-toast-message';

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

interface ToggleConfirmationState {
    staff: Staff;
    active: boolean;
}

const BLUE = '#1565C0';

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
        <View className="bg-white rounded-[14px] mb-3 overflow-hidden border border-[#e8ecf4]">
            <TouchableOpacity className="flex-row items-center p-3" onPress={onToggle}>
                <View className="relative mr-3">
                    {staff.user.profile_image_url ? (
                        <Image
                            source={{ uri: staff.user.profile_image_url }}
                            className="w-[50px] h-[50px] rounded-[10px]"
                            style={{ borderWidth: 2.5, borderColor: isActive ? '#22c55e' : '#ef4444' }}
                        />
                    ) : (
                        <View className="w-[50px] h-[50px] rounded-[10px] bg-[#e8ecf4] justify-center items-center" style={{ borderWidth: 2.5, borderColor: isActive ? '#22c55e' : '#ef4444' }}>
                            <AppText className="text-xl font-semibold text-[#2c3e6b]">
                                {staff.user.name.charAt(0).toUpperCase()}
                            </AppText>
                        </View>
                    )}
                    <View
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full justify-center items-center border-2 border-white"
                        style={{ backgroundColor: badge.color }}
                    >
                        <Ionicons name={badge.icon} size={16} color="#ffffff" />
                    </View>
                </View>
                <View className="flex-1">
                    <AppText className="text-base font-semibold text-[#1a1a2e]">{staff.user.name}</AppText>
                    <AppText className="text-[13px] text-[#2c3e6b]">{getRoleDisplay()}</AppText>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={BLUE}
                />
            </TouchableOpacity>

            {expanded && (
                <View className="px-4 pb-4 pt-2 border-t border-[#f0f2f8]">
                    {staff.user.phone ? (
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="call-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <AppText className="text-[13px] text-[#6b7280] w-[90px]">Phone:</AppText>
                            <AppText className="text-[13px] text-[#1a1a2e] font-medium flex-1">{staff.user.phone}</AppText>
                        </View>
                    ) : null}
                    {staff.user.email ? (
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="mail-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <AppText className="text-[13px] text-[#6b7280] w-[90px]">Email:</AppText>
                            <AppText className="text-[13px] text-[#1a1a2e] font-medium flex-1" numberOfLines={1}>{staff.user.email}</AppText>
                        </View>
                    ) : null}
                    {staff.years_of_experience != null && (
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="briefcase-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <AppText className="text-[13px] text-[#6b7280] w-[90px]">Experience:</AppText>
                            <AppText className="text-[13px] text-[#1a1a2e] font-medium flex-1">{staff.years_of_experience} years</AppText>
                        </View>
                    )}
                    {staff.designation ? (
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="ribbon-outline" size={16} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                            <AppText className="text-[13px] text-[#6b7280] w-[90px]">Designation:</AppText>
                            <AppText className="text-[13px] text-[#1a1a2e] font-medium flex-1">{staff.designation}</AppText>
                        </View>
                    ) : null}

                    {/* Activate/Deactivate button — only for teachers, not self */}
                    {staff.user.role === 'TEACHER' && !isCurrentUser && (
                        <View className="mt-3">
                            {isUpdating ? (
                                <ActivityIndicator size="small" color={BLUE} />
                            ) : isActive ? (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center bg-[#ef4444] rounded-[10px] py-[10px] px-4 gap-[6px]"
                                    onPress={() => onToggleActive(false)}
                                >
                                    <Ionicons name="close-circle" size={18} color="#ffffff" />
                                    <AppText className="text-white text-sm font-semibold">Deactivate</AppText>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center bg-[#22c55e] rounded-[10px] py-[10px] px-4 gap-[6px]"
                                    onPress={() => onToggleActive(true)}
                                >
                                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                                    <AppText className="text-white text-sm font-semibold">Activate</AppText>
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
    const [toggleConfirmation, setToggleConfirmation] = useState<ToggleConfirmationState | null>(null);

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
            Toast.show({
                type: 'success',
                text2: `The user has been ${statusText} successfully.`,
            });
            queryClient.invalidateQueries({ queryKey: ['school-staffs'] });
            setUpdatingId(null);
        },
        onError: (error: any) => {
            Toast.show({
                type: 'error',
                text2: error?.message || 'Failed to update user status',
            });
            setUpdatingId(null);
        },
    });

    const handleToggleActive = (staff: Staff, active: boolean) => {
        setToggleConfirmation({ staff, active });
    };

    const confirmToggleActive = () => {
        if (!toggleConfirmation) return;
        const { staff, active } = toggleConfirmation;
        setToggleConfirmation(null);
        setUpdatingId(staff.id);
        toggleActiveMutation.mutate({ userId: staff.user.id, isActive: active });
    };

    const schoolName = profile?.school
        ? `${profile.school.registration_code} - ${profile.school.name}`
        : 'Your School';

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Filter to teachers from same-school result, exclude current user, and apply name search
    const filteredStaff = staffList?.filter(staff =>
        staff.user.role === 'TEACHER' &&
        staff.user.id !== currentUser?.id &&
        staff.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8]">
                <ActivityIndicator size="large" color="#2c3e6b" />
                <AppText className="mt-3 text-base text-[#6b7280]">Loading staff...</AppText>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f0f2f8]">
            {/* Header */}
            <View className="bg-[#1565C0] px-4 pb-10 flex-row items-start" style={{ paddingTop: insets.top + 12 }}>
                <View className="flex-1">
                    <AppText className="text-[35px] font-bold text-white mb-1">View Staffs</AppText>
                    <AppText className="text-sm text-white/70">{schoolName}</AppText>
                </View>
            </View>

            {/* Content */}
            <View className="flex-1 bg-white -mt-6 rounded-t-[28px] overflow-hidden">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                >
                    <AppText className="text-lg font-bold text-[#1a1a2e] mb-3">Find your colleagues</AppText>

                    {/* Search Input */}
                    <View className="flex-row items-center bg-[#e8ecf4] rounded-[10px] px-3 mb-3">
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            className="flex-1 py-3 px-2 text-[15px] text-[#1a1a2e]"
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-[10px] mb-4">
                        <View className="flex-1 bg-[#eff6ff] rounded-[10px] py-[10px] items-center">
                            <AppText className="text-xl font-bold text-[#1565C0]">{filteredStaff.length}</AppText>
                            <AppText className="text-[11px] font-medium text-[#3b82f6] mt-[2px]">Total</AppText>
                        </View>
                        <View className="flex-1 bg-[#dcfce7] rounded-[10px] py-[10px] items-center">
                            <AppText className="text-xl font-bold text-[#22c55e]">{filteredStaff.filter(s => s.user.is_active).length}</AppText>
                            <AppText className="text-[11px] font-medium text-[#16a34a] mt-[2px]">Active</AppText>
                        </View>
                        <View className="flex-1 bg-[#fee2e2] rounded-[10px] py-[10px] items-center">
                            <AppText className="text-xl font-bold text-[#ef4444]">{filteredStaff.filter(s => !s.user.is_active).length}</AppText>
                            <AppText className="text-[11px] font-medium text-[#dc2626] mt-[2px]">Inactive</AppText>
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
                        <View className="items-center py-10">
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <AppText className="text-sm text-[#9ca3af] mt-3 text-center">
                                {searchQuery ? 'No staff found matching your search' : 'No staff found'}
                            </AppText>
                        </View>
                    )}
                </ScrollView>
            </View>

            <Modal
                visible={!!toggleConfirmation}
                transparent
                animationType="fade"
                onRequestClose={() => setToggleConfirmation(null)}
            >
                <View className="flex-1 bg-black/40 items-center justify-center px-6">
                    <Pressable className="absolute inset-0" onPress={() => setToggleConfirmation(null)} />

                    <View className="w-full max-w-[360px] bg-white rounded-2xl p-6">
                        <AppText className="text-lg font-bold text-[#1a1a2e] text-center">
                            {toggleConfirmation?.active ? 'Activate User' : 'Deactivate User'}
                        </AppText>
                        <AppText className="text-sm text-gray-500 text-center mt-2">
                            Are you sure you want to {toggleConfirmation?.active ? 'activate' : 'deactivate'}{' '}
                            <AppText className="font-semibold text-[#374151]">
                                {toggleConfirmation?.staff.user.name}
                            </AppText>
                            ?
                        </AppText>

                        <View className="flex-row gap-3 mt-6">
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-[#f3f4f6] items-center"
                                onPress={() => setToggleConfirmation(null)}
                            >
                                <AppText className="text-[15px] font-semibold text-[#374151]">Cancel</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 py-3 rounded-xl items-center ${toggleConfirmation?.active ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                                onPress={confirmToggleActive}
                            >
                                <AppText className="text-[15px] font-semibold text-white">
                                    {toggleConfirmation?.active ? 'Activate' : 'Deactivate'}
                                </AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
