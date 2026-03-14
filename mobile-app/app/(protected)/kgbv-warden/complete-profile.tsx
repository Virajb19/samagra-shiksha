/**
 * KGBV Warden Complete Profile Screen
 * 
 * Form for KGBV wardens to complete their profile with:
 * - KGBV Type (TYPE_I / TYPE_II / TYPE_III / TYPE_IV)
 * - KGBV Location (residential_location)
 * - District
 * - Date of Joining
 * - Qualification
 * - Total Years of Experience
 * - EBRC
 * - Aadhaar Number
 * - Read-only personal details
 * 
 * Uses react-hook-form with zod validation.
 */

import React, { useState, useMemo } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    StyleSheet,
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
import { District, KGBVType } from '../../../src/types';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import { completeKGBVWardenProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KGBVProfileSchema, KGBVProfileFormData } from '../../../src/lib/zod';
import CalendarPickerModal from '../../../src/components/CalendarPickerModal';
import SelectModal from '../../../src/components/SelectModal';
import Toast from 'react-native-toast-message';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';

const BLUE = '#1565C0';

const KGBV_TYPES: { id: KGBVType; name: string }[] = [
    { id: 'TYPE_I', name: 'Type I' },
    { id: 'TYPE_II', name: 'Type II' },
    { id: 'TYPE_III', name: 'Type III' },
    { id: 'TYPE_IV', name: 'Type IV' },
];


