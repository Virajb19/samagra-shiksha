/**
 * Edit Personal Details Screen - Headmaster
 * 
 * Allows editing only: name, phone, gender
 * (Not profile info like school, qualification, experience)
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/lib/store';
import { updatePersonalDetails } from '../../../src/services/firebase/users.firestore';

type Gender = 'MALE' | 'FEMALE';

interface FormData {
    name: string;
    phone: string;
    gender: Gender | null;
}

export default function EditPersonalDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<FormData>({
        name: user?.name || '',
        phone: user?.phone || '',
        gender: (user?.gender as Gender) || null,
    });

    const [errors, setErrors] = useState<Partial<FormData>>({});

    // Update form when user data changes
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                gender: (user.gender as Gender) || null,
            });
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: async (data: FormData) => {
            await updatePersonalDetails(user!.id, data);
        },
        onSuccess: async () => {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['faculty-profile'] });
            Alert.alert('Success', 'Personal details updated successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        },
        onError: (error: any) => {
            const message = error?.message || 'Failed to update details';
            Alert.alert('Error', message);
        },
    });

    const validateForm = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!formData.phone?.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
            newErrors.phone = 'Enter a valid 10-digit phone number';
        }

        if (!formData.gender) {
            newErrors.gender = 'Gender is required' as any;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            updateMutation.mutate(formData);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Personal Details</Text>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle" size={20} color="#3b82f6" />
                        <Text style={styles.infoBannerText}>
                            You can only edit your personal details here. School and qualification details cannot be changed.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Name Field */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                                <Ionicons name="person-outline" size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9ca3af"
                                    value={formData.name}
                                    onChangeText={(text) => {
                                        setFormData({ ...formData, name: text });
                                        if (errors.name) setErrors({ ...errors, name: undefined });
                                    }}
                                />
                            </View>
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name}</Text>
                            )}
                        </View>

                        {/* Phone Field */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Phone Number *</Text>
                            <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                                <Ionicons name="call-outline" size={20} color="#6b7280" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter 10-digit phone number"
                                    placeholderTextColor="#9ca3af"
                                    value={formData.phone}
                                    onChangeText={(text) => {
                                        // Only allow digits
                                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                                        setFormData({ ...formData, phone: cleaned });
                                        if (errors.phone) setErrors({ ...errors, phone: undefined });
                                    }}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                            {errors.phone && (
                                <Text style={styles.errorText}>{errors.phone}</Text>
                            )}
                        </View>

                        {/* Gender Field */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Gender *</Text>
                            <View style={styles.genderContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.genderOption,
                                        formData.gender === 'MALE' && styles.genderSelected,
                                    ]}
                                    onPress={() => {
                                        setFormData({ ...formData, gender: 'MALE' });
                                        setErrors({ ...errors, gender: undefined });
                                    }}
                                >
                                    <Ionicons
                                        name="male"
                                        size={20}
                                        color={formData.gender === 'MALE' ? '#2c3e6b' : '#6b7280'}
                                    />
                                    <Text
                                        style={[
                                            styles.genderText,
                                            formData.gender === 'MALE' && styles.genderTextSelected,
                                        ]}
                                    >
                                        Male
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.genderOption,
                                        formData.gender === 'FEMALE' && styles.genderSelected,
                                    ]}
                                    onPress={() => {
                                        setFormData({ ...formData, gender: 'FEMALE' });
                                        setErrors({ ...errors, gender: undefined });
                                    }}
                                >
                                    <Ionicons
                                        name="female"
                                        size={20}
                                        color={formData.gender === 'FEMALE' ? '#2c3e6b' : '#6b7280'}
                                    />
                                    <Text
                                        style={[
                                            styles.genderText,
                                            formData.gender === 'FEMALE' && styles.genderTextSelected,
                                        ]}
                                    >
                                        Female
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {errors.gender && (
                                <Text style={styles.errorText}>{String(errors.gender)}</Text>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Submit Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.submitButton, updateMutation.isPending && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                            <Text style={styles.submitButtonText}>Save Changes</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f8',
    },
    header: {
        backgroundColor: '#2c3e6b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    placeholder: {
        width: 40,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#3b82f6',
        lineHeight: 18,
    },
    form: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e6b',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#1f2937',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    genderOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 14,
        gap: 8,
    },
    genderSelected: {
        backgroundColor: '#e8eaf6',
        borderColor: '#2c3e6b',
    },
    genderText: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
    },
    genderTextSelected: {
        color: '#2c3e6b',
    },
    footer: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2c3e6b',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});
