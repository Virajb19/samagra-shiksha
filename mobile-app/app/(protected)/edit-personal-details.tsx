import React, { useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/lib/store';
import { updatePersonalDetails } from '../../src/services/firebase/users.firestore';
import { uploadProfileImage, getImagePreviewUrl } from '../../src/services/storage.service';
import { EditPersonalDetailsSchema, type EditPersonalDetailsFormData } from '../../src/lib/zod';
import Toast from 'react-native-toast-message';

export default function EditPersonalDetailsScreen() {
    const router = useRouter();
    const { user, refreshUser } = useAuthStore();
    const [localImageUri, setLocalImageUri] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const profileUrl = localImageUri || getImagePreviewUrl(user?.profile_image_url);

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<EditPersonalDetailsFormData>({
        resolver: zodResolver(EditPersonalDetailsSchema),
        defaultValues: {
            name: user?.name || '',
            phone: user?.phone || '',
            gender: (user?.gender as 'MALE' | 'FEMALE') || undefined,
        },
    });

    const selectedGender = watch('gender');

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
            setLocalImageUri(result.assets[0].uri);
        }
    };

    const updateMutation = useMutation({
        mutationFn: async (data: EditPersonalDetailsFormData) => {
            let profile_image_url: string | undefined;
            if (localImageUri) {
                setUploadingPhoto(true);
                const uploadResult = await uploadProfileImage(localImageUri, user!.id);
                setUploadingPhoto(false);
                if (uploadResult.success && uploadResult.fileUrl) {
                    profile_image_url = uploadResult.fileUrl;
                }
            }
            await updatePersonalDetails(user!.id, { ...data, profile_image_url });
        },
        onSuccess: async () => {
            await refreshUser();
            Toast.show({
                type: 'success',
                text2: 'Your personal details have been updated successfully.',
            });
        },
        onError: (error: any) => {
            setUploadingPhoto(false);
            Toast.show({
                type: 'error',
                text2: error?.message || 'Failed to update details',
            });
        },
    });

    const onSubmit = (data: EditPersonalDetailsFormData) => {
        updateMutation.mutate(data);
    };

    return (
        <KeyboardAvoidingView className="flex-1 bg-[#eaf0fb]" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                {/* Profile Photo */}
                <View className="items-center mb-6 mt-2">
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <View className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border-[3px] border-[#3b82f6]">
                            {profileUrl ? (
                                <Image source={{ uri: profileUrl }} className="w-full h-full" />
                            ) : (
                                <View className="w-full h-full justify-center items-center bg-gray-300">
                                    <Ionicons name="person" size={48} color="#9ca3af" />
                                </View>
                            )}
                        </View>
                        <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#3b82f6] justify-center items-center border-2 border-white">
                            <Ionicons name="camera" size={18} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Gender Toggle */}
                <View className="mb-5">
                    <View className="flex-row bg-[#e5e7eb] rounded-full p-1">
                        <TouchableOpacity
                            className={`flex-1 py-3 rounded-full items-center ${selectedGender === 'MALE' ? 'bg-[#3b82f6]' : ''}`}
                            onPress={() => setValue('gender', 'MALE', { shouldValidate: true })}
                        >
                            <AppText className={`text-sm font-semibold ${selectedGender === 'MALE' ? 'text-white' : 'text-gray-500'}`}>Male</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 py-3 rounded-full items-center ${selectedGender === 'FEMALE' ? 'bg-[#3b82f6]' : ''}`}
                            onPress={() => setValue('gender', 'FEMALE', { shouldValidate: true })}
                        >
                            <AppText className={`text-sm font-semibold ${selectedGender === 'FEMALE' ? 'text-white' : 'text-gray-500'}`}>Female</AppText>
                        </TouchableOpacity>
                    </View>
                    {errors.gender && <AppText className="text-xs text-red-500 mt-1 ml-1">{errors.gender.message}</AppText>}
                </View>

                {/* Name Field */}
                <View className="mb-4">
                    <AppText className="text-sm font-medium text-gray-600 mb-1.5 ml-1">Name</AppText>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className={`bg-white rounded-xl px-4 h-12 text-base text-[#1f2937] border ${errors.name ? 'border-red-500' : 'border-[#e5e7eb]'}`}
                                placeholder="Enter your name"
                                placeholderTextColor="#9ca3af"
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.name && <AppText className="text-xs text-red-500 mt-1 ml-1">{errors.name.message}</AppText>}
                </View>

                {/* Phone Field */}
                <View className="mb-6">
                    <AppText className="text-sm font-medium text-gray-600 mb-1.5 ml-1">Phone Number</AppText>
                    <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, value } }) => (
                            <View className={`flex-row items-center bg-white rounded-xl border ${errors.phone ? 'border-red-500' : 'border-[#e5e7eb]'}`}>
                                <AppText className="text-base text-gray-400 pl-4 pr-2">+91 |</AppText>
                                <TextInput
                                    className="flex-1 h-12 text-base text-[#1f2937] pr-4"
                                    placeholder="10-digit number"
                                    placeholderTextColor="#9ca3af"
                                    value={value}
                                    onChangeText={(text) => onChange(text.replace(/[^0-9]/g, '').slice(0, 10))}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                        )}
                    />
                    {errors.phone && <AppText className="text-xs text-red-500 mt-1 ml-1">{errors.phone.message}</AppText>}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    className={`bg-[#3b82f6] rounded-xl py-4 items-center ${updateMutation.isPending ? 'opacity-70' : ''}`}
                    onPress={handleSubmit(onSubmit)}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <AppText className="text-base font-semibold text-white">Save</AppText>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