export default function KGBVCompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();
    const isActive = user?.is_active ?? false;

    // React Hook Form
    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<KGBVProfileFormData>({
        resolver: zodResolver(KGBVProfileSchema),
        defaultValues: {
            kgbvType: undefined,
            kgbvLocation: '',
            districtId: '',
            dateOfJoining: '',
            qualification: '',
            yearsOfExperience: '0',
            ebrc: '',
            aadhaarNumber: '',
        },
    });

    const kgbvType = watch('kgbvType');
    const selectedDistrict = watch('districtId');

    // Modal visibility
    const [kgbvTypeModalVisible, setKgbvTypeModalVisible] = useState(false);
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const dateOfJoining = watch('dateOfJoining');

    // Fetch districts from Firestore
    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';
    const selectedKgbvTypeName = KGBV_TYPES.find(t => t.id === kgbvType)?.name || '';

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: KGBVProfileFormData) => {
            if (!user) throw new Error('Not authenticated');
            return completeKGBVWardenProfile({
                userId: user.id,
                kgbvType: data.kgbvType as KGBVType,
                residentialLocation: data.kgbvLocation.trim(),
                districtId: data.districtId,
                dateOfJoining: data.dateOfJoining.trim(),
                qualification: data.qualification.trim(),
                yearsOfExperience: parseInt(data.yearsOfExperience),
                ebrc: data.ebrc.trim(),
                aadhaarNumber: data.aadhaarNumber.trim(),
                currentUser: user,
            });
        },
        onSuccess: async () => {
            await refreshUser();
            setShowSuccessModal(true);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to complete profile');
        },
    });

    const onSubmit = (data: KGBVProfileFormData) => {
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
        <View style={styles.outerContainer}>
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />

            {/* Navy Header */}
            <View style={styles.headerSection}>
                <View style={styles.headerContent}>
                    <View>
                        <AppText style={styles.headerTitle}>Complete Profile</AppText>
                        <AppText style={styles.headerSubtitle}>KGBV Warden Details</AppText>
                    </View>
                </View>
            </View>

            {/* White Card */}
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <AppText style={styles.title}>Add Experience</AppText>
                <AppText style={styles.subtitle}>
                    Please make sure all the required fields are properly filled.
                </AppText>

                {/* Warning Banner */}
                <View style={styles.warningBanner}>
                    <Image source={require('../../../assets/warning.png')} style={styles.warningIcon} resizeMode="contain" />
                    <AppText style={styles.warningText}>
                        <AppText weight="bold" style={styles.warningTextBold}>Important:</AppText> You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
                    </AppText>
                </View>

                {/* KGBV Type */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>KGBV Type *</AppText>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setKgbvTypeModalVisible(true)}>
                        <AppText style={kgbvType ? styles.pickerButtonText : styles.pickerPlaceholder}>
                            {selectedKgbvTypeName || 'Select KGBV Type'}
                        </AppText>
                        <Ionicons name="chevron-down" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    {errors.kgbvType && (
                        <AppText style={styles.errorText}>{errors.kgbvType.message}</AppText>
                    )}
                </View>

                <SelectModal
                    visible={kgbvTypeModalVisible}
                    onClose={() => setKgbvTypeModalVisible(false)}
                    title="Select KGBV Type"
                    data={KGBV_TYPES}
                    selectedValue={kgbvType || ''}
                    onSelect={(value) => setValue('kgbvType', value as KGBVProfileFormData['kgbvType'], { shouldValidate: true })}
                />

                {/* KGBV Location */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>KGBV Location *</AppText>
                    <Controller
                        control={control}
                        name="kgbvLocation"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={styles.input}
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter KGBV location"
                            />
                        )}
                    />
                    {errors.kgbvLocation && (
                        <AppText style={styles.errorText}>{errors.kgbvLocation.message}</AppText>
                    )}
                </View>

                {/* District */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>District *</AppText>
                    {loadingDistricts ? (
                        <View style={styles.pickerButton}>
                            <ActivityIndicator size="small" color="#2c3e6b" />
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.pickerButton} onPress={() => setDistrictModalVisible(true)}>
                            <AppText style={selectedDistrict ? styles.pickerButtonText : styles.pickerPlaceholder}>
                                {selectedDistrictName || 'Select District'}
                            </AppText>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.districtId && (
                        <AppText style={styles.errorText}>{errors.districtId.message}</AppText>
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

                {/* Date of Joining */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>Date of Joining *</AppText>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setDatePickerVisible(true)}>
                        <AppText style={dateOfJoining ? styles.pickerButtonText : styles.pickerPlaceholder}>
                            {dateOfJoining || 'Select date'}
                        </AppText>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    {errors.dateOfJoining && (
                        <AppText style={styles.errorText}>{errors.dateOfJoining.message}</AppText>
                    )}
                </View>

                <CalendarPickerModal
                    visible={datePickerVisible}
                    value={dateOfJoining}
                    onSelect={(v) => setValue('dateOfJoining', v, { shouldValidate: true })}
                    onClose={() => setDatePickerVisible(false)}
                />

                {/* Qualification */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>Qualification *</AppText>
                    <Controller
                        control={control}
                        name="qualification"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={styles.input}
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter your qualification"
                            />
                        )}
                    />
                    {errors.qualification && (
                        <AppText style={styles.errorText}>{errors.qualification.message}</AppText>
                    )}
                </View>

                {/* Years of Experience */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>Total Years of Experience *</AppText>
                    <Controller
                        control={control}
                        name="yearsOfExperience"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={styles.input}
                                value={value}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                        )}
                    />
                    {errors.yearsOfExperience && (
                        <AppText style={styles.errorText}>{errors.yearsOfExperience.message}</AppText>
                    )}
                </View>

                {/* EBRC */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>EBRC *</AppText>
                    <Controller
                        control={control}
                        name="ebrc"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={styles.input}
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter EBRC name"
                            />
                        )}
                    />
                    {errors.ebrc && (
                        <AppText style={styles.errorText}>{errors.ebrc.message}</AppText>
                    )}
                </View>

                {/* Aadhaar Number */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>Aadhaar Number *</AppText>
                    <Controller
                        control={control}
                        name="aadhaarNumber"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                style={styles.input}
                                value={value}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                placeholder="Enter 12-digit Aadhaar number"
                                maxLength={12}
                            />
                        )}
                    />
                    {errors.aadhaarNumber && (
                        <AppText style={styles.errorText}>{errors.aadhaarNumber.message}</AppText>
                    )}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Personal Details (Read-only) */}
                <AppText style={styles.sectionTitle}>Personal Details</AppText>
                <AppText style={styles.sectionSubtitle}>
                    To update Personal Details, go to Settings {'>'} Edit Profile
                </AppText>

                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>Full Name</AppText>
                    <View style={styles.readOnlyInput}>
                        <AppText style={styles.readOnlyText}>{user?.name || ''}</AppText>
                    </View>
                </View>

                <View style={styles.rowFields}>
                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                        <AppText style={styles.label}>Gender</AppText>
                        <View style={styles.readOnlyInput}>
                            <AppText style={styles.readOnlyText}>
                                {user?.gender === 'MALE' ? 'Male' : user?.gender === 'FEMALE' ? 'Female' : '-'}
                            </AppText>
                        </View>
                    </View>
                    <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                        <AppText style={styles.label}>Phone Number</AppText>
                        <View style={styles.readOnlyInput}>
                            <AppText style={styles.readOnlyText}>{user?.phone || ''}</AppText>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitMutation.isPending && styles.submitButtonDisabled]}
                    onPress={handleSubmit(onSubmit, onFormError)}
                    disabled={submitMutation.isPending}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <AppText style={styles.submitButtonText}>Submit</AppText>
                    )}
                </TouchableOpacity>

                {/* Verified Banner */}
                {isActive && (
                    <View
                        style={{
                            borderWidth: 1.5,
                            borderStyle: 'dashed',
                            borderColor: '#34d399',
                            backgroundColor: '#ecfdf5',
                            borderRadius: 12,
                            paddingVertical: 14,
                            marginTop: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <AppText style={{ fontSize: 15, fontWeight: '600', color: '#10b981' }}>Your account is verified</AppText>
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

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: BLUE },
    headerSection: { backgroundColor: BLUE, paddingTop: Platform.OS === 'ios' ? 20 : 10, paddingBottom: 24, paddingHorizontal: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
    container: { flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    content: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
    fieldContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    pickerButton: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerButtonText: { fontSize: 16, color: '#1f2937' },
    pickerPlaceholder: { fontSize: 16, color: '#9ca3af' },
    input: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1f2937' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
    sectionSubtitle: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
    rowFields: { flexDirection: 'row' },
    readOnlyInput: { backgroundColor: '#f3f4f6', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 12 },
    readOnlyText: { fontSize: 16, color: '#6b7280' },
    submitButton: { backgroundColor: BLUE, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    submitButtonDisabled: { backgroundColor: '#9ca3af' },
    submitButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
    errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },

    warningBanner: { backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffc107', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 8 },
    warningIcon: { width: 20, height: 20, marginTop: 1 },
    warningText: { flex: 1, fontSize: 13, color: '#856404', lineHeight: 18 },
    warningTextBold: { fontSize: 13, color: '#856404' },
});
