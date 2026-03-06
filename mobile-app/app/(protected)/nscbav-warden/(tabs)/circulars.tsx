/**
 * NSCBAV Warden Circulars Tab Screen — 3-state access model.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { getCirculars } from '../../../../src/services/firebase/content.firestore';

const BLUE = '#1565C0';

export default function CircularsTabScreen() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const { data: profileStatus } = useQuery({ queryKey: ['profile-status', user?.id], queryFn: async () => getProfileStatus(user!.id), enabled: !!user?.id });
    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;
    const canAccess = hasCompletedProfile && isActive;
    const { data: circulars, isLoading, refetch, isRefetching } = useQuery<any[]>({ queryKey: ['circulars'], queryFn: getCirculars, enabled: canAccess });

    // Refetch circulars when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    if (!canAccess) {
        return (
            <View className="flex-1 bg-[#f0f4f8] justify-center items-center px-6">
                <View className="rounded-2xl py-6 px-4 items-center w-full" style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#e8f4fd' }}>
                    <Ionicons name={!hasCompletedProfile ? 'person-circle-outline' : 'time-outline'} size={48} color={BLUE} />
                    <Text style={{ color: BLUE, fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>{!hasCompletedProfile ? 'Kindly complete your profile' : 'Your account is under verification'}</Text>
                </View>
            </View>
        );
    }

    const filteredCirculars = circulars?.filter((c: any) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || c.circular_no?.toLowerCase().includes(searchQuery.toLowerCase())) || [];

    return (
        <ScrollView className="flex-1 bg-[#f0f4f8]" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
            <View className="flex-row items-center bg-white rounded-xl px-3 mb-4" style={{ elevation: 1 }}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput className="flex-1 py-3 px-2 text-[15px] text-gray-900" placeholder="Search circulars..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            {isLoading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} /> : filteredCirculars.length === 0 ? (
                <View className="items-center mt-10"><Ionicons name="document-text-outline" size={48} color="#d1d5db" /><Text className="text-gray-400 mt-3">No circulars found</Text></View>
            ) : filteredCirculars.map((c: any) => (
                <View key={c.id} className="bg-white rounded-xl p-4 mb-3" style={{ elevation: 1 }}>
                    <View className="bg-blue-100 px-2 py-0.5 rounded self-start"><Text className="text-xs font-semibold text-blue-700">{c.circular_no}</Text></View>
                    <Text className="text-base font-semibold text-gray-900 mt-1">{c.title}</Text>
                    {c.description && <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>{c.description}</Text>}
                    {c.file_url && <TouchableOpacity className="flex-row items-center mt-2" onPress={() => Linking.openURL(c.file_url)}><Ionicons name="download-outline" size={16} color={BLUE} /><Text style={{ color: BLUE, fontSize: 13, marginLeft: 4, fontWeight: '500' }}>Download</Text></TouchableOpacity>}
                </View>
            ))}
        </ScrollView>
    );
}
