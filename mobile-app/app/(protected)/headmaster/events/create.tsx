/**
 * Create Event Screen (Headmaster only) — NativeWind
 *
 * Uses react-hook-form with zodResolver for validation.
 * Image upload, CalendarPickerModal for dates, activity/district dropdowns.
 */

import React, { useState, useMemo } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    Image,
    StatusBar,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateEventSchema, CreateEventFormData, EVENT_ACTIVITY_OPTIONS } from '../../../../src/lib/zod';
import { createEvent } from '../../../../src/services/firebase/content.firestore';
import { uploadProfileImage } from '../../../../src/services/storage.service';
import { useAuthStore } from '../../../../src/lib/store';
import { getDistricts } from '../../../../src/services/firebase/master-data.firestore';
import { District } from '../../../../src/types';
import CalendarPickerModal from '../../../../src/components/CalendarPickerModal';
import AddPhotoSourceModal from '../../../../src/components/AddPhotoSourceModal';
import SelectModal from '../../../../src/components/SelectModal';
import Toast from 'react-native-toast-message';

const BLUE = '#1565C0';


const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


/* ── Main Screen ── */
export default function CreateEventScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateEventFormData>({
        resolver: zodResolver(CreateEventSchema),
        defaultValues: {
            eventName: '', description: '', startDate: '', endDate: '',
            activity: '', venue: '', districtId: '',
            maleParticipants: '0', femaleParticipants: '0',
        },
    });

    const startDate = watch('startDate');
    const endDate = watch('endDate');
    const activity = watch('activity');
    const districtId = watch('districtId');

    const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [showStartCal, setShowStartCal] = useState(false);
    const [showEndCal, setShowEndCal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [showImageSourceModal, setShowImageSourceModal] = useState(false);

    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const districtName = districts.find(d => d.id === districtId)?.name || '';

    const formatDisplay = (ds: string) => {
        if (!ds) return 'Select Date';
        const d = new Date(ds);
        const day = d.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
        return `${day}${suffix} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
    };

    const activityItems = EVENT_ACTIVITY_OPTIONS.map(a => ({ id: a, name: a }));

    const submitMutation = useMutation({
        mutationFn: async (data: CreateEventFormData) => {
            let flyer_url: string | undefined;
            if (photo) {
                const result = await uploadProfileImage(photo.uri, user!.id);
                if (!result.success) throw new Error(result.error || 'Image upload failed');
                flyer_url = result.fileUrl || undefined;
            }
            return createEvent({
                title: data.eventName.trim(),
                description: data.description.trim(),
                event_date: data.startDate,
                event_end_date: data.endDate,
                location: data.venue.trim(),
                activity_type: data.activity,
                flyer_url,
                male_participants: parseInt(data.maleParticipants),
                female_participants: parseInt(data.femaleParticipants),
                school_id: user?.faculty?.school_id,
                district_id: data.districtId,
                created_by: user!.id,
                creator_name: user?.name?.trim() || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-events'] });
            Toast.show({ type: 'success', text2: 'Event created successfully!', visibilityTime: 2000 });
            setTimeout(() => router.back(), 1500);
        },
        onError: (error: any) => {
            Toast.show({ type: 'error', text2: error?.message || 'Failed to create event', visibilityTime: 3000 });
        },
    });

    const onSubmit = (data: CreateEventFormData) => submitMutation.mutate(data);

    const onFormError = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        Toast.show({ type: 'error', text2: firstError?.message || 'Please complete all required fields.', visibilityTime: 3000 });
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera roll permissions.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8 });
        if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera permissions.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
        if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
    };

    const showImageOptions = () => {
        setShowImageSourceModal(true);
    };

    return (
        <View className="flex-1" style={{ backgroundColor: BLUE }}>
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />

            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <AppText className="text-2xl font-extrabold text-[#1a1a1a] mb-1.5">Create Event</AppText>
                <AppText className="text-sm text-gray-500 mb-6">Please make sure all the required fields are properly filled.</AppText>

                {/* Image Upload */}
                <TouchableOpacity className="w-full h-[150px] rounded-xl border-[1.5px] border-gray-200 justify-center items-center mb-5 overflow-hidden bg-[#fafafa]" onPress={showImageOptions}>
                    {photo ? (
                        <Image source={{ uri: photo.uri }} className="w-full h-full rounded-xl" resizeMode="cover" />
                    ) : (
                        <View className="items-center">
                            <Ionicons name="image-outline" size={48} color="#c0c0c0" />
                            <AppText className="text-gray-400 text-[13px] mt-1">IMG</AppText>
                        </View>
                    )}
                </TouchableOpacity>
                {photo && (
                    <TouchableOpacity className="self-center mt-1.5 mb-2.5 flex-row items-center justify-center gap-1" onPress={() => setPhoto(null)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <AppText className="text-red-500 text-[13px]">Remove photo</AppText>
                    </TouchableOpacity>
                )}

                {/* Event Name */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Event Name *</AppText>
                <Controller control={control} name="eventName" render={({ field: { onChange, value } }) => (
                    <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} placeholder="Enter Event Name" placeholderTextColor="#b0b0b0" />
                )} />
                {errors.eventName && <AppText className="text-xs text-red-500 mt-1">{errors.eventName.message}</AppText>}

                {/* Description */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Description *</AppText>
                <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
                    <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px]" style={{ textAlignVertical: 'top' }} value={value} onChangeText={onChange} placeholder="Enter Event Description" placeholderTextColor="#b0b0b0" multiline numberOfLines={4} />
                )} />
                {errors.description && <AppText className="text-xs text-red-500 mt-1">{errors.description.message}</AppText>}

                {/* Starting Date */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Starting Date of Program *</AppText>
                <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowStartCal(true)}>
                    <AppText className={startDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{formatDisplay(startDate)}</AppText>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
                {errors.startDate && <AppText className="text-xs text-red-500 mt-1">{errors.startDate.message}</AppText>}

                {/* Ending Date */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Ending Date of Program *</AppText>
                <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowEndCal(true)}>
                    <AppText className={endDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{formatDisplay(endDate)}</AppText>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
                {errors.endDate && <AppText className="text-xs text-red-500 mt-1">{errors.endDate.message}</AppText>}

                {/* Activities */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Activities *</AppText>
                <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowActivityModal(true)}>
                    <AppText className={activity ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{activity || 'Select option'}</AppText>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                {errors.activity && <AppText className="text-xs text-red-500 mt-1">{errors.activity.message}</AppText>}

                {/* Venue */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Venue / Place *</AppText>
                <Controller control={control} name="venue" render={({ field: { onChange, value } }) => (
                    <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} placeholder="Enter Venue / Place" placeholderTextColor="#b0b0b0" />
                )} />
                {errors.venue && <AppText className="text-xs text-red-500 mt-1">{errors.venue.message}</AppText>}

                {/* District */}
                <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">District *</AppText>
                {loadingDistricts ? (
                    <View className="border border-gray-200 rounded-[10px] px-4 py-3.5"><ActivityIndicator size="small" color={BLUE} /></View>
                ) : (
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowDistrictModal(true)}>
                        <AppText className={districtId ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{districtName || 'Select option'}</AppText>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                )}
                {errors.districtId && <AppText className="text-xs text-red-500 mt-1">{errors.districtId.message}</AppText>}

                {/* Participants */}
                <View className="flex-row gap-4">
                    <View className="flex-1">
                        <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Male Participants *</AppText>
                        <Controller control={control} name="maleParticipants" render={({ field: { onChange, value } }) => (
                            <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} keyboardType="numeric" placeholder="0" placeholderTextColor="#b0b0b0" />
                        )} />
                        {errors.maleParticipants && <AppText className="text-xs text-red-500 mt-1">{errors.maleParticipants.message}</AppText>}
                    </View>
                    <View className="flex-1">
                        <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Female Participants *</AppText>
                        <Controller control={control} name="femaleParticipants" render={({ field: { onChange, value } }) => (
                            <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} keyboardType="numeric" placeholder="0" placeholderTextColor="#b0b0b0" />
                        )} />
                        {errors.femaleParticipants && <AppText className="text-xs text-red-500 mt-1">{errors.femaleParticipants.message}</AppText>}
                    </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    className={`rounded-[10px] py-4 items-center mt-7 ${submitMutation.isPending ? 'bg-gray-400' : ''}`}
                    style={!submitMutation.isPending ? { backgroundColor: BLUE } : undefined}
                    onPress={handleSubmit(onSubmit, onFormError)}
                    disabled={submitMutation.isPending}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <AppText className="text-lg font-bold text-white">Submit</AppText>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <AddPhotoSourceModal
                visible={showImageSourceModal}
                onClose={() => setShowImageSourceModal(false)}
                onPickCamera={takePhoto}
                onPickGallery={pickImage}
            />

            {/* Calendar Modals */}
            <CalendarPickerModal visible={showStartCal} value={startDate} onSelect={(v) => setValue('startDate', v, { shouldValidate: true })} onClose={() => setShowStartCal(false)} />
            <CalendarPickerModal visible={showEndCal} value={endDate} onSelect={(v) => setValue('endDate', v, { shouldValidate: true })} onClose={() => setShowEndCal(false)} />

            {/* Activity Modal */}
            <SelectModal visible={showActivityModal} onClose={() => setShowActivityModal(false)} title="Select Activity" data={activityItems} selectedValue={activity} onSelect={(v) => setValue('activity', v, { shouldValidate: true })} />

            {/* District Modal */}
            <SelectModal visible={showDistrictModal} onClose={() => setShowDistrictModal(false)} title="Select District" data={districts} selectedValue={districtId} onSelect={(v) => setValue('districtId', v, { shouldValidate: true })} loading={loadingDistricts} />
        </View>
    );
}
