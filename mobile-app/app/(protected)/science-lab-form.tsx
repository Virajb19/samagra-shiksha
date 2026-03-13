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
    getScienceLabFormSubmissions,
    type ScienceLabFormSubmission,
} from '../../src/services/firebase/science-lab-form.firestore';
import { getFacultyByUserId } from '../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';

const BLUE = '#1565C0';
const MAX_PHOTOS = 10;

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
                            borderWidth: 2, borderStyle: 'dashed', borderColor: '#1565C0',
                            alignItems: 'center', justifyContent: 'center', backgroundColor: '#1565C0',
                        }}
                        onPress={onAdd}
                    >
                        <Ionicons name="add" size={36} color={BLUE} />
                    </TouchableOpacity>
                )}
            </ScrollView>
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}
        </View>
    );
}

// ─── Header ──────────────────────────

function FormHeader({ onBack }: { onBack: () => void }) {
    return (
        <View style={{ backgroundColor: BLUE, paddingTop: 14, paddingBottom: 24, paddingHorizontal: 18 }}>
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                    <Image
                        source={{ uri: 'https://samagrashiksha.nagaland.gov.in/assets/img/logo-removebg.png' }}
                        style={{ width: 40, height: 40, marginRight: 10 }}
                        resizeMode="contain"
                    />
                    <View>
                        <AppText className="text-white text-[9px] font-medium opacity-90">समग्र शिक्षा</AppText>
                        <AppText className="text-white text-[11px] font-bold tracking-wide">SAMAGRA SHIKSHA</AppText>
                        <AppText className="text-white text-[8px] tracking-wider opacity-80">NAGALAND</AppText>
                    </View>
                </View>
                <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Emblem_of_Nagaland.svg/200px-Emblem_of_Nagaland.svg.png' }}
                    style={{ width: 42, height: 42 }}
                    resizeMode="contain"
                />
            </View>
            <AppText className="text-white text-[28px] font-extrabold mb-1">Science Lab</AppText>
            <AppText className="text-white/80 text-xs">
                Please make sure all the required fields are properly filled.
            </AppText>
            <TouchableOpacity
                onPress={onBack}
                style={{ position: 'absolute', top: 16, left: 14, zIndex: 10, padding: 4 }}
            >
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}

// ─── Submission Table ──────────────────────────

function ScienceLabFormDataTable({ submissions }: { submissions: ScienceLabFormSubmission[] }) {
    if (!submissions.length) return null;

    return (
        <View className="mt-6 mb-4">
            <AppText className="text-lg font-bold text-[#1a1a1a] mb-3">Your Science Lab Submissions</AppText>
            {submissions.map((sub, idx) => (
                <View
                    key={sub.id}
                    className="bg-white rounded-2xl mb-3 p-4"
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                    <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#22c55e' }}>
                            <AppText className="text-white font-bold text-sm">{idx + 1}</AppText>
                        </View>
                        <View className="flex-1">
                            <AppText className="text-base font-bold text-[#1a1a1a]">{sub.school_name || 'Science Lab Submission'}</AppText>
                            <AppText className="text-xs text-gray-500">
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </AppText>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        <DataRow label="Kit Teacher" value={sub.kit_teacher_name} />
                        <DataRow label="Experiments/Week" value={sub.experiments_per_week} />
                        {sub.student_photos.length > 0 && (
                            <View className="mt-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Student Photos ({sub.student_photos.length})</AppText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {sub.student_photos.map((url, i) => (
                                        <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        {sub.logbook_photos.length > 0 && (
                            <View className="mt-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Logbook Photos ({sub.logbook_photos.length})</AppText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {sub.logbook_photos.map((url, i) => (
                                        <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            ))}
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

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function ScienceLabFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Authorization check — only teachers with Science Lab responsibility can access
    const isAuthorized = user?.responsibilities?.includes('Science Lab') ?? false;

    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
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

    const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
        queryKey: ['science-lab-form-submissions', user?.id],
        queryFn: () => getScienceLabFormSubmissions(user!.id),
        enabled: !!user?.id,
    });

    const submitMutation = useMutation({
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
            refetchSubmissions();
            queryClient.invalidateQueries({ queryKey: ['science-lab-form-submissions'] });
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
    if (showTable) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="bg-green-50 rounded-2xl p-4 flex-row items-center mb-2">
                        <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                        <AppText className="text-green-700 font-semibold text-sm ml-3 flex-1">
                            Your Science Lab form has been submitted successfully.
                        </AppText>
                    </View>

                    <ScienceLabFormDataTable submissions={submissions} />

                    <TouchableOpacity
                        className="rounded-xl py-4 items-center mt-2"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => router.back()}
                    >
                        <AppText className="text-base font-bold text-white">Back to Activity Forms</AppText>
                    </TouchableOpacity>
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
                        placeholderTextColor="#9ca3af"
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
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
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
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />
            <FormHeader onBack={() => router.back()} />

            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <ScrollView
                        className="flex-1 bg-white"
                        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {renderFormContent()}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView
                    className="flex-1 bg-white"
                    contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderFormContent()}
                </ScrollView>
            )}
        </View>
    );
}
