/**
 * NSCBAV Warden View Profile Screen
 *
 * Displays NSCBAV warden profile details:
 * Hostel Location, District, Date of Joining, Qualification,
 * Years of Experience, EBRC, Aadhaar Number, and personal info.
 *
 * Uses NativeWind (className) for styling.
 */

import React from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../../src/lib/store';
import { District } from '../../../src/types';

const BLUE = '#1565C0';

function InfoRow({ icon, label, value, loading = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; loading?: boolean }) {
    return (
        <View className="flex-row items-start gap-3">
            <Ionicons name={icon} size={20} color="#6b7280" />
            <View className="flex-1">
                <AppText className="text-xs text-gray-400 mb-0.5">{label}</AppText>
                {loading ? (
                    <ActivityIndicator size="small" color={BLUE} />
                ) : (
                    <AppText className="text-[15px] font-medium text-gray-900">{value}</AppText>
                )}
            </View>
        </View>
    );
}

function Divider() {
    return <View className="h-[1px] bg-[#f0f2f8] my-3" />;
}

export default function NSCBAVWardenViewProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const districtName = districts.find(d => d.id === user?.district_id)?.name || '-';
    const isActive = user?.is_active ?? false;

    const formatDate = (raw: any): string => {
        if (!raw) return '-';
        if (raw?.toDate) return raw.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const d = new Date(raw);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <AppText className="text-base text-gray-500 mt-3 mb-4">Not authenticated</AppText>
                <TouchableOpacity className="px-6 py-3 rounded-xl" style={{ backgroundColor: BLUE }} onPress={() => router.back()}>
                    <AppText className="text-white text-sm font-semibold">Go Back</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    if (!user.has_completed_profile) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f0f2f8] p-6">
                <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
                <AppText className="text-base text-gray-500 mt-3 mb-4">Profile not completed yet</AppText>
                <TouchableOpacity
                    className="px-6 py-3 rounded-xl"
                    style={{ backgroundColor: BLUE }}
                    onPress={() => router.replace('/(protected)/nscbav-warden/complete-profile')}
                >
                    <AppText className="text-white text-sm font-semibold">Complete Profile</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#eaf0fb]" style={{ paddingTop: insets.top }}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {/* My Profile Heading */}
                <AppText className="text-2xl font-bold text-[#1a1a2e] mb-4">My Profile</AppText>

                {/* Personal Details */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Details</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="person-outline" label="Full Name" value={user.name || '-'} />
                        <Divider />
                        <InfoRow icon="call-outline" label="Phone" value={user.phone || '-'} />
                        <Divider />
                        <InfoRow
                            icon={user.gender === 'MALE' ? 'male' : user.gender === 'FEMALE' ? 'female' : 'person-outline'}
                            label="Gender"
                            value={user.gender === 'MALE' ? 'Male' : user.gender === 'FEMALE' ? 'Female' : 'Not specified'}
                        />
                        {user.email && (
                            <>
                                <Divider />
                                <InfoRow icon="mail-outline" label="Email" value={user.email} />
                            </>
                        )}
                    </View>
                </View>

                {/* NSCBAV Warden Details */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">NSCBAV Warden Details</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="home-outline" label="Hostel Location" value={user.residential_location || '-'} />
                        <Divider />
                        <InfoRow icon="location-outline" label="District" value={districtName} loading={loadingDistricts} />
                        <Divider />
                        <InfoRow icon="calendar-outline" label="Date of Joining" value={formatDate(user.date_of_joining)} />
                        <Divider />
                        <InfoRow icon="school-outline" label="Qualification" value={user.qualification || '-'} />
                        <Divider />
                        <InfoRow icon="time-outline" label="Experience" value={user.years_of_experience != null ? `${user.years_of_experience} years` : '-'} />
                        <Divider />
                        <InfoRow icon="business-outline" label="EBRC" value={user.ebrc || '-'} />
                    </View>
                </View>

                {/* Identity */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Identity</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="card-outline" label="Aadhaar Number" value={user.aadhaar_number || '-'} />
                    </View>
                </View>

                {/* Verified Banner */}
                {isActive && (
                    <View
                        className="rounded-xl py-4 items-center flex-row justify-center gap-2"
                        style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#34d399', backgroundColor: '#ecfdf5' }}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <AppText className="text-[15px] font-semibold text-emerald-500">Your account is verified</AppText>
                    </View>
                )}

                {/* Under Verification Banner */}
                {!isActive && (
                    <View
                        className="rounded-xl py-4 items-center flex-row justify-center gap-2"
                        style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}
                    >
                        <Ionicons name="time-outline" size={24} color={BLUE} />
                        <AppText style={{ color: BLUE }} className="text-[15px] font-semibold">Your account is under verification</AppText>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
