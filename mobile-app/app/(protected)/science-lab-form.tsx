/**
 * Science Lab Activity Form Screen (Single-page)
 *
 * Fields:
 * - Kit Teacher In-charge name
 * - Number of experiments per week
 * - Photos of students using kits (min 1)
 * - Photos of Logbook for kits (min 1)
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
    ScienceLabFormSchema,
    type ScienceLabFormData,
} from '../../src/lib/zod';
import {
    submitScienceLabForm,
    getScienceLabFormSubmission,
    type ScienceLabFormSubmission,
} from '../../src/services/firebase/science-lab-form.firestore';
import { getFacultyByUserId } from '../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';
import BackToActivityFormsButton from '../../src/components/BackToActivityFormsButton';

const BLUE = '#1565C0';
const MAX_PHOTOS = 10;
const INPUT_TEXT_STYLE = { fontFamily: 'Lato-Regular' } as const;
const PLACEHOLDER_TEXT_COLOR = '#9ca3af';

// ─── Image Picker Grid ──────────────────────────

function ImagePickerGrid({
    label,
    images,
    onAdd,
    onRemove,
    error,
}: {
    label: string;
    images: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    error?: string;
}) {
    return (
        <View className="mb-5">
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-1">{label}</AppText>
            <AppText className="text-xs text-gray-500 mb-2.5">{images.length}/{MAX_PHOTOS} photos uploaded</AppText>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ overflow: 'visible' }}
                contentContainerStyle={{ gap: 12, paddingRight: 16, paddingTop: 10, paddingLeft: 2, paddingBottom: 4 }}
            >
                {images.map((uri, idx) => (
                    <View key={idx} style={{ position: 'relative' }}>
                        <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 12 }} />
                        <TouchableOpacity
                            style={{
                                position: 'absolute', top: -8, right: -8,
                                backgroundColor: '#ef4444', width: 24, height: 24,
                                borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                            }}
                            onPress={() => onRemove(idx)}
                        >
                            <Ionicons name="close" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
                {images.length < MAX_PHOTOS && (
                    <TouchableOpacity
                        style={{
                            width: 96, height: 96, borderRadius: 12,
                            borderWidth: 2, borderStyle: 'dashed', borderColor: '#93c5fd',
                            alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff',
                        }}
                        onPress={onAdd}
                    >
                        <Image source={require('../../assets/add.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                    </TouchableOpacity>
                )}
            </ScrollView>
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}
        </View>
    );
}

// ─── Header ──────────────────────────

function FormHeader() {
    return (
        <View className="px-5 pt-5 pb-4 bg-white">
            <AppText className="text-2xl font-bold text-[#1a1a1a] mb-1">Science Lab</AppText>
            <AppText className="text-sm text-gray-500">
                Please make sure all the required fields are properly filled.
            </AppText>
        </View>
    );
}

// ─── Submission Table ──────────────────────────

function ScienceLabFormDataTable({ submission }: { submission: ScienceLabFormSubmission }) {

    return (
        <View className="mt-6 mb-4">
            <AppText className="text-lg font-bold text-[#1a1a1a] mb-3">Your Recent Science Lab Submission</AppText>
                <View
                    key={submission.id}
                    className="bg-white rounded-2xl mb-3 p-4"
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                    <View className="flex-row items-center mb-2">
                        <View className="flex-1">
                            <AppText className="text-base font-bold text-[#1a1a1a]">{submission.school_name || 'Science Lab Submission'}</AppText>
                            <AppText className="text-xs text-gray-500">
                                {new Date(submission.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </AppText>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        <DataRow label="Kit Teacher" value={submission.kit_teacher_name} />
                        <DataRow label="Experiments/Week" value={submission.experiments_per_week} />
                        <PdfFilesSection submission={submission as unknown as Record<string, unknown>} />
                        {submission.student_photos.length > 0 && (
                            <View className="mt-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Student Photos ({submission.student_photos.length})</AppText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {submission.student_photos.map((url, i) => (
                                        <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        {submission.logbook_photos.length > 0 && (
                            <View className="mt-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Logbook Photos ({submission.logbook_photos.length})</AppText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {submission.logbook_photos.map((url, i) => (
                                        <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                    ))}
                                </ScrollView>
                            </View>
                        )}
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

export default function ScienceLabFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [showSubmitSuccessBanner, setShowSubmitSuccessBanner] = React.useState(false);

    // Authorization check — only teachers with Science Lab responsibility can access
    const isAuthorized = user?.responsibilities?.includes('Science Lab') ?? false;

    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} formName="Science Lab" />
            </View>
        );
    }

    const form = useForm<ScienceLabFormData>({
        resolver: zodResolver(ScienceLabFormSchema),
        defaultValues: {
            kitTeacherName: '',
            experimentsPerWeek: '0',
            studentPhotos: [],
            logbookPhotos: [],
        },
    });

    const { control, watch, setValue, formState: { errors }, handleSubmit } = form;
    const studentPhotos = watch('studentPhotos');
    const logbookPhotos = watch('logbookPhotos');

    const { data: recentSubmission, refetch: refetchRecentSubmission } = useQuery({
        queryKey: ['science-lab-form-submission', user?.id],
        queryFn: () => getScienceLabFormSubmission(user!.id),
        enabled: !!user?.id,
    });

    const submitMutation = useMutation({
        mutationKey: ['teacher-form-upload'],
        mutationFn: async (data: ScienceLabFormData) => {
            const faculty = await getFacultyByUserId(user!.id);
            return submitScienceLabForm(data, {
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
            Toast.show({ type: 'success', text1: 'Science Lab form submitted successfully!' });
            refetchRecentSubmission();
            queryClient.invalidateQueries({ queryKey: ['science-lab-form-submission'] });
            queryClient.invalidateQueries({ queryKey: ['science-lab-form-submissions'] });
            setShowSubmitSuccessBanner(true);
            setShowTable(true);
        },
        onError: (error) => {
            Toast.show({ type: 'error', text1: 'Failed to submit', text2: error.message });
        },
    });

    const [showTable, setShowTable] = React.useState(false);

    const pickImage = useCallback(async (field: 'studentPhotos' | 'logbookPhotos') => {
        const current = form.getValues(field);
        if (current.length >= MAX_PHOTOS) {
            Alert.alert('Limit reached', `Maximum ${MAX_PHOTOS} photos allowed.`);
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: MAX_PHOTOS - current.length,
            quality: 0.7,
        });
        if (!result.canceled && result.assets.length > 0) {
            const newUris = result.assets.map((a) => a.uri);
            setValue(field, [...current, ...newUris].slice(0, MAX_PHOTOS), { shouldValidate: true });
        }
    }, [form, setValue]);

    const removeImage = useCallback((field: 'studentPhotos' | 'logbookPhotos', index: number) => {
        const current = form.getValues(field);
        setValue(field, current.filter((_, i) => i !== index), { shouldValidate: true });
    }, [form, setValue]);

    const onSubmit = (data: ScienceLabFormData) => submitMutation.mutate(data);

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
                                Your Science Lab form has been submitted successfully.
                            </AppText>
                        </View>
                    )}

                    <ScienceLabFormDataTable submission={recentSubmission} />

                    <BackToActivityFormsButton onPress={() => router.back()} />
                </ScrollView>
            </View>
        );
    }

    // ── Form content ──
    const renderFormContent = () => (
        <View>
            {/* Kit Teacher Name */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Name of Science & Maths Kit Teacher In-charge *
            </AppText>
            <Controller
                control={control}
                name="kitTeacherName"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Kit Teacher In-charge's full name"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.kitTeacherName && <AppText className="text-xs text-red-500 mb-4">{errors.kitTeacherName.message}</AppText>}
            {!errors.kitTeacherName && <View className="mb-5" />}

            {/* Experiments Per Week */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of experiments conducted in a week using the kits *
            </AppText>
            <Controller
                control={control}
                name="experimentsPerWeek"
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
            {errors.experimentsPerWeek && <AppText className="text-xs text-red-500 mb-4">{errors.experimentsPerWeek.message}</AppText>}
            {!errors.experimentsPerWeek && <View className="mb-5" />}

            {/* Student Photos */}
            <ImagePickerGrid
                label="Photos of students using the kits in classroom (atleast 1 Image) *"
                images={studentPhotos}
                onAdd={() => pickImage('studentPhotos')}
                onRemove={(i) => removeImage('studentPhotos', i)}
                error={errors.studentPhotos?.message}
            />

            {/* Logbook Photos */}
            <ImagePickerGrid
                label="Photos of Logbook maintained for the use of kits in the school (atleast 1 Image) *"
                images={logbookPhotos}
                onAdd={() => pickImage('logbookPhotos')}
                onRemove={(i) => removeImage('logbookPhotos', i)}
                error={errors.logbookPhotos?.message}
            />

            {/* Submit Button */}
            {recentSubmission && (
                <TouchableOpacity
                    className="rounded-xl py-4 items-center mt-2 flex-row justify-center"
                    style={{ backgroundColor: BLUE }}
                    onPress={() => {
                        setShowSubmitSuccessBanner(false);
                        setShowTable(true);
                    }}
                >
                    <Ionicons name="eye-outline" size={20} color="#fff" />
                    <AppText className="text-lg font-bold text-white ml-2">See Recent Submission</AppText>
                </TouchableOpacity>
            )}

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
