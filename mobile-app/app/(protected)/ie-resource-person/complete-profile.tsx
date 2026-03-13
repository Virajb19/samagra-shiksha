/**
 * IE Resource Person Complete Profile Screen
 * 
 * Form for IE Resource Persons to complete their profile with:
 * - District selection
 * - Qualification
 * - Total years of experience
 * - RCI Number
 * - EBRC
 * - Date of Joining
 * - Aadhaar Number
 * - Read-only personal details
 * 
 * Uses react-hook-form with zod validation.
 */

import React, { useState, useMemo } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
    StatusBar,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/lib/store';
import { useQuery, useMutation } from '@tanstack/react-query';
import { District } from '../../../src/types';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import { completeIEResourcePersonProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IEResourcePersonProfileSchema, IEResourcePersonProfileFormData } from '../../../src/lib/zod';
import CalendarPickerModal from '../../../src/components/CalendarPickerModal';
import SelectModal from '../../../src/components/SelectModal';
import Toast from 'react-native-toast-message';


export default function IECompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();

    // React Hook Form
    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<IEResourcePersonProfileFormData>({
        resolver: zodResolver(IEResourcePersonProfileSchema),
        defaultValues: {
            districtId: '',
            qualification: '',
            yearsOfExperience: '0',
            rciNumber: '',
            ebrc: '',
            dateOfJoining: '',
            aadhaarNumber: '',
        },
    });

    const selectedDistrict = watch('districtId');

    // Modal visibility state
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const dateOfJoining = watch('dateOfJoining');

    // Fetch districts from Firestore
    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    // Get selected district name for display
    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: IEResourcePersonProfileFormData) => {
            if (!user) throw new Error('Not authenticated');
            return completeIEResourcePersonProfile({
                userId: user.id,
                districtId: data.districtId,
                qualification: data.qualification.trim(),
                yearsOfExperience: parseInt(data.yearsOfExperience),
                rciNumber: data.rciNumber.trim(),
                ebrc: data.ebrc.trim(),
                dateOfJoining: data.dateOfJoining.trim(),
                aadhaarNumber: data.aadhaarNumber.trim(),
                currentUser: user,
            });
        },
        onSuccess: async () => {
            await refreshUser();
            Alert.alert('Success', 'Profile completed successfully! Your account is now under verification.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        },
        onError: (error: any) => {
            const message = error.message || 'Failed to complete profile';
            Alert.alert('Error', message);
        },
    });

    const onSubmit = (data: IEResourcePersonProfileFormData) => {
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
        <View className="flex-1 bg-[#2c3e6b]">
            <StatusBar barStyle="light-content" backgroundColor="#2c3e6b" />

            {/* Navy Header */}
            <View className="bg-[#2c3e6b] pb-6 px-5" style={{ paddingTop: Platform.OS === 'ios' ? 20 : 10 }}>
                <View className="flex-row items-center gap-[14px]">
                    <View className="w-[50px] h-[50px] rounded-full overflow-hidden bg-white">
                        <Image
                            source={require('../../../assets/nbse-logo.png')}
                            className="w-[50px] h-[50px]"
                            resizeMode="cover"
                        />
                    </View>
                    <View>
                        <AppText className="text-xl font-bold text-white">Complete Profile</AppText>
                        <AppText className="text-[13px] text-white/70 mt-[2px]">Add your professional details</AppText>
                    </View>
                </View>
            </View>

            {/* White Card */}
            <ScrollView className="flex-1 bg-white rounded-t-[24px]" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <AppText className="text-2xl font-bold text-[#1f2937] mb-2">IE Resource Person Profile</AppText>
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
                            <ActivityIndicator size="small" color="#2c3e6b" />
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
                    }}
                    loading={loadingDistricts}
                />

                {/* Qualification */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">Qualification *</AppText>
                    <Controller
                        control={control}
                        name="qualification"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-[#d1d5db] px-4 py-3 text-base text-[#1f2937]"
                                value={value}
                                onChangeText={onChange}
                                placeholder="e.g., B.Ed, M.Ed, BTECH"
                                placeholderTextColor="#9ca3af"
                            />
                        )}
                    />
                    {errors.qualification && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.qualification.message}</AppText>
                    )}
                </View>

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

                {/* RCI Number */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">RCI Number *</AppText>
                    <Controller
                        control={control}
                        name="rciNumber"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-[#d1d5db] px-4 py-3 text-base text-[#1f2937]"
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter your RCI registration number"
                                placeholderTextColor="#9ca3af"
                            />
                        )}
                    />
                    {errors.rciNumber && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.rciNumber.message}</AppText>
                    )}
                </View>

                {/* Date of Joining */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">Date of Joining *</AppText>
                    <TouchableOpacity
                        className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center"
                        onPress={() => setDatePickerVisible(true)}
                    >
                        <AppText className={dateOfJoining ? 'text-base text-[#1f2937]' : 'text-base text-[#9ca3af]'}>
                            {dateOfJoining || 'Select date'}
                        </AppText>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    {errors.dateOfJoining && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.dateOfJoining.message}</AppText>
                    )}
                </View>

                <CalendarPickerModal
                    visible={datePickerVisible}
                    value={dateOfJoining}
                    onSelect={(v) => setValue('dateOfJoining', v, { shouldValidate: true })}
                    onClose={() => setDatePickerVisible(false)}
                />

                {/* EBRC */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">EBRC *</AppText>
                    <Controller
                        control={control}
                        name="ebrc"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-[#d1d5db] px-4 py-3 text-base text-[#1f2937]"
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter EBRC"
                                placeholderTextColor="#9ca3af"
                            />
                        )}
                    />
                    {errors.ebrc && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.ebrc.message}</AppText>
                    )}
                </View>

                {/* Aadhaar Number */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-[#374151] mb-2">Aadhaar Number *</AppText>
                    <Controller
                        control={control}
                        name="aadhaarNumber"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-[#d1d5db] px-4 py-3 text-base text-[#1f2937]"
                                value={value}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                placeholder="Enter 12-digit Aadhaar number"
                                placeholderTextColor="#9ca3af"
                                maxLength={12}
                            />
                        )}
                    />
                    {errors.aadhaarNumber && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.aadhaarNumber.message}</AppText>
                    )}
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
                    className={`bg-[#2c3e6b] rounded-[10px] py-4 items-center mt-6 ${submitMutation.isPending ? 'bg-[#9ca3af]' : ''}`}
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
