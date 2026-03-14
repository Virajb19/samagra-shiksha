/**
 * Self Defense Activity Form Screen (Single-page)
 *
 * Fields:
 * - Photo (proof/selfie image)
 * - Number of classes in a week
 * - Number of classes in a month
 * - Number of girl participants
 * - Number of girls benefited
 * - Instructor's name
 * - Contact number
 *
 * Uses react-hook-form + zodResolver for validation.
 */

import React, { useCallback } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import {
    SelfDefenseFormSchema,
    type SelfDefenseFormData,
} from '../../src/lib/zod';
import {
    submitSelfDefenseForm,
    getSelfDefenseFormSubmission,
    type SelfDefenseFormSubmission,
} from '../../src/services/firebase/self-defense-form.firestore';
import { getFacultyByUserId } from '../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';
import BackToActivityFormsButton from '../../src/components/BackToActivityFormsButton';

const BLUE = '#1565C0';
const INPUT_TEXT_STYLE = { fontFamily: 'Lato-Regular' } as const;
const PLACEHOLDER_TEXT_COLOR = '#9ca3af';

// ─── Header ──────────────────────────

function FormHeader() {
    return (
        <View className="px-5 pt-5 pb-4 bg-white">
            <AppText className="text-2xl font-bold text-[#1a1a1a] mb-1">Self Defense</AppText>
            <AppText className="text-sm text-gray-500">
                Please make sure all the required fields are properly filled.
            </AppText>
        </View>
    );
}

// ─── Submission Table ──────────────────────────

