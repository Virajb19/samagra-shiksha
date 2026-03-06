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
    StyleSheet,
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

/* ── Calendar Picker Modal ── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarPickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean;
    value: string;
    onSelect: (dateStr: string) => void;
    onClose: () => void;
}) {
    const today = new Date();
    const initialDate = value ? new Date(value) : today;
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const selectedDay = value ? new Date(value).getDate() : -1;
    const selectedMonth = value ? new Date(value).getMonth() : -1;
    const selectedYear = value ? new Date(value).getFullYear() : -1;

    const days = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }, [viewYear, viewMonth]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleSelect = (day: number) => {
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onSelect(`${viewYear}-${m}-${d}`);
        onClose();
    };

    const isToday = (day: number) => day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isSelected = (day: number) => day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;

    if (!visible) return null;

    return (
        <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={calStyles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={calStyles.card}>
                    <View style={calStyles.header}>
                        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
                            <Ionicons name="chevron-back" size={22} color="#2c3e6b" />
                        </TouchableOpacity>
                        <Text style={calStyles.monthText}>{MONTHS[viewMonth]} {viewYear}</Text>
                        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
                            <Ionicons name="chevron-forward" size={22} color="#2c3e6b" />
                        </TouchableOpacity>
                    </View>
                    <View style={calStyles.weekRow}>
                        {WEEKDAYS.map(w => <Text key={w} style={calStyles.weekLabel}>{w}</Text>)}
                    </View>
                    <View style={calStyles.grid}>
                        {days.map((day, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[
                                    calStyles.dayCell,
                                    day !== null && isSelected(day) ? calStyles.dayCellSelected : null,
                                    day !== null && isToday(day) && !isSelected(day) ? calStyles.dayCellToday : null,
                                ]}
                                onPress={() => day && handleSelect(day)}
                                disabled={!day}
                            >
                                {day ? (
                                    <Text style={[
                                        calStyles.dayText,
                                        isSelected(day) && calStyles.dayTextSelected,
                                        isToday(day) && !isSelected(day) && calStyles.dayTextToday,
                                    ]}>{day}</Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={calStyles.todayBtn} onPress={() => handleSelect(today.getDate())}>
                        <Text style={calStyles.todayBtnText}>Today</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const calStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
    card: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 16, width: '100%', maxWidth: 360, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
    navBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f0f4f8' },
    monthText: { fontSize: 17, fontWeight: '700', color: '#2c3e6b' },
    weekRow: { flexDirection: 'row', marginBottom: 8 },
    weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9ca3af' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
    dayCellSelected: { backgroundColor: '#2c3e6b' },
    dayCellToday: { backgroundColor: '#e8ecf4' },
    dayText: { fontSize: 14, fontWeight: '500', color: '#374151' },
    dayTextSelected: { color: '#ffffff', fontWeight: '700' },
    dayTextToday: { color: '#2c3e6b', fontWeight: '700' },
    todayBtn: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e8ecf4' },
    todayBtnText: { fontSize: 13, fontWeight: '600', color: '#2c3e6b' },
});

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

                {/* Date of Joining */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">Date of Joining *</Text>
                    <TouchableOpacity
                        className="bg-white rounded-lg border border-[#d1d5db] px-4 py-[14px] flex-row justify-between items-center"
                        onPress={() => setDatePickerVisible(true)}
                    >
                        <Text className={dateOfJoining ? 'text-base text-[#1f2937]' : 'text-base text-[#9ca3af]'}>
                            {dateOfJoining || 'Select date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    {errors.dateOfJoining && (
                        <Text className="text-xs text-red-500 mt-1">{errors.dateOfJoining.message}</Text>
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

                {/* Aadhaar Number */}
                <View className="mb-5">
                    <Text className="text-sm font-semibold text-[#374151] mb-2">Aadhaar Number *</Text>
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
                        <Text className="text-xs text-red-500 mt-1">{errors.aadhaarNumber.message}</Text>
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
