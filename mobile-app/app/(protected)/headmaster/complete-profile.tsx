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
import {
    View,
    Text,
    StyleSheet,
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
import { District, School, RESPONSIBILITY_OPTIONS } from '../../../src/types';
import { getDistricts, getSchools } from '../../../src/services/firebase/master-data.firestore';
import { completeHMTeacherProfile } from '../../../src/services/firebase/profile.firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HMTeacherProfileSchema, HMTeacherProfileFormData } from '../../../src/lib/zod';
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
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
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
                                    style={[
                                        styles.modalItem,
                                        selectedValue === item.id && styles.modalItemSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(item.id);
                                        onClose();
                                    }}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        selectedValue === item.id && styles.modalItemTextSelected,
                                    ]}>
                                        {item.name}
                                    </Text>
                                    {selectedValue === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#2c3e6b" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No items available</Text>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

export default function CompleteProfileScreen() {
    const { user, refreshUser } = useAuthStore();

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
            Alert.alert('Success', 'Profile completed successfully! Your account is now under verification.', [
                { text: 'OK', onPress: () => router.replace('/(protected)/headmaster/(tabs)/home') },
            ]);
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
            <StatusBar barStyle="light-content" backgroundColor="#2c3e6b" />

            {/* Navy Header */}
            <View style={styles.headerSection}>
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/nbse-logo.png')}
                            style={styles.headerLogo}
                            resizeMode="cover"
                        />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Complete Profile</Text>
                        <Text style={styles.headerSubtitle}>Add your experience details</Text>
                    </View>
                </View>
            </View>

            {/* White Card */}
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Add Experience</Text>
                <Text style={styles.subtitle}>
                    Please make sure all the required fields are properly filled.
                </Text>

                {/* Warning Banner */}
                <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={20} color="#856404" />
                    <Text style={styles.warningText}>
                        Important: You can only create your profile once. Please ensure all information is correct before submitting as it cannot be edited later.
                    </Text>
                </View>

                {/* District Select */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>District *</Text>
                    {loadingDistricts ? (
                        <View style={styles.pickerButton}>
                            <ActivityIndicator size="small" color="#2c3e6b" />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setDistrictModalVisible(true)}
                        >
                            <Text style={selectedDistrict ? styles.pickerButtonText : styles.pickerPlaceholder}>
                                {selectedDistrictName || 'Select District'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.districtId && (
                        <Text style={styles.errorText}>{errors.districtId.message}</Text>
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
                    <Text style={styles.label}>School (Currently Employed In) *</Text>
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
                            <Text style={selectedSchool ? styles.pickerButtonText : styles.pickerPlaceholder}>
                                {selectedSchoolName || (selectedDistrict ? 'Select School' : 'Select District First')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    {errors.schoolId && (
                        <Text style={styles.errorText}>{errors.schoolId.message}</Text>
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
                    <Text style={styles.label}>Total Years of Experience *</Text>
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
                        <Text style={styles.errorText}>{errors.yearsOfExperience.message}</Text>
                    )}
                </View>

                {/* Role Assigned (Responsibilities) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Role Assigned</Text>
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
                                    <Text style={styles.checkboxLabel}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Personal Details (Read-only) */}
                <Text style={styles.sectionTitle}>Personal Details</Text>
                <Text style={styles.sectionSubtitle}>
                    To update Personal Details, go to Settings {'>'} Edit Profile
                </Text>

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.readOnlyInput}>
                        <Text style={styles.readOnlyText}>{user?.name || ''}</Text>
                    </View>
                </View>

                <View style={styles.rowFields}>
                    <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.readOnlyInput}>
                            <Text style={styles.readOnlyText}>
                                {user?.gender === 'MALE' ? 'Male' : user?.gender === 'FEMALE' ? 'Female' : '-'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.readOnlyInput}>
                            <Text style={styles.readOnlyText}>{user?.phone || ''}</Text>
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
                        <Text style={styles.submitButtonText}>Submit</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#2c3e6b',
    },
    headerSection: {
        backgroundColor: '#2c3e6b',
        paddingTop: Platform.OS === 'ios' ? 20 : 10,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    headerLogo: {
        width: 50,
        height: 50,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },
    headerSubtitle: {
        fontSize: 13,
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
        backgroundColor: '#2c3e6b',
        borderColor: '#2c3e6b',
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
        backgroundColor: '#2c3e6b',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    modalItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalItemSelected: {
        backgroundColor: '#e8ecf4',
    },
    modalItemText: {
        fontSize: 16,
        color: '#374151',
    },
    modalItemTextSelected: {
        color: '#2c3e6b',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: '#6b7280',
        fontSize: 14,
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
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#856404',
        lineHeight: 18,
    },
});
