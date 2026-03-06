/**
 * Activity Forms List Screen
 *
 * Shows activity forms relevant to the user's role:
 * - Teachers/Headmasters: ICT, Library, Science Lab, Self Defence, Vocational Education
 * - Wardens (KGBV/NSCBAV): KGBV, NSCBAV
 *
 * Open forms are tappable (green number badge, chevron).
 * Closed forms show a lock icon and "Form is currently closed".
 */

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/lib/store';
import FormBottomBar from '../../src/components/FormBottomBar';
import {
    getTeacherForms,
    getWardenForms,
    type ActivityForm,
} from '../../src/services/firebase/activity-forms.firestore';

const BLUE = '#1565C0';

function formatEndDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `Last Date: ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export default function ActivityFormsScreen() {
    const { user } = useAuthStore();
    const params = useLocalSearchParams<{ schoolName?: string; schoolCode?: string }>();

    const isWarden = user?.role === 'KGBV_WARDEN' || user?.role === 'NSCBAV_WARDEN';

    const { data: forms, isLoading, error, refetch } = useQuery({
        queryKey: ['activity-forms', isWarden ? 'warden' : 'teacher'],
        queryFn: () => (isWarden ? getWardenForms() : getTeacherForms()),
    });

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    useFocusEffect(() => {
        refetch();
    })

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />

            {/* Blue Header */}
            <View style={{ backgroundColor: BLUE, paddingTop: 14, paddingBottom: 24, paddingHorizontal: 18 }}>
                {/* Top — Logo Row */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <Image
                            source={{ uri: 'https://samagrashiksha.nagaland.gov.in/assets/img/logo-removebg.png' }}
                            style={{ width: 40, height: 40, marginRight: 10 }}
                            resizeMode="contain"
                        />
                        <View>
                            <Text className="text-white text-[9px] font-medium opacity-90">समग्र शिक्षा</Text>
                            <Text className="text-white text-[11px] font-bold tracking-wide">SAMAGRA SHIKSHA</Text>
                            <Text className="text-white text-[8px] tracking-wider opacity-80">NAGALAND</Text>
                        </View>
                    </View>
                    <Image
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Emblem_of_Nagaland.svg/200px-Emblem_of_Nagaland.svg.png' }}
                        style={{ width: 42, height: 42 }}
                        resizeMode="contain"
                    />
                </View>

                <Text className="text-white text-[28px] font-extrabold mb-1">Activities Forms</Text>
                {params.schoolCode && (
                    <Text className="text-white text-xs opacity-90 font-medium">
                        {params.schoolCode}{params.schoolName ? ` - ${params.schoolName}` : ''}
                    </Text>
                )}
            </View>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => router.back()}
                style={{ position: 'absolute', top: 16, left: 14, zIndex: 10, padding: 4 }}
            >
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            {/* Forms List */}
            <ScrollView
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} tintColor={BLUE} />
                }
            >
                {isLoading ? (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator size="large" color={BLUE} />
                        <Text className="text-gray-500 mt-3 text-sm">Loading forms...</Text>
                    </View>
                ) : error ? (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                        <Text className="text-red-500 mt-3 text-sm">Failed to load forms</Text>
                    </View>
                ) : !forms?.length ? (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                        <Text className="text-gray-400 mt-3 text-sm">No forms available</Text>
                    </View>
                ) : (
                    forms.map((form, index) => (
                        <FormCard key={form.id} form={form} index={index + 1} />
                    ))
                )}
            </ScrollView>
            <FormBottomBar />
        </View>
    );
}

function FormCard({ form, index }: { form: ActivityForm; index: number }) {
    const isActive = form.status === 'Active';

    return (
        <TouchableOpacity
            activeOpacity={isActive ? 0.7 : 1}
            onPress={() => {
                if (!isActive) return;
                if (form.name === 'ICT') {
                    router.push('/(protected)/ict-form' as any);
                } else if (form.name === 'Library') {
                    router.push('/(protected)/library-form' as any);
                } else if (form.name === 'Science Lab') {
                    router.push('/(protected)/science-lab-form' as any);
                } else if (form.name === 'Self Defence') {
                    router.push('/(protected)/self-defense-form' as any);
                } else if (form.name === 'KGBV') {
                    router.push('/(protected)/kgbv-form' as any);
                } else if (form.name === 'NSCBAV') {
                    router.push('/(protected)/nscbav-form' as any);
                }
            }}
            className="bg-white rounded-2xl mb-3 px-4 py-4 flex-row items-center"
            style={{
                elevation: isActive ? 3 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: isActive ? 2 : 1 },
                shadowOpacity: isActive ? 0.12 : 0.06,
                shadowRadius: isActive ? 6 : 3,
                borderWidth: isActive ? 0 : 0.5,
                borderColor: isActive ? 'transparent' : '#e5e7eb',
            }}
        >
            {/* Number Badge */}
            <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{
                    backgroundColor: isActive ? '#22c55e' : form.status === 'Inactive' ? '#f59e0b' : '#e5e7eb',
                }}
            >
                <Text
                    className="font-extrabold text-lg"
                    style={{ color: isActive || form.status === 'Inactive' ? '#fff' : '#9ca3af' }}
                >
                    {index}
                </Text>
            </View>

            {/* Form Info */}
            <View className="flex-1">
                <Text
                    className="text-base font-bold mb-0.5"
                    style={{ color: isActive ? '#111827' : '#6b7280' }}
                >
                    {form.name}
                </Text>
                <Text
                    className="text-xs"
                    style={{ color: isActive ? '#6b7280' : '#9ca3af' }}
                >
                    {isActive
                        ? formatEndDate(form.ending_date)
                        : form.status === 'Inactive'
                            ? 'Form is scheduled — not yet active'
                            : 'Form is currently closed'}
                </Text>
            </View>

            {/* Right Icon */}
            {isActive ? (
                <Ionicons name="chevron-forward" size={22} color="#22c55e" />
            ) : (
                <View
                    className="w-9 h-9 rounded-lg items-center justify-center"
                    style={{ backgroundColor: '#f3f4f6' }}
                >
                    <Ionicons name="lock-closed" size={18} color="#9ca3af" />
                </View>
            )}
        </TouchableOpacity>
    );
}
