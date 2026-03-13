/**
 * Headmaster Complete Profile Screen
 * 
 * Form for headmasters to complete their profile with:
 * - District selection
 * - School selection
 * - Total years of experience
 * - Role Assigned (responsibilities checkboxes)
 * - Read-only personal details
 * 
 * Uses react-hook-form with zod validation.
 */

import React, { useState } from 'react';
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
import { District, School, RESPONSIBILITY_OPTIONS } from '../../../src/types';
import { getDistricts, getSchools } from '../../../src/services/firebase/master-data.firestore';
import { completeHMTeacherProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HMTeacherProfileSchema, HMTeacherProfileFormData } from '../../../src/lib/zod';
import SelectModal from '../../../src/components/SelectModal';
import Toast from 'react-native-toast-message';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';

const BLUE = '#1565C0';

export default function CompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();
    const isActive = user?.is_active ?? false;

    // React Hook Form
    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<HMTeacherProfileFormData>({
        resolver: zodResolver(HMTeacherProfileSchema),
        defaultValues: {
            districtId: '',
            schoolId: '',
            yearsOfExperience: '0',
            responsibilities: [],
        },
    });

    const selectedDistrict = watch('districtId');
    const selectedSchool = watch('schoolId');
    const selectedResponsibilities = watch('responsibilities');

    // Modal visibility state
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [schoolModalVisible, setSchoolModalVisible] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Fetch districts from Firestore
    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    // Fetch schools based on selected district from Firestore
    const { data: schools = [], isLoading: loadingSchools } = useQuery<School[]>({
        queryKey: ['schools', selectedDistrict],
        queryFn: () => getSchools(selectedDistrict),
        enabled: !!selectedDistrict,
    });

    // Get selected district and school names for display
    const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || '';
    const selectedSchoolName = schools.find(s => s.id === selectedSchool)?.name || '';

    // Toggle a responsibility selection
    const toggleResponsibility = (item: string) => {
        const current = selectedResponsibilities || [];
        const updated = current.includes(item)
            ? current.filter(r => r !== item)
            : [...current, item];
        setValue('responsibilities', updated);
    };

    // Submit profile mutation
    const submitMutation = useMutation({
        mutationFn: async (data: HMTeacherProfileFormData) => {
            if (!user) throw new Error('Not authenticated');
            return completeHMTeacherProfile({
                userId: user.id,
                schoolId: data.schoolId,
                yearsOfExperience: parseInt(data.yearsOfExperience),
                responsibilities: data.responsibilities,
                role: 'HEADMASTER',
                currentUser: user,
            });
        },
        onSuccess: async () => {
            await refreshUser();
            setShowSuccessModal(true);
        },
        onError: (error: any) => {
            const message = error.message || 'Failed to complete profile';
            Alert.alert('Error', message);
        },
    });

    const onSubmit = (data: HMTeacherProfileFormData) => {
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
                        <AppText style={styles.headerSubtitle}>Add your experience details</AppText>
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

                {/* District Select */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>District *</AppText>
                    {loadingDistricts ? (
                        <View style={styles.pickerButton}>
                            <ActivityIndicator size="small" color="#2c3e6b" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setDistrictModalVisible(true)}
                        >
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
                    onSelect={(value) => {
                        setValue('districtId', value, { shouldValidate: true });
                        setValue('schoolId', '');
                    }}
                    loading={loadingDistricts}
                />

                {/* School Select */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>School (Currently Employed In) *</AppText>
                    {loadingSchools && selectedDistrict ? (
                        <View style={styles.pickerButton}>
                            <ActivityIndicator size="small" color="#2c3e6b" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.pickerButton, !selectedDistrict && styles.pickerButtonDisabled]}
                            onPress={() => selectedDistrict && setSchoolModalVisible(true)}
                            disabled={!selectedDistrict}
                        >
                            <AppText style={selectedSchool ? styles.pickerButtonText : styles.pickerPlaceholder}>
                                {selectedSchoolName || (selectedDistrict ? 'Select School' : 'Select District First')}
                            </AppText>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.schoolId && (
                        <AppText style={styles.errorText}>{errors.schoolId.message}</AppText>
                    )}
                </View>

                <SelectModal
                    visible={schoolModalVisible}
                    onClose={() => setSchoolModalVisible(false)}
                    title="Select School"
                    data={schools}
                    selectedValue={selectedSchool}
                    onSelect={(value) => setValue('schoolId', value, { shouldValidate: true })}
                    loading={loadingSchools}
                />

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

                {/* Role Assigned (Responsibilities) */}
                <View style={styles.fieldContainer}>
                    <AppText style={styles.label}>Role Assigned</AppText>
                    <View style={styles.checkboxGroup}>
                        {RESPONSIBILITY_OPTIONS.map((item) => {
                            const isSelected = (selectedResponsibilities || []).includes(item);
                            return (
                                <TouchableOpacity
                                    key={item}
                                    style={styles.checkboxRow}
                                    onPress={() => toggleResponsibility(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                    <AppText style={styles.checkboxLabel}>{item}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
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
                    router.replace('/(protected)/headmaster/(tabs)/home');
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: BLUE,
    },
    headerSection: {
        backgroundColor: BLUE,
        paddingTop: Platform.OS === 'ios' ? 20 : 10,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 2,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    pickerButton: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickerButtonDisabled: {
        backgroundColor: '#f3f4f6',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#1f2937',
    },
    pickerPlaceholder: {
        fontSize: 16,
        color: '#9ca3af',
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    checkboxGroup: {
        marginTop: 4,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: BLUE,
        borderColor: BLUE,
    },
    checkboxLabel: {
        fontSize: 15,
        color: '#374151',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 20,
    },
    rowFields: {
        flexDirection: 'row',
    },
    readOnlyInput: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    readOnlyText: {
        fontSize: 16,
        color: '#6b7280',
    },
    submitButton: {
        backgroundColor: BLUE,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },

    warningBanner: {
        backgroundColor: '#fff3cd',
        borderWidth: 1,
        borderColor: '#ffc107',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 8,
    },
    warningIcon: {
        width: 20,
        height: 20,
        marginTop: 1,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#856404',
        lineHeight: 18,
    },
    warningTextBold: {
        fontSize: 13,
        color: '#856404',
    },
});