function SelfDefenseFormDataTable({ submission }: { submission: SelfDefenseFormSubmission }) {

    return (
        <View className="mt-6 mb-4">
            <AppText className="text-lg font-bold text-[#1a1a1a] mb-3">Your Recent Self Defense Submission</AppText>
                <View
                    key={submission.id}
                    className="bg-white rounded-2xl mb-3 p-4"
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                    <View className="flex-row items-center mb-2">
                        <View className="flex-1">
                            <AppText className="text-base font-bold text-[#1a1a1a]">{submission.school_name || 'Self Defense Submission'}</AppText>
                            <AppText className="text-xs text-gray-500">
                                {new Date(submission.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </AppText>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        {submission.photo ? (
                            <View className="mb-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Photo</AppText>
                                <Image source={{ uri: submission.photo }} className="w-20 h-20 rounded-lg" />
                            </View>
                        ) : null}
                        <DataRow label="Classes/Week" value={submission.classes_per_week} />
                        <DataRow label="Classes/Month" value={submission.classes_per_month} />
                        <DataRow label="Girl Participants" value={submission.girl_participants} />
                        <DataRow label="Girls Benefited" value={submission.girls_benefited} />
                        <DataRow label="Instructor" value={submission.instructor_name} />
                        <DataRow label="Contact" value={submission.contact_number} />
                        <PdfFilesSection submission={submission as unknown as Record<string, unknown>} />
                    </View>
                </View>
        </View>
    );
}

function DataRow({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row py-1.5">
            <AppText className="text-xs text-gray-500 w-[45%]">{label}</AppText>
            <AppText className="text-xs font-medium text-[#1a1a1a] flex-1">{value || '—'}</AppText>
        </View>
    );
}

function PdfFilesSection({ submission }: { submission: Record<string, unknown> }) {
    const pdfEntries = Object.entries(submission)
        .filter(([_, value]) => typeof value === 'string' && /^https?:\/\//i.test(value) && value.toLowerCase().includes('.pdf'))
        .map(([key, value]) => ({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
            url: value as string,
        }));

    if (!pdfEntries.length) return null;

    const openPdf = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
            Alert.alert('Unable to open file', 'No app found to open this file.');
            return;
        }
        await Linking.openURL(url);
    };

    return (
        <View className="mt-3">
            <AppText className="text-xs font-semibold text-gray-600 mb-2">Uploaded PDFs</AppText>
            {pdfEntries.map((file) => (
                <View key={file.label} className="flex-row items-center justify-between py-2 border-t border-gray-100">
                    <AppText className="text-xs text-[#1a1a1a] flex-1 mr-2">{file.label}</AppText>
                    <TouchableOpacity className="flex-row items-center" onPress={() => openPdf(file.url)}>
                        <Ionicons name="eye-outline" size={16} color={BLUE} />
                        <AppText className="text-xs font-bold ml-1" style={{ color: BLUE }}>View file</AppText>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function SelfDefenseFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [showSubmitSuccessBanner, setShowSubmitSuccessBanner] = React.useState(false);

    // Authorization check — only teachers with Self Defence responsibility can access
    const isAuthorized = user?.responsibilities?.includes('Self Defence') ?? false;

    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} formName="Self Defence" />
            </View>
        );
    }

    const form = useForm<SelfDefenseFormData>({
        resolver: zodResolver(SelfDefenseFormSchema),
        defaultValues: {
            photo: '',
            classesPerWeek: '0',
            classesPerMonth: '0',
            girlParticipants: '0',
            girlsBenefited: '0',
            instructorName: '',
            contactNumber: '',
        },
    });

    const { control, watch, setValue, formState: { errors }, handleSubmit } = form;
    const photo = watch('photo');

    const { data: recentSubmission, refetch: refetchRecentSubmission } = useQuery({
        queryKey: ['self-defense-form-submission', user?.id],
        queryFn: () => getSelfDefenseFormSubmission(user!.id),
        enabled: !!user?.id,
    });

    const submitMutation = useMutation({
        mutationKey: ['teacher-form-upload'],
        mutationFn: async (data: SelfDefenseFormData) => {
            const faculty = await getFacultyByUserId(user!.id);
            return submitSelfDefenseForm(data, {
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                schoolId: faculty?.school_id || '',
                schoolName: faculty?.school?.name || '',
                district: faculty?.school?.district_name || faculty?.school?.district_id || '',
                udise: faculty?.school?.registration_code || '',
            });
        },
        onSuccess: () => {
            Toast.show({ type: 'success', text1: 'Self Defense form submitted successfully!' });
            refetchRecentSubmission();
            queryClient.invalidateQueries({ queryKey: ['self-defense-form-submission'] });
            queryClient.invalidateQueries({ queryKey: ['self-defense-form-submissions'] });
            setShowSubmitSuccessBanner(true);
            setShowTable(true);
        },
        onError: (error) => {
            Toast.show({ type: 'error', text1: 'Failed to submit', text2: error.message });
        },
    });

    const [showTable, setShowTable] = React.useState(false);

    const pickPhoto = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: false,
            quality: 0.7,
        });
        if (!result.canceled && result.assets.length > 0) {
            setValue('photo', result.assets[0].uri, { shouldValidate: true });
        }
    }, [setValue]);

    const onSubmit = (data: SelfDefenseFormData) => submitMutation.mutate(data);

    const onFormError = () => {
        Toast.show({ type: 'error', text1: 'Please fill all required fields', text2: 'Scroll up to see the errors' });
    };

    // ── Success / table view ──
    if (showTable && recentSubmission) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                    {showSubmitSuccessBanner && (
                        <View className="bg-green-50 rounded-2xl p-4 flex-row items-center mb-2">
                            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                            <AppText className="text-green-700 font-semibold text-sm ml-3 flex-1">
                                Your Self Defense form has been submitted successfully.
                            </AppText>
                        </View>
                    )}

                    <SelfDefenseFormDataTable submission={recentSubmission} />

                    <BackToActivityFormsButton onPress={() => router.back()} />
                </ScrollView>
            </View>
        );
    }

    // ── Form content ──
    const renderFormContent = () => (
        <View>
            {/* Photo Upload */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Photo *</AppText>
            <View style={{ position: 'relative', marginBottom: 4 }}>
                <TouchableOpacity
                    onPress={pickPhoto}
                    style={{
                        width: '100%', height: 160, borderRadius: 12,
                        borderWidth: 2, borderStyle: photo ? 'solid' : 'dashed',
                        borderColor: photo ? '#e5e7eb' : '#93c5fd',
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: photo ? '#fff' : '#eff6ff',
                        overflow: 'hidden',
                    }}
                >
                    {photo ? (
                        <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                    ) : (
                        <View className="items-center">
                            <Ionicons name="image-outline" size={48} color="#93c5fd" />
                            <AppText className="text-sm text-gray-400 mt-2">Tap to upload photo</AppText>
                        </View>
                    )}
                </TouchableOpacity>
                {photo ? (
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: '#ef4444',
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onPress={() => setValue('photo', '', { shouldValidate: true })}
                    >
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                ) : null}
            </View>
            {errors.photo && <AppText className="text-xs text-red-500 mb-4">{errors.photo.message}</AppText>}
            {!errors.photo && <View className="mb-5" />}

            {/* Classes Per Week */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of classes in a week *</AppText>
            <Controller
                control={control}
                name="classesPerWeek"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="0"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        keyboardType="numeric"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.classesPerWeek && <AppText className="text-xs text-red-500 mb-4">{errors.classesPerWeek.message}</AppText>}
            {!errors.classesPerWeek && <View className="mb-5" />}

            {/* Classes Per Month */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of classes in a month *</AppText>
            <Controller
                control={control}
                name="classesPerMonth"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="0"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        keyboardType="numeric"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.classesPerMonth && <AppText className="text-xs text-red-500 mb-4">{errors.classesPerMonth.message}</AppText>}
            {!errors.classesPerMonth && <View className="mb-5" />}

            {/* Girl Participants */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girl Participants *</AppText>
            <Controller
                control={control}
                name="girlParticipants"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="0"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        keyboardType="numeric"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.girlParticipants && <AppText className="text-xs text-red-500 mb-4">{errors.girlParticipants.message}</AppText>}
            {!errors.girlParticipants && <View className="mb-5" />}

            {/* Girls Benefited */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girls Benefited *</AppText>
            <Controller
                control={control}
                name="girlsBenefited"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="0"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        keyboardType="numeric"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.girlsBenefited && <AppText className="text-xs text-red-500 mb-4">{errors.girlsBenefited.message}</AppText>}
            {!errors.girlsBenefited && <View className="mb-5" />}

            {/* Instructor Name */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Intructor's Name *</AppText>
            <Controller
                control={control}
                name="instructorName"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Intructor's Name"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.instructorName && <AppText className="text-xs text-red-500 mb-4">{errors.instructorName.message}</AppText>}
            {!errors.instructorName && <View className="mb-5" />}

            {/* Contact Number */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Contact Number *</AppText>
            <Controller
                control={control}
                name="contactNumber"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Contact Number"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        keyboardType="phone-pad"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.contactNumber && <AppText className="text-xs text-red-500 mb-4">{errors.contactNumber.message}</AppText>}
            {!errors.contactNumber && <View className="mb-5" />}

            {/* Submit Button */}
            <TouchableOpacity
                className={`rounded-xl py-4 items-center mt-2 ${submitMutation.isPending ? 'bg-gray-400' : ''}`}
                style={!submitMutation.isPending ? { backgroundColor: BLUE } : undefined}
                onPress={handleSubmit(onSubmit, onFormError)}
                disabled={submitMutation.isPending}
            >
                {submitMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <AppText className="text-base font-bold text-white">Submit</AppText>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <FormHeader />

            {recentSubmission && (
                <View className="px-5 py-3 bg-white border-b border-gray-100">
                    <TouchableOpacity
                        className="rounded-xl py-3 items-center flex-row justify-center"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => {
                            setShowSubmitSuccessBanner(false);
                            setShowTable(true);
                        }}
                    >
                        <Ionicons name="eye-outline" size={20} color="#fff" />
                        <AppText className="text-lg font-bold text-white ml-2">See Recent Submission</AppText>
                    </TouchableOpacity>
                </View>
            )}

            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <ScrollView
                        className="flex-1 bg-white"
                        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderFormContent()}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView
                    className="flex-1 bg-white"
                    contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderFormContent()}
                </ScrollView>
            )}
        </View>
    );
}
