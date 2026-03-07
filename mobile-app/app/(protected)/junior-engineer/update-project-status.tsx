/**
 * Update Project Status Form Screen
 *
 * Junior Engineer submits a project progress update with:
 * - Completion status (dropdown: 10%-100%)
 * - Comment (optional)
 * - Photos (1-3)
 * - GPS location (captured on submit)
 *
 * Uses react-hook-form + zodResolver for validation.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import {
    ProjectStatusUpdateSchema,
    PROJECT_COMPLETION_OPTIONS,
    type ProjectStatusUpdateFormData,
} from '../../../src/lib/zod';
import { submitProjectUpdate } from '../../../src/services/project.service';
import { useAuthStore } from '../../../src/lib/store';

const BLUE = '#1565C0';
const MAX_PHOTOS = 3;

export default function UpdateProjectStatusScreen() {
    const { id: projectId, progress: currentProgress } = useLocalSearchParams<{
        id: string;
        progress: string;
    }>();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [showStatusPicker, setShowStatusPicker] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ProjectStatusUpdateFormData>({
        resolver: zodResolver(ProjectStatusUpdateSchema),
        defaultValues: {
            completionStatus: '',
            comment: '',
            photos: [],
        },
    });

    const photos = watch('photos') || [];
    const selectedStatus = watch('completionStatus');

    // ── Photo Picker ──

    const pickPhotos = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Limit Reached', `Maximum ${MAX_PHOTOS} photos allowed.`);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: MAX_PHOTOS - photos.length,
            quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
            const newUris = result.assets.map((a) => a.uri);
            setValue('photos', [...photos, ...newUris].slice(0, MAX_PHOTOS), {
                shouldValidate: true,
            });
        }
    };

    const removePhoto = (index: number) => {
        const updated = photos.filter((_, i) => i !== index);
        setValue('photos', updated, { shouldValidate: true });
    };

    // ── Submit ──

    const submitMutation = useMutation({
        mutationFn: async (data: ProjectStatusUpdateFormData) => {
            // 1. Request location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error(
                    'Location permission is required to submit a project update. Please enable location access.',
                );
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // 2. Reverse geocode for location address
            let locationAddress = '';
            try {
                const [place] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                if (place) {
                    locationAddress = [place.name, place.city, place.region]
                        .filter(Boolean)
                        .join(', ');
                }
            } catch {
                // Non-critical — proceed without address
            }

            // 3. Submit
            const result = await submitProjectUpdate({
                projectId: projectId!,
                userId: user!.id,
                userName: user!.name,
                completionStatus: parseInt(data.completionStatus, 10),
                comment: data.comment || undefined,
                photoUris: data.photos,
                locationAddress,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit update');
            }
        },
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Update Submitted',
                text2: 'Project status updated successfully.',
            });
            queryClient.invalidateQueries({ queryKey: ['project-updates', projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects-list'] });
            queryClient.invalidateQueries({ queryKey: ['recent-projects'] });
            router.back();
        },
        onError: (error: Error) => {
            Toast.show({
                type: 'error',
                text1: 'Submission Failed',
                text2: error.message,
            });
        },
    });

    const onSubmit = (data: ProjectStatusUpdateFormData) => {
        submitMutation.mutate(data);
    };

    const onFormError = () => {
        Toast.show({
            type: 'error',
            text1: 'Validation Error',
            text2: 'Please fill in all required fields.',
        });
    };

    const bodyContent = (
        <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* Current Progress */}
            {currentProgress && (
                <View className="bg-blue-50 rounded-xl p-3 mb-5 flex-row items-center">
                    <Ionicons name="information-circle-outline" size={18} color={BLUE} />
                    <Text className="text-sm text-blue-800 ml-2 flex-1">
                        Current progress: <Text className="font-bold">{currentProgress}%</Text>
                    </Text>
                </View>
            )}

            {/* Completion Status */}
            <View className="mb-5">
                <Text className="text-[15px] font-bold text-[#1a1a1a] mb-1">
                    Completion Status <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-xs text-gray-500 mb-2">
                    Select the current completion percentage
                </Text>

                <TouchableOpacity
                    onPress={() => setShowStatusPicker(!showStatusPicker)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 flex-row justify-between items-center"
                >
                    <Text
                        className={
                            selectedStatus
                                ? 'text-[15px] text-[#1a1a1a]'
                                : 'text-[15px] text-gray-400'
                        }
                    >
                        {selectedStatus ? `${selectedStatus}%` : 'Select completion status'}
                    </Text>
                    <Ionicons
                        name={showStatusPicker ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#9ca3af"
                    />
                </TouchableOpacity>

                {showStatusPicker && (
                    <View className="bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden">
                        {PROJECT_COMPLETION_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => {
                                    setValue('completionStatus', option, {
                                        shouldValidate: true,
                                    });
                                    setShowStatusPicker(false);
                                }}
                                className={`px-4 py-3 border-b border-gray-100 flex-row justify-between items-center ${
                                    selectedStatus === option ? 'bg-blue-50' : ''
                                }`}
                            >
                                <Text
                                    className={`text-[15px] ${
                                        selectedStatus === option
                                            ? 'text-blue-700 font-semibold'
                                            : 'text-[#1a1a1a]'
                                    }`}
                                >
                                    {option}%
                                </Text>
                                {selectedStatus === option && (
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={20}
                                        color={BLUE}
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {errors.completionStatus ? (
                    <Text className="text-xs text-red-500 mt-1">
                        {errors.completionStatus.message}
                    </Text>
                ) : (
                    <View className="h-4" />
                )}
            </View>

            {/* Comment */}
            <View className="mb-5">
                <Text className="text-[15px] font-bold text-[#1a1a1a] mb-1">
                    Comment <Text className="text-gray-400 text-xs font-normal">(Optional)</Text>
                </Text>
                <Controller
                    control={control}
                    name="comment"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]"
                            placeholder="Add any comments about the update..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={{ minHeight: 100 }}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                        />
                    )}
                />
            </View>

            {/* Photos */}
            <View className="mb-5">
                <Text className="text-[15px] font-bold text-[#1a1a1a] mb-1">
                    Photos <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-xs text-gray-500 mb-2.5">
                    {photos.length}/{MAX_PHOTOS} photos uploaded
                </Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ overflow: 'visible' }}
                    contentContainerStyle={{
                        gap: 12,
                        paddingRight: 16,
                        paddingTop: 10,
                        paddingLeft: 2,
                        paddingBottom: 4,
                    }}
                >
                    {photos.map((uri, idx) => (
                        <View key={idx} style={{ position: 'relative' }}>
                            <Image
                                source={{ uri }}
                                style={{ width: 96, height: 96, borderRadius: 12 }}
                            />
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    backgroundColor: '#ef4444',
                                    borderRadius: 12,
                                    width: 24,
                                    height: 24,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onPress={() => removePhoto(idx)}
                            >
                                <Ionicons name="close" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {photos.length < MAX_PHOTOS && (
                        <TouchableOpacity
                            onPress={pickPhotos}
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: '#d1d5db',
                                borderStyle: 'dashed',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f9fafb',
                            }}
                        >
                            <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                            <Text className="text-[10px] text-gray-400 mt-1">Add Photo</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {errors.photos ? (
                    <Text className="text-xs text-red-500 mt-2">
                        {errors.photos.message}
                    </Text>
                ) : (
                    <View className="h-4" />
                )}
            </View>

            {/* Location Notice */}
            <View className="bg-amber-50 rounded-xl p-3 flex-row items-start">
                <Ionicons name="location-outline" size={18} color="#d97706" />
                <Text className="text-xs text-amber-700 ml-2 flex-1">
                    Your GPS location will be captured when you submit this update for
                    verification purposes.
                </Text>
            </View>
        </ScrollView>
    );

    return (
        <>
            {/* Page title */}
            <View className="flex-row items-center px-4 py-3" style={{ backgroundColor: BLUE }}>
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text className="text-white text-lg font-semibold">Update Project Status</Text>
            </View>

            <View className="flex-1 bg-[#f0f4f8]">
                {Platform.OS === 'ios' ? (
                    <KeyboardAvoidingView behavior="padding" className="flex-1">
                        {bodyContent}
                    </KeyboardAvoidingView>
                ) : (
                    bodyContent
                )}

                {/* Submit Button */}
                <View
                    className="px-4 pb-6 pt-2"
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: '#f0f4f8',
                    }}
                >
                    <TouchableOpacity
                        className={`rounded-xl py-4 items-center ${
                            submitMutation.isPending ? 'bg-gray-400' : ''
                        }`}
                        style={
                            !submitMutation.isPending
                                ? { backgroundColor: BLUE, elevation: 4 }
                                : undefined
                        }
                        onPress={handleSubmit(onSubmit, onFormError)}
                        disabled={submitMutation.isPending}
                        activeOpacity={0.85}
                    >
                        {submitMutation.isPending ? (
                            <View className="flex-row items-center">
                                <ActivityIndicator color="#fff" size="small" />
                                <Text className="text-white text-base font-bold ml-2">
                                    Submitting...
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-white text-base font-bold">
                                Submit Update
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}
