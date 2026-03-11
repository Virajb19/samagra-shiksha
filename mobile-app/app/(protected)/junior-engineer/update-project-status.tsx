/**
 * Update Project Status Form Screen
 *
 * Junior Engineer submits a project progress update with:
 * - Completion status (dropdown: 10%-100%)
 * - Comment (optional)
 * - Photos (1-10)
 * - GPS location (requested on mount, captured on submit)
 *
 * Uses react-hook-form + zodResolver for validation.
 */

import React, { useState, useEffect, useRef } from 'react';
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
    Modal,
    Pressable,
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
const BLUE_DARK = '#0D47A1';
const MAX_PHOTOS = 10;

export default function UpdateProjectStatusScreen() {
    const {
        id: projectId,
        progress: currentProgress,
        school_name: schoolName,
        activity,
        district_name: districtName,
        category,
        udise_code: udiseCode,
    } = useLocalSearchParams<{
        id: string;
        progress: string;
        school_name: string;
        activity: string;
        district_name: string;
        category: string;
        udise_code: string;
    }>();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [showPhotoDialog, setShowPhotoDialog] = useState(false);
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
    const [liveAddress, setLiveAddress] = useState<string>('Fetching location...');

    // ── Request location permission on mount ──
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationGranted(status === 'granted');

            if (status === 'granted') {
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const [place] = await Location.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });
                    if (place) {
                        setLiveAddress(
                            [place.name, place.street, place.city, place.region, place.postalCode, place.country]
                                .filter(Boolean)
                                .join(', '),
                        );
                    } else {
                        setLiveAddress(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
                    }
                } catch {
                    setLiveAddress('Unable to fetch address');
                }
            } else {
                setLiveAddress('Location permission denied');
            }
        })();
    }, []);

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

    const takePhoto = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Limit Reached', `Maximum ${MAX_PHOTOS} photos allowed.`);
            return;
        }

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
        });

        if (!result.canceled && result.assets.length > 0) {
            setValue('photos', [...photos, result.assets[0].uri].slice(0, MAX_PHOTOS), {
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
            // Check location permission
            if (!locationGranted) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    throw new Error(
                        'Location permission is required to submit a project update.',
                    );
                }
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            // Reverse geocode
            let locationAddress = '';
            try {
                const [place] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                if (place) {
                    locationAddress = [place.name, place.street, place.city, place.region, place.postalCode, place.country]
                        .filter(Boolean)
                        .join(', ');
                }
            } catch {
                // Non-critical
            }

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
                visibilityTime: 4000,
            });
        },
    });

    const onSubmit = (data: ProjectStatusUpdateFormData) => {
        submitMutation.mutate(data);
    };

    const onFormError = () => {
        const firstError =
            errors.completionStatus?.message ||
            errors.photos?.message ||
            errors.comment?.message;

        Toast.show({
            type: 'error',
            text1: firstError || 'Please fill in all required fields.',
        });
    };

    // ── Progress helper ──
    const progressNum = parseInt(currentProgress || '0', 10);
    const progressColor = progressNum >= 75 ? '#22c55e' : progressNum >= 40 ? '#f59e0b' : '#ef4444';

    const bodyContent = (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* ─── Project Info Header ─── */}
            <View
                style={{
                    backgroundColor: BLUE,
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 20,
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                }}
            >
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                        {activity ? (
                            <Text className="text-white/80 text-xs font-semibold tracking-wide uppercase">{activity}</Text>
                        ) : null}
                        {schoolName ? (
                            <Text className="text-white text-lg font-bold mt-1" numberOfLines={2}>{schoolName}</Text>
                        ) : null}
                        <View className="mt-2 gap-y-0.5">
                            {udiseCode ? (
                                <Text className="text-white/70 text-xs">
                                    <Text className="text-white/50">Project ID: </Text>#{udiseCode}
                                </Text>
                            ) : null}
                            {category ? (
                                <Text className="text-white/70 text-xs">
                                    <Text className="text-white/50">Category: </Text>{category}
                                </Text>
                            ) : null}
                        </View>
                        {districtName ? (
                            <View className="flex-row items-center mt-1.5">
                                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                                <Text className="text-white/70 text-xs ml-1">{districtName}</Text>
                            </View>
                        ) : null}
                    </View>
                    {/* Progress badge */}
                    <View
                        className="rounded-xl px-3 py-1.5 items-center"
                        style={{ backgroundColor: progressColor }}
                    >
                        <Text className="text-white text-lg font-bold">{progressNum}%</Text>
                        <Text className="text-white/80 text-[9px] font-semibold">PROGRESS</Text>
                    </View>
                </View>

                {/* Live Location */}
                <View
                    className="flex-row items-center mt-3 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                    <Ionicons
                        name={locationGranted === false ? 'warning-outline' : 'navigate-outline'}
                        size={14}
                        color={locationGranted === false ? '#fbbf24' : 'rgba(255,255,255,0.8)'}
                    />
                    <Text className="text-white/80 text-[11px] ml-2 flex-1" numberOfLines={2}>
                        <Text style={{ fontWeight: '700' }}>Live Location: </Text>
                        {liveAddress}
                    </Text>
                </View>
            </View>

            {/* ─── Form Content ─── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
                {/* ─ Project Completion Status ─ */}
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-gray-800 mb-1">
                        Project Completion Status <Text className="text-red-500">*</Text>
                    </Text>
                    <Text className="text-xs text-gray-400 mb-2">
                        Select the current completion percentage
                    </Text>

                    <TouchableOpacity
                        onPress={() => setShowStatusPicker(!showStatusPicker)}
                        className="flex-row justify-between items-center"
                        style={{
                            backgroundColor: '#f8fafc',
                            borderWidth: 1,
                            borderColor: errors.completionStatus ? '#ef4444' : '#e2e8f0',
                            borderRadius: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                        }}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={{
                                fontSize: 15,
                                color: selectedStatus ? '#1a1a1a' : '#94a3b8',
                                fontWeight: selectedStatus ? '600' : '400',
                            }}
                        >
                            {selectedStatus ? `${selectedStatus}%` : 'Select option'}
                        </Text>
                        <Ionicons
                            name={showStatusPicker ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>

                    {showStatusPicker && (
                        <View
                            style={{
                                backgroundColor: '#fff',
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                borderRadius: 14,
                                marginTop: 6,
                                overflow: 'hidden',
                                elevation: 4,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                            }}
                        >
                            {PROJECT_COMPLETION_OPTIONS.map((option, idx) => (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => {
                                        setValue('completionStatus', option, {
                                            shouldValidate: true,
                                        });
                                        setShowStatusPicker(false);
                                    }}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 13,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: selectedStatus === option ? '#eff6ff' : '#fff',
                                        borderBottomWidth: idx < PROJECT_COMPLETION_OPTIONS.length - 1 ? 1 : 0,
                                        borderBottomColor: '#f1f5f9',
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <View
                                            style={{
                                                width: 32,
                                                height: 4,
                                                borderRadius: 2,
                                                backgroundColor: parseInt(option) >= 75 ? '#22c55e' : parseInt(option) >= 40 ? '#f59e0b' : '#ef4444',
                                                marginRight: 10,
                                                opacity: 0.7,
                                            }}
                                        />
                                        <Text
                                            style={{
                                                fontSize: 15,
                                                color: selectedStatus === option ? BLUE : '#374151',
                                                fontWeight: selectedStatus === option ? '700' : '500',
                                            }}
                                        >
                                            {option}%
                                        </Text>
                                    </View>
                                    {selectedStatus === option && (
                                        <Ionicons name="checkmark-circle" size={20} color={BLUE} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {errors.completionStatus && (
                        <View className="flex-row items-center mt-1.5">
                            <Ionicons name="alert-circle" size={13} color="#ef4444" />
                            <Text className="text-xs text-red-500 ml-1">
                                {errors.completionStatus.message}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ─ Any Comment ─ */}
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-gray-800 mb-1">
                        Any Comment
                    </Text>
                    <Controller
                        control={control}
                        name="comment"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={{
                                    backgroundColor: '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: '#e2e8f0',
                                    borderRadius: 14,
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    fontSize: 15,
                                    color: '#1a1a1a',
                                    minHeight: 100,
                                    textAlignVertical: 'top',
                                }}
                                placeholder="Write if any comment (optional)"
                                placeholderTextColor="#94a3b8"
                                multiline
                                numberOfLines={4}
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                            />
                        )}
                    />
                </View>

                {/* ─ Photos ─ */}
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-gray-800 mb-0.5">
                        Photos of project status <Text className="text-red-500">*</Text>
                    </Text>
                    <Text className="text-xs text-gray-400 mb-3">
                        {photos.length}/{MAX_PHOTOS} photos — at least 1 required
                    </Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ overflow: 'visible' }}
                        contentContainerStyle={{
                            gap: 10,
                            paddingRight: 16,
                            paddingTop: 8,
                            paddingLeft: 2,
                            paddingBottom: 4,
                        }}
                    >
                        {photos.map((uri, idx) => (
                            <View key={idx} style={{ position: 'relative' }}>
                                <Image
                                    source={{ uri }}
                                    style={{
                                        width: 88,
                                        height: 88,
                                        borderRadius: 14,
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                    }}
                                />
                                <TouchableOpacity
                                    style={{
                                        position: 'absolute',
                                        top: -6,
                                        right: -6,
                                        backgroundColor: '#ef4444',
                                        borderRadius: 12,
                                        width: 22,
                                        height: 22,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        elevation: 3,
                                        shadowColor: '#ef4444',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 3,
                                    }}
                                    onPress={() => removePhoto(idx)}
                                >
                                    <Ionicons name="close" size={13} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {photos.length < MAX_PHOTOS && (
                            <TouchableOpacity
                                onPress={() => setShowPhotoDialog(true)}
                                style={{
                                    width: 88,
                                    height: 88,
                                    borderRadius: 14,
                                    borderWidth: 2,
                                    borderColor: '#cbd5e1',
                                    borderStyle: 'dashed',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#f8fafc',
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={32} color="#94a3b8" />
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    {errors.photos && (
                        <View className="flex-row items-center mt-2">
                            <Ionicons name="alert-circle" size={13} color="#ef4444" />
                            <Text className="text-xs text-red-500 ml-1">
                                {errors.photos.message}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ─ GPS Notice ─ */}
                <View
                    className="flex-row items-start px-3 py-3 rounded-xl mb-4"
                    style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7' }}
                >
                    <Ionicons name="location-outline" size={16} color="#d97706" style={{ marginTop: 1 }} />
                    <Text className="text-xs ml-2 flex-1" style={{ color: '#92400e', lineHeight: 18 }}>
                        Your GPS location will be captured when you submit for verification purposes.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );

    return (
        <>
            {/* Page title */}
            <View
                className="flex-row items-center px-4 py-3.5"
                style={{ backgroundColor: BLUE }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-3"
                    style={{
                        width: 36, height: 36, borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text className="text-white text-lg font-bold">Update Project Status</Text>
            </View>

            <View className="flex-1 bg-white">
                {Platform.OS === 'ios' ? (
                    <KeyboardAvoidingView behavior="padding" className="flex-1">
                        {bodyContent}
                    </KeyboardAvoidingView>
                ) : (
                    bodyContent
                )}

                {/* Submit Button */}

                {/* Photo Source Picker Dialog */}
                <Modal
                    visible={showPhotoDialog}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowPhotoDialog(false)}
                >
                    <Pressable
                        onPress={() => setShowPhotoDialog(false)}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Pressable
                            onPress={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: '#fff',
                                borderRadius: 20,
                                paddingVertical: 28,
                                paddingHorizontal: 24,
                                width: '80%',
                                maxWidth: 320,
                                elevation: 10,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.2,
                                shadowRadius: 16,
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 20 }}>
                                Add Photo
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                                {/* Camera Option */}
                                <TouchableOpacity
                                    onPress={() => { setShowPhotoDialog(false); setTimeout(takePhoto, 200); }}
                                    activeOpacity={0.7}
                                    style={{
                                        alignItems: 'center',
                                        backgroundColor: '#eff6ff',
                                        borderRadius: 16,
                                        paddingVertical: 20,
                                        paddingHorizontal: 24,
                                        flex: 1,
                                    }}
                                >
                                    <View style={{
                                        width: 52, height: 52, borderRadius: 26, backgroundColor: BLUE,
                                        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                                    }}>
                                        <Ionicons name="camera" size={26} color="#fff" />
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e3a5f' }}>Camera</Text>
                                </TouchableOpacity>

                                {/* Gallery Option */}
                                <TouchableOpacity
                                    onPress={() => { setShowPhotoDialog(false); setTimeout(pickPhotos, 200); }}
                                    activeOpacity={0.7}
                                    style={{
                                        alignItems: 'center',
                                        backgroundColor: '#f0fdf4',
                                        borderRadius: 16,
                                        paddingVertical: 20,
                                        paddingHorizontal: 24,
                                        flex: 1,
                                    }}
                                >
                                    <View style={{
                                        width: 52, height: 52, borderRadius: 26, backgroundColor: '#22c55e',
                                        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                                    }}>
                                        <Ionicons name="images" size={26} color="#fff" />
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534' }}>Gallery</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Cancel */}
                            <TouchableOpacity
                                onPress={() => setShowPhotoDialog(false)}
                                style={{ marginTop: 16, paddingVertical: 10, alignItems: 'center' }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#94a3b8' }}>Cancel</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Pressable>
                </Modal>
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 20,
                        paddingBottom: 24,
                        paddingTop: 12,
                        backgroundColor: '#fff',
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9',
                    }}
                >
                    <TouchableOpacity
                        style={{
                            borderRadius: 14,
                            paddingVertical: 16,
                            alignItems: 'center',
                            backgroundColor: submitMutation.isPending ? '#94a3b8' : BLUE,
                            elevation: submitMutation.isPending ? 0 : 4,
                            shadowColor: BLUE,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 8,
                        }}
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
                            <View className="flex-row items-center">
                                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                <Text className="text-white text-base font-bold ml-2">
                                    Submit
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}
