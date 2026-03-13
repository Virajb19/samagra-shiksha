/**
 * Junior Engineer Complete Profile Screen
 * 
 * Form for Junior Engineers to complete their profile with:
 * - District
 * - Total Years of Experience
 * - EBRC
 * - Read-only personal details
 * 
 * Uses react-hook-form with zod validation.
 * No responsibilities field for Junior Engineers.
 * Styled with NativeWind (className).
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
import { completeJuniorEngineerProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { JuniorEngineerProfileSchema, JuniorEngineerProfileFormData } from '../../../src/lib/zod';
import SelectModal from '../../../src/components/SelectModal';
import Toast from 'react-native-toast-message';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';

const BLUE = '#1565C0';

export default function JuniorEngineerCompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();
    const isActive = user?.is_active ?? false;

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<JuniorEngineerProfileFormData>({
        resolver: zodResolver(JuniorEngineerProfileSchema),
        defaultValues: {
            districtId: '',
            yearsOfExperience: '0',
            ebrc: '',
        },
    });

    const selectedDistrict = watch('districtId');
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';

    const submitMutation = useMutation({
        mutationFn: async (data: JuniorEngineerProfileFormData) => {
            if (!user) throw new Error('Not authenticated');
            return completeJuniorEngineerProfile({
                userId: user.id,
                districtId: data.districtId,
                yearsOfExperience: parseInt(data.yearsOfExperience),
                ebrc: data.ebrc.trim(),
                currentUser: user,
            });
        },
        onSuccess: async () => {
            await refreshUser();
            setShowSuccessModal(true);
        },
        onError: (error: any) => {
            Toast.show({
                type: 'error',
                text2: error.message || 'Failed to complete profile',
            })
        },
    });

    const onSubmit = (data: JuniorEngineerProfileFormData) => {
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
        <View className="flex-1" style={{ backgroundColor: BLUE }}>
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />

            {/* Navy Header */}
            <View className="px-5 pb-6" style={{ paddingTop: Platform.OS === 'ios' ? 20 : 10, backgroundColor: BLUE }}>
                <View className="flex-row items-center gap-3.5">
                    <View>
                        <AppText className="text-xl font-bold text-white">Complete Profile</AppText>
                        <AppText className="text-[14px] text-white/70 mt-0.5">Junior Engineer Details</AppText>
                    </View>
                </View>
            </View>

            {/* White Card */}
            <ScrollView className="flex-1 bg-white rounded-t-3xl" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <AppText className="text-2xl font-bold text-gray-900 mb-2">Add Experience</AppText>
                <AppText className="text-sm text-gray-500 mb-6">
                    Please make sure all the required fields are properly filled.
                </AppText>

                {/* Warning Banner */}
                <View className="bg-[#fff3cd] border border-[#ffc107] rounded-lg p-3 flex-row items-start mb-5 gap-2">
                    <Image source={require('../../../assets/warning.png')} className="w-5 h-5 mt-0.5" resizeMode="contain" />
                    <AppText className="flex-1 text-[13px] text-[#856404] leading-[18px]">
                        <AppText weight="bold" className="text-[13px] text-[#856404]">Important:</AppText> You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
                    </AppText>
                </View>

                {/* District */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-700 mb-2">District *</AppText>
                    {loadingDistricts ? (
                        <View className="bg-white rounded-lg border border-gray-300 px-4 py-3.5 flex-row justify-between items-center">
                            <ActivityIndicator size="small" color="#2c3e6b" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            className="bg-white rounded-lg border border-gray-300 px-4 py-3.5 flex-row justify-between items-center"
                            onPress={() => setDistrictModalVisible(true)}
                        >
                            <AppText className={selectedDistrict ? 'text-base text-gray-900' : 'text-base text-gray-400'}>
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
                    onSelect={(value) => setValue('districtId', value, { shouldValidate: true })}
                    loading={loadingDistricts}
                />

                {/* Years of Experience */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-700 mb-2">Total Years of Experience *</AppText>
                    <Controller
                        control={control}
                        name="yearsOfExperience"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900"
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

                {/* EBRC */}
                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-700 mb-2">EBRC *</AppText>
                    <Controller
                        control={control}
                        name="ebrc"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className="bg-white rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900"
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter EBRC name"
                            />
                        )}
                    />
                    {errors.ebrc && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.ebrc.message}</AppText>
                    )}
                </View>

                {/* Divider */}
                <View className="h-px bg-gray-200 my-6" />

                {/* Personal Details (Read-only) */}
                <AppText className="text-lg font-bold text-gray-900 mb-1">Personal Details</AppText>
                <AppText className="text-xs text-gray-500 mb-5">
                    To update Personal Details, go to Settings {'>'} Edit Profile
                </AppText>

                <View className="mb-5">
                    <AppText className="text-sm font-semibold text-gray-700 mb-2">Full Name</AppText>
                    <View className="bg-gray-100 rounded-lg border border-gray-200 px-4 py-3">
                        <AppText className="text-base text-gray-500">{user?.name || ''}</AppText>
                    </View>
                </View>

                <View className="flex-row">
                    <View className="flex-1 mr-2 mb-5">
                        <AppText className="text-sm font-semibold text-gray-700 mb-2">Gender</AppText>
                        <View className="bg-gray-100 rounded-lg border border-gray-200 px-4 py-3">
                            <AppText className="text-base text-gray-500">
                                {user?.gender === 'MALE' ? 'Male' : user?.gender === 'FEMALE' ? 'Female' : '-'}
                            </AppText>
                        </View>
                    </View>
                    <View className="flex-1 ml-2 mb-5">
                        <AppText className="text-sm font-semibold text-gray-700 mb-2">Phone Number</AppText>
                        <View className="bg-gray-100 rounded-lg border border-gray-200 px-4 py-3">
                            <AppText className="text-base text-gray-500">{user?.phone || ''}</AppText>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className="rounded-[10px] py-4 items-center mt-6"
                    style={{ backgroundColor: submitMutation.isPending ? '#9ca3af' : BLUE }}
                    onPress={handleSubmit(onSubmit, onFormError)}
                    disabled={submitMutation.isPending}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <AppText className="text-base font-semibold text-white">Submit</AppText>
                    )}
                </TouchableOpacity>

                {/* Verified Banner */}
                {isActive && (
                    <View
                        className="rounded-xl py-4 items-center flex-row justify-center gap-2 mt-3"
                        style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#34d399', backgroundColor: '#ecfdf5' }}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <AppText className="text-[15px] font-semibold text-emerald-500">Your account is verified</AppText>
                    </View>
                )}
            </ScrollView>

            <ProfileCompletionModal
                visible={showSuccessModal}
                onContinue={() => {
                    setShowSuccessModal(false);
                    router.back();
                }}
            />
        </View>
    );
}
