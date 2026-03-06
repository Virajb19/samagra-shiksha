/**
 * Create Event Screen - Teacher
 * 
 * Form for approved teachers to create a new school event with photo upload.
 * Photos are uploaded to Firebase Storage.
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
    Platform,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { createEvent } from '../../../src/services/firebase/content.firestore';
import { uploadProfileImage } from '../../../src/services/storage.service';
import { useAuthStore } from '../../../src/lib/store';

type EventType = 'MEETING' | 'EXAM' | 'HOLIDAY' | 'SEMINAR' | 'WORKSHOP' | 'SPORTS' | 'CULTURAL' | 'OTHER';

const EVENT_TYPES: { label: string; value: EventType }[] = [
    { label: 'Meeting', value: 'MEETING' },
    { label: 'Exam', value: 'EXAM' },
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Seminar', value: 'SEMINAR' },
    { label: 'Workshop', value: 'WORKSHOP' },
    { label: 'Sports', value: 'SPORTS' },
    { label: 'Cultural', value: 'CULTURAL' },
    { label: 'Other', value: 'OTHER' },
];

const ACTIVITY_TYPES = [
    'Teachers Training Program',
    'Parent-Teacher Meeting',
    'Annual Day Celebration',
    'Sports Day',
    'Science Exhibition',
    'Cultural Festival',
    'Workshop on NEP 2020',
    'Orientation Program',
    'Career Guidance Seminar',
    'Health Camp',
    'Other',
];

const NAVY = '#2c3e6b';

export default function TeacherCreateEventScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<EventType>('OTHER');
    const [activityType, setActivityType] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
    const [eventTime, setEventTime] = useState('');
    const [location, setLocation] = useState('');
    const [maleParticipants, setMaleParticipants] = useState('');
    const [femaleParticipants, setFemaleParticipants] = useState('');
    const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

    // UI state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showActivityPicker, setShowActivityPicker] = useState(false);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            let flyer_url: string | undefined = undefined;
            if (photo) {
                const uploadResult = await uploadProfileImage(photo.uri);
                flyer_url = uploadResult.fileUrl || undefined;
            }
            return await createEvent({
                title: title.trim(),
                description: description.trim(),
                event_date: eventDate.toISOString().split('T')[0],
                event_time: eventTime.trim() || undefined,
                location: location.trim() || undefined,
                event_type: eventType,
                activity_type: activityType.trim() || undefined,
                flyer_url,
                male_participants: maleParticipants.trim() ? parseInt(maleParticipants.trim()) : undefined,
                female_participants: femaleParticipants.trim() ? parseInt(femaleParticipants.trim()) : undefined,
                school_id: user?.faculty?.school_id,
                created_by: user!.id,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-events'] });
            Alert.alert('Success', 'Event created successfully!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to create event';
            Alert.alert('Error', Array.isArray(message) ? message[0] : message);
        },
    });

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setPhoto(result.assets[0]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setPhoto(result.assets[0]);
        }
    };

    const showImageOptions = () => {
        Alert.alert(
            'Add Photo',
            'Choose how you want to add a photo',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter event title');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter event description');
            return;
        }

        submitMutation.mutate();
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEventDate(selectedDate);
        }
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEventEndDate(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <View className="flex-1 bg-[#f0f2f8]">
            {/* Header */}
            <View className="bg-[#2c3e6b] px-4 pb-10 flex-row items-start" style={{ paddingTop: insets.top + 12 }}>
                <TouchableOpacity
                    className="p-2 mr-2"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text className="text-[28px] font-bold text-white flex-1">Create Event</Text>
                <View className="w-10" />
            </View>

            {/* Form */}
            <View className="flex-1 bg-white -mt-6 rounded-t-[28px] overflow-hidden">
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                    {/* Photo Upload */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Event Photo (Optional)</Text>
                        <TouchableOpacity
                            className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden"
                            onPress={showImageOptions}
                        >
                            {photo ? (
                                <Image
                                    source={{ uri: photo.uri }}
                                    className="w-full h-[200px]"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="h-[150px] justify-center items-center">
                                    <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                                    <Text className="mt-2 text-sm text-gray-400">Tap to add photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {photo && (
                            <TouchableOpacity
                                className="flex-row items-center justify-center mt-2 p-2"
                                onPress={() => setPhoto(null)}
                            >
                                <Ionicons name="close-circle" size={24} color="#ef4444" />
                                <Text className="ml-1 text-red-500 text-sm">Remove photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Title */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Event Title *</Text>
                        <TextInput
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3 text-base text-gray-800"
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Enter event title"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Description */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Description *</Text>
                        <TextInput
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3 text-base text-gray-800 min-h-[100px]"
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Enter event description"
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Event Type */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Event Type *</Text>
                        <TouchableOpacity
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3.5 flex-row justify-between items-center"
                            onPress={() => setShowTypePicker(true)}
                        >
                            <Text className="text-base text-gray-800">
                                {EVENT_TYPES.find(t => t.value === eventType)?.label || 'Select Type'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Activity Type */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Activity Type (Optional)</Text>
                        <TouchableOpacity
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3.5 flex-row justify-between items-center"
                            onPress={() => setShowActivityPicker(true)}
                        >
                            <Text className="text-base text-gray-800">
                                {activityType || 'Select Activity Type'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Event Date */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Event Date *</Text>
                        <TouchableOpacity
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3.5 flex-row justify-between items-center"
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text className="text-base text-gray-800">
                                {formatDate(eventDate)}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={eventDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    )}

                    {/* End Date */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">End Date (Optional - for multi-day events)</Text>
                        <TouchableOpacity
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3.5 flex-row justify-between items-center"
                            onPress={() => setShowEndDatePicker(true)}
                        >
                            <Text className={`text-base ${!eventEndDate ? 'text-gray-400' : 'text-gray-800'}`}>
                                {eventEndDate ? formatDate(eventEndDate) : 'Same as event date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    {showEndDatePicker && (
                        <DateTimePicker
                            value={eventEndDate || eventDate}
                            mode="date"
                            display="default"
                            onChange={onEndDateChange}
                            minimumDate={eventDate}
                        />
                    )}

                    {/* Event Time */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Event Time (Optional)</Text>
                        <TextInput
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3 text-base text-gray-800"
                            value={eventTime}
                            onChangeText={setEventTime}
                            placeholder="e.g., 10:00 AM"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Location */}
                    <View className="mb-5">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Venue / Location (Optional)</Text>
                        <TextInput
                            className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3 text-base text-gray-800"
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Enter event venue"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {/* Participants */}
                    <View className="flex-row">
                        <View className="mb-5 flex-1 mr-2">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Male Participants</Text>
                            <TextInput
                                className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3 text-base text-gray-800"
                                value={maleParticipants}
                                onChangeText={setMaleParticipants}
                                placeholder="0"
                                placeholderTextColor="#9ca3af"
                                keyboardType="numeric"
                            />
                        </View>
                        <View className="mb-5 flex-1 ml-2">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Female Participants</Text>
                            <TextInput
                                className="bg-gray-50 rounded-[10px] border border-gray-200 px-4 py-3 text-base text-gray-800"
                                value={femaleParticipants}
                                onChangeText={setFemaleParticipants}
                                placeholder="0"
                                placeholderTextColor="#9ca3af"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        className={`bg-[#2c3e6b] rounded-xl py-4 items-center mt-6 ${submitMutation.isPending ? 'bg-gray-400' : ''}`}
                        onPress={handleSubmit}
                        disabled={submitMutation.isPending}
                    >
                        {submitMutation.isPending ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-base font-semibold text-white">Create Event</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Type Picker Modal */}
            <Modal visible={showTypePicker} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-[20px] max-h-[70%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <Text className="text-lg font-semibold text-gray-800">Select Event Type</Text>
                            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {EVENT_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.value}
                                    className={`flex-row justify-between items-center py-3.5 px-4 border-b border-gray-100 ${eventType === type.value ? 'bg-[#e8ecf4]' : ''}`}
                                    onPress={() => {
                                        setEventType(type.value);
                                        setShowTypePicker(false);
                                    }}
                                >
                                    <Text
                                        className={`text-base ${eventType === type.value ? 'text-[#2c3e6b] font-semibold' : 'text-gray-700'}`}
                                    >
                                        {type.label}
                                    </Text>
                                    {eventType === type.value && (
                                        <Ionicons name="checkmark" size={20} color={NAVY} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Activity Type Picker Modal */}
            <Modal visible={showActivityPicker} transparent animationType="slide">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-[20px] max-h-[70%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <Text className="text-lg font-semibold text-gray-800">Select Activity Type</Text>
                            <TouchableOpacity onPress={() => setShowActivityPicker(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {ACTIVITY_TYPES.map((activity) => (
                                <TouchableOpacity
                                    key={activity}
                                    className={`flex-row justify-between items-center py-3.5 px-4 border-b border-gray-100 ${activityType === activity ? 'bg-[#e8ecf4]' : ''}`}
                                    onPress={() => {
                                        setActivityType(activity);
                                        setShowActivityPicker(false);
                                    }}
                                >
                                    <Text
                                        className={`text-base ${activityType === activity ? 'text-[#2c3e6b] font-semibold' : 'text-gray-700'}`}
                                    >
                                        {activity}
                                    </Text>
                                    {activityType === activity && (
                                        <Ionicons name="checkmark" size={20} color={NAVY} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
