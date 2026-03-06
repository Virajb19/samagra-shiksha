/**
 * IE Resource Person Complete Profile Screen
 * 
 * Form for IE Resource Persons to complete their profile with:
 * - District selection
 * - Qualification
 * - Total years of experience
 * - RCI Number
 * - EBRC
 * - Read-only personal details
 * 
 * Uses react-hook-form with zod validation.
 */

import React, { useState } from 'react';
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
import { completeIEResourcePersonProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IEResourcePersonProfileSchema, IEResourcePersonProfileFormData } from '../../../src/lib/zod';
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
                    <View className="flex-row justify-between items-center p-4 border-b border-[#e5e7eb]">
                        <Text className="text-lg font-semibold text-[#1f2937]">{title}</Text>
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
                                    className={`py-[14px] px-4 border-b border-[#f3f4f6] flex-row justify-between items-center ${selectedValue === item.id ? 'bg-[#e8ecf4]' : ''}`}
                                    onPress={() => {
                                        onSelect(item.id);
                                        onClose();
                                    }}
                                >
                                    <Text className={`text-base text-[#374151] ${selectedValue === item.id ? 'text-[#2c3e6b] font-semibold' : ''}`}>
                                        {item.name}
                                    </Text>
                                    {selectedValue === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#2c3e6b" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text className="text-center p-5 text-[#6b7280] text-sm">No items available</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

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
        },
    });

    const selectedDistrict = watch('districtId');

    // Modal visibility state
    const [districtModalVisible, setDistrictModalVisible] = useState(false);

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
                        <Text className="text-xl font-bold text-white">Complete Profile</Text>
                        <Text className="text-[13px] text-white/70 mt-[2px]">Add your professional details</Text>
                    </View>
                </View>
            </View>

            {/* White Card */}
            <ScrollView className="flex-1 bg-white rounded-t-[24px]" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <Text className="text-2xl font-bold text-[#1f2937] mb-2">IE Resource Person Profile</Text>
                <Text className="text-sm text-[#6b7280] mb-6">
                    Please make sure all the required fields are properly filled.
                </Text>

                {/* Warning Banner */}
                <View className="bg-[#fff3cd] border border-[#ffc107] rounded-lg p-3 flex-row items-start mb-5 gap-2">
                    <Ionicons name="warning" size={20} color="#856404" />
                    <Text className="flex-1 text-[13px] text-[#856404] leading-[18px]">
                        Important: You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
                    </Text>
                </View>

                {/* District Select */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">District *</Text>
                    {loadingDistricts ? (
                        <View className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center">
                            <ActivityIndicator size="small" color="#2c3e6b" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center"
                            onPress={() => setDistrictModalVisible(true)}
                        >
                            <Text className={selectedDistrict ? 'text-base text-[#1f2937]' : 'text-base text-[#9ca3af]'}>
                                {selectedDistrictName || 'Select District'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.districtId && (
                        <Text className="text-xs text-red-500 mt-1">{errors.districtId.message}</Text>
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
                    <Text className="text-sm font-semibold text-[#374151] mb-2">Qualification *</Text>
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
                        <Text className="text-xs text-red-500 mt-1">{errors.qualification.message}</Text>
                    )}
                </View>

                {/* Years of Experience */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">Total Years of Experience *</Text>
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
                        <Text className="text-xs text-red-500 mt-1">{errors.yearsOfExperience.message}</Text>
                    )}
                </View>

                {/* RCI Number */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">RCI Number *</Text>
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
                        <Text className="text-xs text-red-500 mt-1">{errors.rciNumber.message}</Text>
                    )}
                </View>

                {/* EBRC */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">EBRC *</Text>
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
                        <Text className="text-xs text-red-500 mt-1">{errors.ebrc.message}</Text>
                    )}
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-[#e5e7eb] my-6" />

                {/* Personal Details (Read-only) */}
                <Text className="text-lg font-bold text-[#1f2937] mb-1">Personal Details</Text>
                <Text className="text-xs text-[#6b7280] mb-5">
                    To update Personal Details, go to Settings {'>'} Edit Profile
                </Text>

                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">Full Name</Text>
                    <View className="bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] px-4 py-3">
                        <Text className="text-base text-[#6b7280]">{user?.name || ''}</Text>
                    </View>
                </View>

                <View className="flex-row">
                    <View className="mb-5 flex-1 mr-2">
                        <Text className="text-sm font-semibold text-[#374151] mb-2">Gender</Text>
                        <View className="bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] px-4 py-3">
                            <Text className="text-base text-[#6b7280]">
                                {user?.gender === 'MALE' ? 'Male' : user?.gender === 'FEMALE' ? 'Female' : '-'}
                            </Text>
                        </View>
                    </View>
                    <View className="mb-5 flex-1 ml-2">
                        <Text className="text-sm font-semibold text-[#374151] mb-2">Phone Number</Text>
                        <View className="bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] px-4 py-3">
                            <Text className="text-base text-[#6b7280]">{user?.phone || ''}</Text>
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
                        <Text className="text-base font-semibold text-white">Submit</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
