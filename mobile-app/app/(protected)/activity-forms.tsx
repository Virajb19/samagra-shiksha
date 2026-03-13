/**
 * Activity Forms List Screen
 *
 * Shows activity forms relevant to the user's role:
 * - Teachers/Headmasters: ICT, Library, Science Lab, Self Defence, Vocational Education
 * - Wardens (KGBV/NSCBAV): KGBV, NSCBAV
 * - IE Resource Person: School Visit, Home Visit
 *
 * Open forms are tappable (green number badge, chevron).
 * Closed forms show a lock icon and "Form is currently closed".
 */

import React, { useCallback, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/lib/store';
import {
    getTeacherForms,
    getWardenForms,
    type ActivityForm,
} from '../../src/services/firebase/activity-forms.firestore';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';

const BLUE = '#1565C0';
const IE_RESOURCE_PERSON_FORMS: ActivityForm[] = [
    { id: 'ie-school-visit', name: 'School Visit', status: 'Active', starting_date: null, ending_date: null },
    { id: 'ie-home-visit', name: 'Home Visit', status: 'Active', starting_date: null, ending_date: null },
];

function formatEndDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `Last Date: ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export default function ActivityFormsScreen() {
    const { user } = useAuthStore();
    const params = useLocalSearchParams<{ schoolName?: string; schoolCode?: string }>();

    const isWarden = user?.role === 'KGBV_WARDEN' || user?.role === 'NSCBAV_WARDEN';
    const isHeadmaster = user?.role === 'HEADMASTER';
    const isIEResourcePerson = user?.role === 'IE_RESOURCE_PERSON';

    const [blockedFormName, setBlockedFormName] = useState<string | null>(null);

    const { data: forms, isLoading, error, refetch } = useQuery<ActivityForm[]>({
        queryKey: ['activity-forms', isWarden ? 'warden' : isIEResourcePerson ? 'ie' : 'teacher'],
        queryFn: () => (isWarden ? getWardenForms() : getTeacherForms()),
        enabled: !isIEResourcePerson,
    });

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (!isIEResourcePerson) {
            await refetch();
        }
        setRefreshing(false);
    }, [isIEResourcePerson, refetch]);

    useFocusEffect(useCallback(() => {
        if (!isIEResourcePerson) {
            refetch();
        }
    }, [isIEResourcePerson, refetch]));

    const displayForms = isIEResourcePerson ? IE_RESOURCE_PERSON_FORMS : (forms ?? []);
    const showLoading = !isIEResourcePerson && isLoading;
    const showError = !isIEResourcePerson && !!error;

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

            {params.schoolCode && (
                <View className="px-4 py-2 bg-[#e8f4fd]">
                    <AppText className="text-sm text-[#1565C0] font-medium">
                        {params.schoolCode}{params.schoolName ? ` - ${params.schoolName}` : ''}
                    </AppText>
                </View>
            )}

            {/* Forms List */}
            <ScrollView
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} tintColor={BLUE} />
                }
            >
                <AppText className="text-2xl font-bold text-[#111827] mb-4">Forms</AppText>

                {showLoading ? (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator size="large" color={BLUE} />
                        <AppText className="text-gray-500 mt-3 text-base">Loading forms...</AppText>
                    </View>
                ) : showError ? (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                        <AppText className="text-red-500 mt-3 text-base">Failed to load forms</AppText>
                    </View>
                ) : !displayForms.length ? (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                        <AppText className="text-gray-400 mt-3 text-base">No forms available</AppText>
                    </View>
                ) : (
                    displayForms.map((form, index) => (
                        <FormCard
                            key={form.id}
                            form={form}
                            index={index + 1}
                            isHeadmaster={isHeadmaster}
                            isIEResourcePerson={isIEResourcePerson}
                            onBlocked={(name) => setBlockedFormName(name)}
                        />
                    ))
                )}
            </ScrollView>

            {/* Headmaster blocked modal */}
            <NotAuthorizedDialog
                visible={!!blockedFormName}
                onClose={() => setBlockedFormName(null)}
                formName={blockedFormName ?? ''}
                message={`As a Headmaster, you are not required to fill the ${blockedFormName} form. Only Teachers, Wardens, and IE Resource Persons can submit forms.`}
            />
        </View>
    );
}

function FormCard({
    form,
    index,
    isHeadmaster,
    isIEResourcePerson,
    onBlocked,
}: {
    form: ActivityForm;
    index: number;
    isHeadmaster: boolean;
    isIEResourcePerson: boolean;
    onBlocked: (name: string) => void;
}) {
    const isActive = form.status === 'Active';

    return (
        <TouchableOpacity
            activeOpacity={isActive ? 0.7 : 1}
            onPress={() => {
                if (!isActive) return;
                if (isHeadmaster) {
                    onBlocked(form.name);
                    return;
                }
                if (isIEResourcePerson) {
                    if (form.name === 'School Visit') {
                        router.push('/(protected)/ie-resource-person/school-visit-form' as any);
                    } else if (form.name === 'Home Visit') {
                        router.push('/(protected)/ie-resource-person/home-visit-form' as any);
                    }
                    return;
                }
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
                } else if (form.name === 'Vocational Education') {
                    router.push('/(protected)/vocational-education-form' as any);
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
                <AppText
                    className="font-extrabold text-xl"
                    style={{ color: isActive || form.status === 'Inactive' ? '#fff' : '#9ca3af' }}
                >
                    {index}
                </AppText>
            </View>

            {/* Form Info */}
            <View className="flex-1">
                <AppText
                    className="text-lg font-bold mb-0.5"
                    style={{ color: isActive ? '#111827' : '#6b7280' }}
                >
                    {form.name}
                </AppText>
                <AppText
                    className="text-sm"
                    style={{ color: isActive ? '#6b7280' : '#9ca3af' }}
                >
                    {isIEResourcePerson
                        ? form.name === 'School Visit'
                            ? 'Submit school visit details'
                            : 'Submit home visit details'
                        : isActive
                            ? formatEndDate(form.ending_date)
                        : form.status === 'Inactive'
                            ? 'Form is scheduled — not yet active'
                            : 'Form is currently closed'}
                </AppText>
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
