/**
 * IE Resource Person View Profile Screen
 * 
 * Displays the IE Resource Person's profile information including
 * district, qualification, RCI number, EBRC, experience,
 * date of joining, and Aadhaar number.
 * 
 * Uses NativeWind (className) for styling.
 */

import React from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
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

export default function IEViewProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const districtName = districts.find(d => d.id === user?.district_id)?.name || '-';

    const formatDateOfJoining = (doj: string | undefined) => {
        if (!doj) return '-';
        try {
            const date = new Date(doj);
            return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return doj;
        }
    };

    const formatAadhaar = (aadhaar: string | undefined) => {
        if (!aadhaar) return '-';
        if (aadhaar.length === 12) return `XXXX XXXX ${aadhaar.slice(8)}`;
        return aadhaar;
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
                    onPress={() => router.replace('/(protected)/ie-resource-person/complete-profile')}
                >
                    <AppText className="text-white text-sm font-semibold">Complete Profile</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f0f2f8]">
            {/* Blue Profile Header — same as Home */}
            <View
                style={{ backgroundColor: BLUE, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingTop: insets.top + 12 }}
                className="px-5 pb-7"
            >
                {/* Back Button */}
                <TouchableOpacity className="p-1 mb-3 self-start" onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <View className="mr-4">
                        {user.profile_image_url ? (
                            <Image
                                source={{ uri: user.profile_image_url }}
                                className="w-20 h-20 rounded-full"
                                style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' }}
                            />
                        ) : (
                            <View
                                className="w-20 h-20 rounded-full justify-center items-center"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' }}
                            >
                                <Ionicons name="person" size={38} color="rgba(255,255,255,0.8)" />
                            </View>
                        )}
                    </View>
                    <View className="flex-1">
                        <AppText className="text-white text-2xl font-bold mb-1" numberOfLines={1}>{user.name || 'User'}</AppText>
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.8)" />
                            <AppText className="text-sm ml-1 flex-1" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>{user.email || 'No email'}</AppText>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                            <AppText className="text-white text-xs font-semibold">IE Resource Person</AppText>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {/* Personal Details */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Details</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="call-outline" label="Phone Number" value={user.phone || '-'} />
                        <Divider />
                        <InfoRow
                            icon={user.gender === 'MALE' ? 'male' : user.gender === 'FEMALE' ? 'female' : 'person-outline'}
                            label="Gender"
                            value={user.gender === 'MALE' ? 'Male' : user.gender === 'FEMALE' ? 'Female' : 'Not specified'}
                        />
                    </View>
                </View>

                {/* Professional Details */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Professional Details</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="location-outline" label="District" value={districtName} loading={loadingDistricts} />
                        <Divider />
                        <InfoRow icon="school-outline" label="Qualification" value={user.qualification || '-'} />
                        <Divider />
                        <InfoRow icon="card-outline" label="RCI Number" value={user.rci_number || '-'} />
                        <Divider />
                        <InfoRow icon="business-outline" label="EBRC" value={user.ebrc || '-'} />
                        <Divider />
                        <InfoRow icon="time-outline" label="Years of Experience" value={user.years_of_experience != null ? `${user.years_of_experience} years` : '-'} />
                        <Divider />
                        <InfoRow icon="calendar-outline" label="Date of Joining" value={formatDateOfJoining(user.date_of_joining)} />
                    </View>
                </View>

                {/* Identity */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Identity</AppText>
                    <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 }}>
                        <InfoRow icon="finger-print-outline" label="Aadhaar Number" value={formatAadhaar(user.aadhaar_number)} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
