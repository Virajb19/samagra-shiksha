/**
 * Teacher Complete Profile Screen
 * 
 * Form for teachers to complete their profile with:
 * - District selection
 * - School selection
 * - Total years of experience
 * - Role Assigned (responsibilities checkboxes)
 * - Read-only personal details
 * 
 * Uses react-hook-form with zod validation.
 */

import React, { useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/lib/store';
import { useQuery, useMutation } from '@tanstack/react-query';
import { District, School, RESPONSIBILITY_OPTIONS } from '../../../src/types';
import { getDistricts, getSchools } from '../../../src/services/firebase/master-data.firestore';
import { completeHMTeacherProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HMTeacherProfileSchema, HMTeacherProfileFormData } from '../../../src/lib/zod';
import SelectModal from '../../../src/components/SelectModal';
import Toast from 'react-native-toast-message';


export default function CompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();

    // React Hook Form
    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<HMTeacherProfileFormData>({
        resolver: zodResolver(HMTeacherProfileSchema),
        defaultValues: {
            districtId: '',
            schoolId: '',
            yearsOfExperience: '0',
            responsibilities: [],
        },
    });

    const selectedDistrict = watch('districtId');
    const selectedSchool = watch('schoolId');
    const selectedResponsibilities = watch('responsibilities');

    // Modal visibility state
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [schoolModalVisible, setSchoolModalVisible] = useState(false);

    // Fetch districts from Firestore
    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    // Fetch schools based on selected district from Firestore
    const { data: schools = [], isLoading: loadingSchools } = useQuery<School[]>({
        queryKey: ['schools', selectedDistrict],
        queryFn: () => getSchools(selectedDistrict),
        enabled: !!selectedDistrict,
    });

    // Get selected district and school names for display
    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';
    const selectedSchoolName = schools.find(s => s.id === selectedSchool)?.name || '';

    // Toggle a responsibility selection
    const toggleResponsibility = (item: string) => {
        const current = selectedResponsibilities || [];
        const updated = current.includes(item)
            ? current.filter(r => r !== item)
            : [...current, item];
        setValue('responsibilities', updated);
    };

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: HMTeacherProfileFormData) => {
            if (!user) throw new Error('Not authenticated');
            return completeHMTeacherProfile({
                userId: user.id,
                schoolId: data.schoolId,
                yearsOfExperience: parseInt(data.yearsOfExperience),
                responsibilities: data.responsibilities,
                role: 'TEACHER',
                currentUser: user,
            });
        },
        onSuccess: async () => {
            await refreshUser();
            Alert.alert('Success', 'Profile completed successfully! Your account is now under verification.', [
                { text: 'OK', onPress: () => router.replace('/(protected)/teacher/(tabs)/home') },
            ]);
        },
        onError: (error: any) => {
            const message = error.message || 'Failed to complete profile';
            Alert.alert('Error', message);
        },
    });

    const onSubmit = (data: HMTeacherProfileFormData) => {
        submitMutation.mutate(data);
    };

    const onFormError = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        Toast.show({
            type: 'error',
            text2: firstError?.message || 'Please complete all required fields.',
            visibilityTime: 3000,
        });
    };

    return (
        <View className="flex-1 bg-[#1565C0]">
            <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

            {/* Navy Header */}
            <View className="bg-[#1565C0] pb-6 px-5" style={{ paddingTop: Platform.OS === 'ios' ? 20 : 10 }}>
                <View>
                    <View>
                        <AppText className="text-xl font-bold text-white">Complete Profile</AppText>
                        <AppText className="text-[14px] text-white/70 mt-[2px]">Add your experience details</AppText>
                    </View>
                </View>
            </View>

            {/* White Card */}
            <ScrollView className="flex-1 bg-white rounded-t-[24px]" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <AppText className="text-2xl font-bold text-[#1f2937] mb-2">Add Experience</AppText>
                <AppText className="text-sm text-[#6b7280] mb-6">
                    Please make sure all the required fields are properly filled.
                </AppText>

                {/* Warning Banner */}
                <View className="bg-[#fff3cd] border border-[#ffc107] rounded-lg p-3 flex-row items-start mb-5 gap-2">
                    <Ionicons name="warning" size={20} color="#856404" />
                    <AppText className="flex-1 text-[13px] text-[#856404] leading-[18px]">
                        Important: You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
                    </AppText>
                </View>

                {/* District Select */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">District *</AppText>
                    {loadingDistricts ? (
                        <View className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center">
                            <ActivityIndicator size="small" color="#1565C0" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center"
                            onPress={() => setDistrictModalVisible(true)}
                        >
                            <AppText className={selectedDistrict ? 'text-base text-[#1f2937]' : 'text-base text-[#9ca3af]'}>
                                {selectedDistrictName || 'Select District'}
                            </AppText>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.districtId && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.districtId.message}</AppText>
                    )}
                </View>

                <SelectModal
                    visible={districtModalVisible}
                    onClose={() => setDistrictModalVisible(false)}
                    title="Select District"
                    data={districts}
                    selectedValue={selectedDistrict}
                    onSelect={(value) => {
                        setValue('districtId', value, { shouldValidate: true });
                        setValue('schoolId', '');
                    }}
                    loading={loadingDistricts}
                />

                {/* School Select */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">School (Currently Employed In) *</AppText>
                    {loadingSchools && selectedDistrict ? (
                        <View className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center">
                            <ActivityIndicator size="small" color="#1565C0" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            className={`bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center ${!selectedDistrict ? 'bg-[#f3f4f6]' : ''}`}
                            onPress={() => selectedDistrict && setSchoolModalVisible(true)}
                            disabled={!selectedDistrict}
                        >
                            <AppText className={selectedSchool ? 'text-base text-[#1f2937]' : 'text-base text-[#9ca3af]'}>
                                {selectedSchoolName || (selectedDistrict ? 'Select School' : 'Select District First')}
                            </AppText>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.schoolId && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.schoolId.message}</AppText>
                    )}
                </View>

                <SelectModal
                    visible={schoolModalVisible}
                    onClose={() => setSchoolModalVisible(false)}
                    title="Select School"
                    data={schools}
                    selectedValue={selectedSchool}
                    onSelect={(value) => setValue('schoolId', value, { shouldValidate: true })}
                    loading={loadingSchools}
                />

                {/* Years of Experience */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">Total Years of Experience *</AppText>
                    <Controller
                        control={control}
                        name="yearsOfExperience"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-[#d1d5db] px-4 py-3 text-base text-[#1f2937]"
                                value={value}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                        )}
                    />
                    {errors.yearsOfExperience && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.yearsOfExperience.message}</AppText>
                    )}
                </View>

                {/* Role Assigned (Responsibilities) */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">Role Assigned</AppText>
                    <View className="mt-1">
                        {RESPONSIBILITY_OPTIONS.map((item) => {
                            const isSelected = (selectedResponsibilities || []).includes(item);
                            return (
                                <TouchableOpacity
                                    key={item}
                                    className="flex-row items-center py-[10px] gap-3"
                                    onPress={() => toggleResponsibility(item)}
                                    activeOpacity={0.7}
                                >
                                    <View className={`w-[22px] h-[22px] rounded border-2 border-[#d1d5db] items-center justify-center ${isSelected ? 'bg-[#1565C0] border-[#1565C0]' : ''}`}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                    <AppText className="text-[15px] text-[#374151]">{item}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-[#e5e7eb] my-6" />

                {/* Personal Details (Read-only) */}
                <AppText className="text-lg font-bold text-[#1f2937] mb-1">Personal Details</AppText>
                <AppText className="text-xs text-[#6b7280] mb-5">
                    To update Personal Details, go to Settings {'>'} Edit Profile
                </AppText>

                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">Full Name</AppText>
                    <View className="bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] px-4 py-3">
                        <AppText className="text-base text-[#6b7280]">{user?.name || ''}</AppText>
                    </View>
                </View>

                <View className="flex-row">
                    <View className="mb-5 flex-1 mr-2">
                        <AppText className="text-sm font-semibold text-[#374151] mb-2">Gender</AppText>
                        <View className="bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] px-4 py-3">
                            <AppText className="text-base text-[#6b7280]">
                                {user?.gender === 'MALE' ? 'Male' : user?.gender === 'FEMALE' ? 'Female' : '-'}
                            </AppText>
                        </View>
                    </View>
                    <View className="mb-5 flex-1 ml-2">
                        <AppText className="text-sm font-semibold text-[#374151] mb-2">Phone Number</AppText>
                        <View className="bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] px-4 py-3">
                            <AppText className="text-base text-[#6b7280]">{user?.phone || ''}</AppText>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className={`bg-[#1565C0] rounded-[10px] py-4 items-center mt-6 ${submitMutation.isPending ? 'bg-[#9ca3af]' : ''}`}
                    onPress={handleSubmit(onSubmit, onFormError)}
                    disabled={submitMutation.isPending}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <AppText className="text-base font-semibold text-white">Submit</AppText>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
