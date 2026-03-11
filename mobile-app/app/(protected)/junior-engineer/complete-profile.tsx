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
    Modal,
    FlatList,
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
import Toast from 'react-native-toast-message';

interface SelectModalProps {
    visible: boolean;
    title: string;
    data: { id: string; name: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
    loading?: boolean;
}

function SelectModal({ visible, title, data, selectedValue, onSelect, onClose, loading }: SelectModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-[20px] max-h-[70%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                        <AppText className="text-lg font-semibold text-gray-900">{title}</AppText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#2c3e6b" style={{ padding: 40 }} />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className={`flex-row justify-between items-center py-3.5 px-4 border-b border-gray-50 ${selectedValue === item.id ? 'bg-[#e8ecf4]' : ''}`}
                                    onPress={() => { onSelect(item.id); onClose(); }}
                                >
                                    <AppText className={`text-base ${selectedValue === item.id ? 'text-[#2c3e6b] font-semibold' : 'text-gray-700'}`}>
                                        {item.name}
                                    </AppText>
                                    {selectedValue === item.id && <Ionicons name="checkmark" size={20} color="#2c3e6b" />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<AppText className="text-center p-5 text-gray-500 text-sm">No items available</AppText>}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

export default function JuniorEngineerCompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();

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
            Alert.alert('Success', 'Profile completed successfully! Your account is now under verification.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to complete profile');
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
        <View className="flex-1 bg-[#2c3e6b]">
            <StatusBar barStyle="light-content" backgroundColor="#2c3e6b" />

            {/* Navy Header */}
            <View className="bg-[#2c3e6b] px-5 pb-6" style={{ paddingTop: Platform.OS === 'ios' ? 20 : 10 }}>
                <View className="flex-row items-center gap-3.5">
                    <View className="w-[50px] h-[50px] rounded-full overflow-hidden bg-white">
                        <Image
                            source={require('../../../assets/nbse-logo.png')}
                            className="w-[50px] h-[50px]"
                            resizeMode="cover"
                        />
                    </View>
                    <View>
                        <AppText className="text-xl font-bold text-white">Complete Profile</AppText>
                        <AppText className="text-[13px] text-white/70 mt-0.5">Junior Engineer Details</AppText>
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
                    <Ionicons name="warning" size={20} color="#856404" />
                    <AppText className="flex-1 text-[13px] text-[#856404] leading-[18px]">
                        Important: You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
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
                    className={`rounded-[10px] py-4 items-center mt-6 ${submitMutation.isPending ? 'bg-gray-400' : 'bg-[#2c3e6b]'}`}
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
