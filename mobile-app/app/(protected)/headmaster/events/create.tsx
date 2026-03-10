/**
 * Create Event Screen (Headmaster only) — NativeWind
 *
 * Uses react-hook-form with zodResolver for validation.
 * Image upload, CalendarPickerModal for dates, activity/district dropdowns.
 */

import React, { useState, useMemo } from 'react';
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
    FlatList,
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
import Toast from 'react-native-toast-message';

const BLUE = '#1E88E5';

/* ── Calendar Picker Modal ── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarPickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean; value: string; onSelect: (d: string) => void; onClose: () => void;
}) {
    const today = new Date();
    const init = value ? new Date(value) : today;
    const [vY, setVY] = useState(init.getFullYear());
    const [vM, setVM] = useState(init.getMonth());
    const selD = value ? new Date(value).getDate() : -1;
    const selM = value ? new Date(value).getMonth() : -1;
    const selY = value ? new Date(value).getFullYear() : -1;
    const days = useMemo(() => {
        const first = new Date(vY, vM, 1).getDay();
        const count = new Date(vY, vM + 1, 0).getDate();
        const c: (number | null)[] = [];
        for (let i = 0; i < first; i++) c.push(null);
        for (let d = 1; d <= count; d++) c.push(d);
        return c;
    }, [vY, vM]);
    const prev = () => { if (vM === 0) { setVM(11); setVY(y => y - 1); } else setVM(m => m - 1); };
    const next = () => { if (vM === 11) { setVM(0); setVY(y => y + 1); } else setVM(m => m + 1); };
    const pick = (day: number) => { const m = String(vM + 1).padStart(2, '0'); const d = String(day).padStart(2, '0'); onSelect(`${vY}-${m}-${d}`); onClose(); };
    const isSel = (d: number) => d === selD && vM === selM && vY === selY;
    const isT = (d: number) => d === today.getDate() && vM === today.getMonth() && vY === today.getFullYear();
    if (!visible) return null;
    return (
        <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity className="flex-1 bg-black/45 justify-center items-center px-7" activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} className="bg-white rounded-[20px] py-5 px-4 w-full max-w-[360px]" style={{ elevation: 10 }}>
                    <View className="flex-row justify-between items-center mb-4 px-1">
                        <TouchableOpacity onPress={prev} className="p-1.5 rounded-lg bg-[#f0f4f8]"><Ionicons name="chevron-back" size={22} color={BLUE} /></TouchableOpacity>
                        <Text className="text-[17px] font-bold" style={{ color: BLUE }}>{MONTHS[vM]} {vY}</Text>
                        <TouchableOpacity onPress={next} className="p-1.5 rounded-lg bg-[#f0f4f8]"><Ionicons name="chevron-forward" size={22} color={BLUE} /></TouchableOpacity>
                    </View>
                    <View className="flex-row mb-2">
                        {WEEKDAYS.map(w => <Text key={w} className="flex-1 text-center text-xs font-semibold text-gray-400">{w}</Text>)}
                    </View>
                    <View className="flex-row flex-wrap">
                        {days.map((day, i) => (
                            <TouchableOpacity
                                key={i}
                                className={`justify-center items-center rounded-xl ${day !== null && isSel(day) ? 'bg-[#1E88E5]' : ''} ${day !== null && isT(day) && !isSel(day) ? 'bg-blue-100' : ''}`}
                                style={{ width: '14.28%', aspectRatio: 1 }}
                                onPress={() => day && pick(day)}
                                disabled={!day}
                            >
                                {day ? <Text className={`text-sm font-medium ${isSel(day) ? 'text-white font-bold' : isT(day) ? 'text-[#1E88E5] font-bold' : 'text-gray-700'}`}>{day}</Text> : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

/* ── Select Modal ── */
function SelectModal({ visible, title, data, selectedValue, onSelect, onClose, loading }: {
    visible: boolean; title: string; data: { id: string; name: string }[]; selectedValue: string; onSelect: (v: string) => void; onClose: () => void; loading?: boolean;
}) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-[20px] max-h-[70%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                        <Text className="text-lg font-semibold text-gray-800">{title}</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color={BLUE} className="p-10" />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className={`py-3.5 px-4 border-b border-gray-100 flex-row justify-between items-center ${selectedValue === item.id ? 'bg-blue-50' : 'bg-white'}`}
                                    onPress={() => { onSelect(item.id); onClose(); }}
                                >
                                    <Text className={`text-base ${selectedValue === item.id ? 'text-[#1E88E5] font-semibold' : 'text-gray-700'}`}>{item.name}</Text>
                                    {selectedValue === item.id && <Ionicons name="checkmark" size={20} color={BLUE} />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text className="text-center p-5 text-gray-500">No items</Text>}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

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
                event_time: undefined,
                location: data.venue.trim(),
                event_type: undefined,
                activity_type: data.activity,
                flyer_url,
                male_participants: parseInt(data.maleParticipants),
                female_participants: parseInt(data.femaleParticipants),
                school_id: user?.faculty?.school_id,
                district_id: data.districtId,
                created_by: user!.id,
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
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.8 });
        if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera permissions.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.8 });
        if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
    };

    const showImageOptions = () => {
        Alert.alert('Add Photo', 'Choose how to add a photo', [
            { text: 'Take Photo', onPress: takePhoto },
            { text: 'Choose from Gallery', onPress: pickImage },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <View className="flex-1" style={{ backgroundColor: BLUE }}>
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />

            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pb-4" style={{ backgroundColor: BLUE, paddingTop: Platform.OS === 'ios' ? 20 : 10 }}>
                <TouchableOpacity onPress={() => router.back()} className="p-1">
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-white">Create Event</Text>
                <View className="w-8" />
            </View>

            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <Text className="text-2xl font-extrabold text-[#1a1a1a] mb-1.5">Create Event</Text>
                <Text className="text-sm text-gray-500 mb-6">Please make sure all the required fields are properly filled.</Text>

                {/* Image Upload */}
                <TouchableOpacity className="w-full h-[150px] rounded-xl border-[1.5px] border-gray-200 justify-center items-center mb-5 overflow-hidden bg-[#fafafa]" onPress={showImageOptions}>
                    {photo ? (
                        <Image source={{ uri: photo.uri }} className="w-full h-full rounded-xl" resizeMode="cover" />
                    ) : (
                        <View className="items-center">
                            <Ionicons name="image-outline" size={48} color="#c0c0c0" />
                            <Text className="text-gray-400 text-[13px] mt-1">IMG</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {photo && (
                    <TouchableOpacity className="self-center mt-1.5 mb-2.5" onPress={() => setPhoto(null)}>
                        <Text className="text-red-500 text-[13px]">Remove photo</Text>
                    </TouchableOpacity>
                )}

                {/* Event Name */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Event Name *</Text>
                <Controller control={control} name="eventName" render={({ field: { onChange, value } }) => (
                    <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} placeholder="Enter Event Name" placeholderTextColor="#b0b0b0" />
                )} />
                {errors.eventName && <Text className="text-xs text-red-500 mt-1">{errors.eventName.message}</Text>}

                {/* Description */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Description *</Text>
                <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
                    <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px]" style={{ textAlignVertical: 'top' }} value={value} onChangeText={onChange} placeholder="Enter Event Description" placeholderTextColor="#b0b0b0" multiline numberOfLines={4} />
                )} />
                {errors.description && <Text className="text-xs text-red-500 mt-1">{errors.description.message}</Text>}

                {/* Starting Date */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Starting Date of Program *</Text>
                <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowStartCal(true)}>
                    <Text className={startDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{formatDisplay(startDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
                {errors.startDate && <Text className="text-xs text-red-500 mt-1">{errors.startDate.message}</Text>}

                {/* Ending Date */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Ending Date of Program *</Text>
                <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowEndCal(true)}>
                    <Text className={endDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{formatDisplay(endDate)}</Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
                {errors.endDate && <Text className="text-xs text-red-500 mt-1">{errors.endDate.message}</Text>}

                {/* Activities */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Activities *</Text>
                <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowActivityModal(true)}>
                    <Text className={activity ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{activity || 'Select option'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                {errors.activity && <Text className="text-xs text-red-500 mt-1">{errors.activity.message}</Text>}

                {/* Venue */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Venue / Place *</Text>
                <Controller control={control} name="venue" render={({ field: { onChange, value } }) => (
                    <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} placeholder="Enter Venue / Place" placeholderTextColor="#b0b0b0" />
                )} />
                {errors.venue && <Text className="text-xs text-red-500 mt-1">{errors.venue.message}</Text>}

                {/* District */}
                <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">District *</Text>
                {loadingDistricts ? (
                    <View className="border border-gray-200 rounded-[10px] px-4 py-3.5"><ActivityIndicator size="small" color={BLUE} /></View>
                ) : (
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowDistrictModal(true)}>
                        <Text className={districtId ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{districtName || 'Select option'}</Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                )}
                {errors.districtId && <Text className="text-xs text-red-500 mt-1">{errors.districtId.message}</Text>}

                {/* Participants */}
                <View className="flex-row gap-4">
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Male Participants *</Text>
                        <Controller control={control} name="maleParticipants" render={({ field: { onChange, value } }) => (
                            <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} keyboardType="numeric" placeholder="0" placeholderTextColor="#b0b0b0" />
                        )} />
                        {errors.maleParticipants && <Text className="text-xs text-red-500 mt-1">{errors.maleParticipants.message}</Text>}
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-4">Female Participants *</Text>
                        <Controller control={control} name="femaleParticipants" render={({ field: { onChange, value } }) => (
                            <TextInput className="border border-gray-200 rounded-[10px] px-4 py-3.5 text-[15px] text-[#1a1a1a]" value={value} onChangeText={onChange} keyboardType="numeric" placeholder="0" placeholderTextColor="#b0b0b0" />
                        )} />
                        {errors.femaleParticipants && <Text className="text-xs text-red-500 mt-1">{errors.femaleParticipants.message}</Text>}
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
                        <Text className="text-base font-bold text-white">Submit</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

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
