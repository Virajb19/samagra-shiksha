/**
 * Vocational Education Activity Form Screen
 *
 * Single-page form with:
 * - Trade dropdown
 * - Class 9–12 enrolment (collapsible accordions with Boys/Girls)
 * - Conditional lab/guest/visit/internship Yes/No sections
 * - Best practices & success stories with photos
 *
 * Uses react-hook-form + zodResolver for validation.
 * On success navigates to a read-only summary table.
 */

import React, { useState, useCallback } from 'react';
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
    Modal,
    FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import {
    VocationalEducationFormSchema,
    VOCATIONAL_TRADE_OPTIONS,
    type VocationalEducationFormData,
} from '../../src/lib/zod';
import {
    submitVocationalEducationForm,
    getVocationalEducationFormSubmissions,
    type VocationalEducationFormSubmission,
} from '../../src/services/firebase/vocational-education-form.firestore';
import { getFacultyByUserId } from '../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';

const BLUE = '#1565C0';

// ─── Yes / No Radio Component ──────────────────────────
function YesNoField({
    label,
    value,
    onChange,
    error,
}: {
    label: string;
    value: 'Yes' | 'No' | undefined;
    onChange: (v: 'Yes' | 'No') => void;
    error?: string;
}) {
    return (
        <View className="mb-5">
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2.5">{label}</Text>
            <View className="flex-row items-center gap-6">
                <TouchableOpacity className="flex-row items-center" onPress={() => onChange('Yes')}>
                    <View
                        className="w-7 h-7 rounded-full border-2 items-center justify-center mr-2"
                        style={{ borderColor: value === 'Yes' ? BLUE : '#d1d5db' }}
                    >
                        {value === 'Yes' && (
                            <View className="w-4 h-4 rounded-full" style={{ backgroundColor: BLUE }} />
                        )}
                    </View>
                    <Text className="text-[15px] text-[#1a1a1a]">Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center" onPress={() => onChange('No')}>
                    <View
                        className="w-7 h-7 rounded-full border-2 items-center justify-center mr-2"
                        style={{ borderColor: value === 'No' ? BLUE : '#d1d5db' }}
                    >
                        {value === 'No' && (
                            <View className="w-4 h-4 rounded-full" style={{ backgroundColor: BLUE }} />
                        )}
                    </View>
                    <Text className="text-[15px] text-[#1a1a1a]">No</Text>
                </TouchableOpacity>
            </View>
            {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
        </View>
    );
}

// ─── Dropdown Select Component ──────────────────────────
function DropdownField({
    label,
    placeholder,
    options,
    value,
    onChange,
    error,
}: {
    label: string;
    placeholder: string;
    options: readonly string[];
    value: string | undefined;
    onChange: (v: string) => void;
    error?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <View className="mb-5">
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">{label}</Text>
            <TouchableOpacity
                className="border border-gray-200 rounded-xl px-4 py-4 flex-row items-center bg-[#fafafa]"
                onPress={() => setOpen(true)}
            >
                <Text className={`flex-1 text-[14px] ${value ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
                    {value || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
            {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}

            <Modal visible={open} transparent animationType="fade">
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', paddingHorizontal: 32 }}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View className="bg-white rounded-2xl max-h-[60%] overflow-hidden" style={{ elevation: 10 }}>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="px-5 py-4 border-b border-gray-100"
                                    onPress={() => { onChange(item); setOpen(false); }}
                                >
                                    <Text className={`text-[15px] ${value === item ? 'font-bold text-blue-600' : 'text-[#1a1a1a]'}`}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─── Collapsible Class Section ──────────────────────────
function ClassAccordion({
    classLabel,
    boysValue,
    girlsValue,
    onBoysChange,
    onGirlsChange,
    boysError,
    girlsError,
}: {
    classLabel: string;
    boysValue: string;
    girlsValue: string;
    onBoysChange: (v: string) => void;
    onGirlsChange: (v: string) => void;
    boysError?: string;
    girlsError?: string;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View className="mb-3 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4"
                onPress={() => setExpanded(!expanded)}
            >
                <Text className="text-base font-bold text-[#1a1a1a]">{classLabel}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#6b7280" />
            </TouchableOpacity>
            {expanded && (
                <View className="px-4 pb-4">
                    <View className="flex-row gap-4">
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-[#1a1a1a] mb-1">Boys *</Text>
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px]"
                                keyboardType="numeric"
                                value={boysValue}
                                onChangeText={onBoysChange}
                                placeholder="0"
                            />
                            {boysError && <Text className="text-xs text-red-500 mt-1">{boysError}</Text>}
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-[#1a1a1a] mb-1">Girls *</Text>
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px]"
                                keyboardType="numeric"
                                value={girlsValue}
                                onChangeText={onGirlsChange}
                                placeholder="0"
                            />
                            {girlsError && <Text className="text-xs text-red-500 mt-1">{girlsError}</Text>}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

// ─── Image Picker Grid ──────────────────────────
function ImagePickerGrid({
    label,
    images,
    onAdd,
    onRemove,
    error,
    maxPhotos = 10,
}: {
    label: string;
    images: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    error?: string;
    maxPhotos?: number;
}) {
    return (
        <View className="mb-5">
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-1">{label}</Text>
            <Text className="text-xs text-gray-500 mb-2.5">{images.length}/{maxPhotos} photos uploaded</Text>
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
                            style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => onRemove(idx)}
                        >
                            <Ionicons name="close" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
                {images.length < maxPhotos && (
                    <TouchableOpacity
                        style={{ width: 96, height: 96, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#93c5fd', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' }}
                        onPress={onAdd}
                    >
                        <Ionicons name="add" size={36} color={BLUE} />
                    </TouchableOpacity>
                )}
            </ScrollView>
            {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
        </View>
    );
}

// ─── Single Image Picker ──────────────────────────
function SingleImagePicker({
    label,
    value,
    onPick,
    onRemove,
    error,
}: {
    label: string;
    value: string | undefined;
    onPick: () => void;
    onRemove: () => void;
    error?: string;
}) {
    return (
        <View className="mb-5">
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">{label}</Text>
            {value ? (
                <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
                    <Image source={{ uri: value }} style={{ width: 160, height: 120, borderRadius: 12 }} />
                    <TouchableOpacity
                        style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        onPress={onRemove}
                    >
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    className="border-2 border-dashed border-blue-200 rounded-xl items-center justify-center bg-blue-50 py-8"
                    onPress={onPick}
                >
                    <Ionicons name="image-outline" size={40} color="#9ca3af" />
                    <Text className="text-sm text-gray-400 mt-2">{label}</Text>
                </TouchableOpacity>
            )}
            {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
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
                        <Text className="text-white text-[9px] font-medium opacity-90">समग्र शिक्षा</Text>
                        <Text className="text-white text-[11px] font-bold tracking-wide">SAMAGRA SHIKSHA</Text>
                        <Text className="text-white text-[8px] tracking-wider opacity-80">NAGALAND</Text>
                    </View>
                </View>
                <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Emblem_of_Nagaland.svg/200px-Emblem_of_Nagaland.svg.png' }}
                    style={{ width: 42, height: 42 }}
                    resizeMode="contain"
                />
            </View>
            <Text className="text-white text-[28px] font-extrabold mb-1">Vocational Education</Text>
            <Text className="text-white/80 text-xs">
                Please make sure all the required fields are properly filled.
            </Text>
            <TouchableOpacity
                onPress={onBack}
                style={{ position: 'absolute', top: 16, left: 14, zIndex: 10, padding: 4 }}
            >
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}

// ─── Data Row (Read-only) ──────────────────────────
function DataRow({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row py-1.5">
            <Text className="text-xs text-gray-500 w-[45%]">{label}</Text>
            <Text className="text-xs font-medium text-[#1a1a1a] flex-1">{value || '—'}</Text>
        </View>
    );
}

// ─── Submission Table ──────────────────────────
function VocationalFormDataTable({ submissions }: { submissions: VocationalEducationFormSubmission[] }) {
    if (!submissions.length) return null;

    return (
        <View className="mt-6 mb-4">
            <Text className="text-lg font-bold text-[#1a1a1a] mb-3">Your Vocational Education Submissions</Text>
            {submissions.map((sub, idx) => (
                <View
                    key={sub.id}
                    className="bg-white rounded-2xl mb-3 p-4"
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                    <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#22c55e' }}>
                            <Text className="text-white font-bold text-sm">{idx + 1}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-[#1a1a1a]">{sub.trade} — {sub.school_name || 'Submission'}</Text>
                            <Text className="text-xs text-gray-500">
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        <DataRow label="Trade" value={sub.trade} />
                        <DataRow label="Class 9 (B/G)" value={`${sub.class_9.boys} / ${sub.class_9.girls}`} />
                        <DataRow label="Class 10 (B/G)" value={`${sub.class_10.boys} / ${sub.class_10.girls}`} />
                        <DataRow label="Class 11 (B/G)" value={`${sub.class_11.boys} / ${sub.class_11.girls}`} />
                        <DataRow label="Class 12 (B/G)" value={`${sub.class_12.boys} / ${sub.class_12.girls}`} />
                        <DataRow label="Lab Setup" value={sub.is_lab_setup} />
                        {sub.is_lab_setup === 'No' && <DataRow label="Lab Not Setup Reason" value={sub.lab_not_setup_reason} />}
                        <DataRow label="Guest Lecture" value={sub.is_guest_lecture_done} />
                        {sub.is_guest_lecture_done === 'No' && <DataRow label="Guest Lecture Reason" value={sub.guest_lecture_not_done_reason} />}
                        <DataRow label="Industrial Visit" value={sub.is_industrial_visit_done} />
                        {sub.is_industrial_visit_done === 'No' && <DataRow label="Visit Reason" value={sub.industrial_visit_not_done_reason} />}
                        <DataRow label="Internship" value={sub.is_internship_done} />
                        {sub.is_internship_done === 'Yes' && <DataRow label="Internship Report" value={sub.internship_report} />}
                        {sub.is_internship_done === 'No' && <DataRow label="Internship Reason" value={sub.internship_not_done_reason} />}
                        <DataRow label="Best Practices" value={sub.best_practices} />
                        <DataRow label="Success Stories" value={sub.success_stories} />

                        {(sub.best_practice_photos.length > 0 || sub.success_story_photos.length > 0) && (
                            <View className="mt-2">
                                {sub.best_practice_photos.length > 0 && (
                                    <View className="mb-2">
                                        <Text className="text-xs font-semibold text-gray-600 mb-1">Best Practice Photos ({sub.best_practice_photos.length})</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {sub.best_practice_photos.map((url, i) => (
                                                <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                                {sub.success_story_photos.length > 0 && (
                                    <View>
                                        <Text className="text-xs font-semibold text-gray-600 mb-1">Success Story Photos ({sub.success_story_photos.length})</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {sub.success_story_photos.map((url, i) => (
                                                <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

// ─── Shared Image Picker Helper ──────────────────────────
function useImagePick() {
    const pickImage = useCallback(async (): Promise<string | null> => {
        return new Promise((resolve) => {
            Alert.alert('Add Photo', 'Choose how to add a photo', [
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera permissions.'); resolve(null); return; }
                        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
                        resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
                    },
                },
                {
                    text: 'Choose from Gallery',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera roll permissions.'); resolve(null); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
                        resolve(!result.canceled && result.assets[0] ? result.assets[0].uri : null);
                    },
                },
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            ]);
        });
    }, []);
    return pickImage;
}

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function VocationalEducationFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [showTable, setShowTable] = useState(false);
    const pickImage = useImagePick();

    // Authorization check — only teachers with Vocational Education responsibility can access
    const isAuthorized = user?.responsibilities?.includes('Vocational Education') ?? false;

    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} formName="Vocational Education" />
            </View>
        );
    }

    const form = useForm<VocationalEducationFormData>({
        resolver: zodResolver(VocationalEducationFormSchema),
        defaultValues: {
            trade: '',
            class9: { boys: '0', girls: '0' },
            class10: { boys: '0', girls: '0' },
            class11: { boys: '0', girls: '0' },
            class12: { boys: '0', girls: '0' },
            isLabSetup: undefined,
            labPhoto: '',
            labNotSetupReason: '',
            isGuestLectureDone: undefined,
            guestLecturePhoto: '',
            guestLectureNotDoneReason: '',
            isIndustrialVisitDone: undefined,
            industrialVisitPhoto: '',
            industrialVisitNotDoneReason: '',
            isInternshipDone: undefined,
            internshipReport: '',
            internshipNotDoneReason: '',
            bestPractices: '',
            bestPracticePhotos: [],
            successStories: '',
            successStoryPhotos: [],
        },
    });

    const { control, watch, setValue, handleSubmit, formState: { errors }, reset } = form;

    const isLabSetup = watch('isLabSetup');
    const isGuestLectureDone = watch('isGuestLectureDone');
    const isIndustrialVisitDone = watch('isIndustrialVisitDone');
    const isInternshipDone = watch('isInternshipDone');
    const bestPracticePhotos = watch('bestPracticePhotos');
    const successStoryPhotos = watch('successStoryPhotos');

    // Fetch existing submissions
    const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
        queryKey: ['vocational-education-form-submissions', user?.id],
        queryFn: () => getVocationalEducationFormSubmissions(user!.id),
        enabled: !!user?.id,
    });

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (data: VocationalEducationFormData) => {
            const faculty = await getFacultyByUserId(user!.id);
            return submitVocationalEducationForm(data, {
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
            queryClient.invalidateQueries({ queryKey: ['vocational-education-form-submissions'] });
            Toast.show({ type: 'success', text2: 'Vocational Education form submitted successfully!', visibilityTime: 2000 });
            refetchSubmissions();
            setShowTable(true);
        },
        onError: (error: any) => {
            Toast.show({ type: 'error', text2: error?.message || 'Failed to submit form', visibilityTime: 3000 });
        },
    });

    const onFormError = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        const msg = firstError?.message || firstError?.boys?.message || firstError?.girls?.message || 'Please complete all required fields.';
        Toast.show({ type: 'error', text2: msg, visibilityTime: 3000 });
    };

    const onSubmit = (data: VocationalEducationFormData) => {
        submitMutation.mutate(data);
    };

    const handleNewSubmission = () => {
        reset();
        setShowTable(false);
    };

    // Image picker helpers for multi-photo fields
    const addBestPracticePhoto = useCallback(async () => {
        const uri = await pickImage();
        if (uri) {
            const current = form.getValues('bestPracticePhotos');
            form.setValue('bestPracticePhotos', [...current, uri], { shouldValidate: true });
        }
    }, [form, pickImage]);

    const removeBestPracticePhoto = useCallback((index: number) => {
        const current = form.getValues('bestPracticePhotos');
        form.setValue('bestPracticePhotos', current.filter((_, i) => i !== index), { shouldValidate: true });
    }, [form]);

    const addSuccessStoryPhoto = useCallback(async () => {
        const uri = await pickImage();
        if (uri) {
            const current = form.getValues('successStoryPhotos');
            form.setValue('successStoryPhotos', [...current, uri], { shouldValidate: true });
        }
    }, [form, pickImage]);

    const removeSuccessStoryPhoto = useCallback((index: number) => {
        const current = form.getValues('successStoryPhotos');
        form.setValue('successStoryPhotos', current.filter((_, i) => i !== index), { shouldValidate: true });
    }, [form]);

    // Single image picker helpers
    const pickSingleImage = useCallback(async (fieldName: 'labPhoto' | 'guestLecturePhoto' | 'industrialVisitPhoto') => {
        const uri = await pickImage();
        if (uri) form.setValue(fieldName, uri, { shouldValidate: true });
    }, [form, pickImage]);

    // If showing table after successful submit
    if (showTable) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
                    <View className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 items-center">
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text className="text-lg font-bold text-green-700 mt-2">Form Submitted!</Text>
                        <Text className="text-sm text-green-600 mt-1 text-center">
                            Your Vocational Education form has been submitted successfully.
                        </Text>
                    </View>

                    <VocationalFormDataTable submissions={submissions} />

                    <TouchableOpacity
                        className="rounded-xl py-4 items-center mt-2"
                        style={{ backgroundColor: BLUE }}
                        onPress={handleNewSubmission}
                    >
                        <Text className="text-base font-bold text-white">Submit Another Entry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="rounded-xl py-4 items-center mt-3 border border-gray-300"
                        onPress={() => router.back()}
                    >
                        <Text className="text-base font-bold text-gray-700">Back to Activity Forms</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    const formContent = (
        <View>
            {/* Trade Dropdown */}
            <Controller
                control={control}
                name="trade"
                render={({ field: { value, onChange } }) => (
                    <DropdownField
                        label="Trade *"
                        placeholder="Select option"
                        options={VOCATIONAL_TRADE_OPTIONS}
                        value={value}
                        onChange={onChange}
                        error={errors.trade?.message}
                    />
                )}
            />

            {/* Class Enrolments */}
            <Controller
                control={control}
                name="class9"
                render={({ field: { value, onChange } }) => (
                    <ClassAccordion
                        classLabel="Class 9"
                        boysValue={value.boys}
                        girlsValue={value.girls}
                        onBoysChange={(v) => onChange({ ...value, boys: v })}
                        onGirlsChange={(v) => onChange({ ...value, girls: v })}
                        boysError={(errors.class9 as any)?.boys?.message}
                        girlsError={(errors.class9 as any)?.girls?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="class10"
                render={({ field: { value, onChange } }) => (
                    <ClassAccordion
                        classLabel="Class 10"
                        boysValue={value.boys}
                        girlsValue={value.girls}
                        onBoysChange={(v) => onChange({ ...value, boys: v })}
                        onGirlsChange={(v) => onChange({ ...value, girls: v })}
                        boysError={(errors.class10 as any)?.boys?.message}
                        girlsError={(errors.class10 as any)?.girls?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="class11"
                render={({ field: { value, onChange } }) => (
                    <ClassAccordion
                        classLabel="Class 11"
                        boysValue={value.boys}
                        girlsValue={value.girls}
                        onBoysChange={(v) => onChange({ ...value, boys: v })}
                        onGirlsChange={(v) => onChange({ ...value, girls: v })}
                        boysError={(errors.class11 as any)?.boys?.message}
                        girlsError={(errors.class11 as any)?.girls?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="class12"
                render={({ field: { value, onChange } }) => (
                    <ClassAccordion
                        classLabel="Class 12"
                        boysValue={value.boys}
                        girlsValue={value.girls}
                        onBoysChange={(v) => onChange({ ...value, boys: v })}
                        onGirlsChange={(v) => onChange({ ...value, girls: v })}
                        boysError={(errors.class12 as any)?.boys?.message}
                        girlsError={(errors.class12 as any)?.girls?.message}
                    />
                )}
            />

            {/* Lab Setup */}
            <Controller
                control={control}
                name="isLabSetup"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is the Lab Setup completely?"
                        value={value}
                        onChange={onChange}
                        error={errors.isLabSetup?.message}
                    />
                )}
            />
            {isLabSetup === 'Yes' && (
                <SingleImagePicker
                    label="Select Lab Photo *"
                    value={watch('labPhoto')}
                    onPick={() => pickSingleImage('labPhoto')}
                    onRemove={() => setValue('labPhoto', '', { shouldValidate: true })}
                    error={errors.labPhoto?.message}
                />
            )}
            {isLabSetup === 'No' && (
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Lab Wasn't Setup *</Text>
                    <Controller
                        control={control}
                        name="labNotSetupReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.labNotSetupReason?.message && (
                        <Text className="text-xs text-red-500 mt-1">{errors.labNotSetupReason.message}</Text>
                    )}
                </View>
            )}

            {/* Guest Lecture */}
            <Controller
                control={control}
                name="isGuestLectureDone"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is Guest Lecture done?"
                        value={value}
                        onChange={onChange}
                        error={errors.isGuestLectureDone?.message}
                    />
                )}
            />
            {isGuestLectureDone === 'Yes' && (
                <SingleImagePicker
                    label="Select Guest Lecture Photo *"
                    value={watch('guestLecturePhoto')}
                    onPick={() => pickSingleImage('guestLecturePhoto')}
                    onRemove={() => setValue('guestLecturePhoto', '', { shouldValidate: true })}
                    error={errors.guestLecturePhoto?.message}
                />
            )}
            {isGuestLectureDone === 'No' && (
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Guest Lecture Not Conducted *</Text>
                    <Controller
                        control={control}
                        name="guestLectureNotDoneReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.guestLectureNotDoneReason?.message && (
                        <Text className="text-xs text-red-500 mt-1">{errors.guestLectureNotDoneReason.message}</Text>
                    )}
                </View>
            )}

            {/* Industrial Visit */}
            <Controller
                control={control}
                name="isIndustrialVisitDone"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is Industrial Visit done?"
                        value={value}
                        onChange={onChange}
                        error={errors.isIndustrialVisitDone?.message}
                    />
                )}
            />
            {isIndustrialVisitDone === 'Yes' && (
                <SingleImagePicker
                    label="Select Industrial Visit Photo *"
                    value={watch('industrialVisitPhoto')}
                    onPick={() => pickSingleImage('industrialVisitPhoto')}
                    onRemove={() => setValue('industrialVisitPhoto', '', { shouldValidate: true })}
                    error={errors.industrialVisitPhoto?.message}
                />
            )}
            {isIndustrialVisitDone === 'No' && (
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Industrial Visit Not Conducted *</Text>
                    <Controller
                        control={control}
                        name="industrialVisitNotDoneReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.industrialVisitNotDoneReason?.message && (
                        <Text className="text-xs text-red-500 mt-1">{errors.industrialVisitNotDoneReason.message}</Text>
                    )}
                </View>
            )}

            {/* Internship */}
            <Controller
                control={control}
                name="isInternshipDone"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is Internship done?"
                        value={value}
                        onChange={onChange}
                        error={errors.isInternshipDone?.message}
                    />
                )}
            />
            {isInternshipDone === 'Yes' && (
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Internship Report *</Text>
                    <Controller
                        control={control}
                        name="internshipReport"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter Internship Report (max 100 words)"
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.internshipReport?.message && (
                        <Text className="text-xs text-red-500 mt-1">{errors.internshipReport.message}</Text>
                    )}
                </View>
            )}
            {isInternshipDone === 'No' && (
                <View className="mb-5">
                    <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Internship Not Conducted *</Text>
                    <Controller
                        control={control}
                        name="internshipNotDoneReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.internshipNotDoneReason?.message && (
                        <Text className="text-xs text-red-500 mt-1">{errors.internshipNotDoneReason.message}</Text>
                    )}
                </View>
            )}

            {/* Best Practices */}
            <View className="mb-5">
                <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Best Practices *</Text>
                <Controller
                    control={control}
                    name="bestPractices"
                    render={({ field: { value, onChange } }) => (
                        <TextInput
                            className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                            multiline
                            textAlignVertical="top"
                            placeholder="Enter Best Practices (max 100 words)"
                            value={value}
                            onChangeText={onChange}
                        />
                    )}
                />
                {errors.bestPractices?.message && (
                    <Text className="text-xs text-red-500 mt-1">{errors.bestPractices.message}</Text>
                )}
            </View>

            <ImagePickerGrid
                label="Photos of best practices (atleast 1 Image) *"
                images={bestPracticePhotos || []}
                onAdd={addBestPracticePhoto}
                onRemove={removeBestPracticePhoto}
                error={errors.bestPracticePhotos?.message}
            />

            {/* Success Stories */}
            <View className="mb-5">
                <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Success Stories *</Text>
                <Controller
                    control={control}
                    name="successStories"
                    render={({ field: { value, onChange } }) => (
                        <TextInput
                            className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                            multiline
                            textAlignVertical="top"
                            placeholder="Enter Success Stories (max 100 words)"
                            value={value}
                            onChangeText={onChange}
                        />
                    )}
                />
                {errors.successStories?.message && (
                    <Text className="text-xs text-red-500 mt-1">{errors.successStories.message}</Text>
                )}
            </View>

            <ImagePickerGrid
                label="Photos of Success Stories (atleast 1 Image) *"
                images={successStoryPhotos || []}
                onAdd={addSuccessStoryPhoto}
                onRemove={removeSuccessStoryPhoto}
                error={errors.successStoryPhotos?.message}
            />

            {/* Submit Button */}
            <TouchableOpacity
                className="rounded-xl py-4 items-center mt-4"
                style={{ backgroundColor: BLUE, opacity: submitMutation.isPending ? 0.6 : 1 }}
                onPress={handleSubmit(onSubmit, onFormError)}
                disabled={submitMutation.isPending}
            >
                {submitMutation.isPending ? (
                    <View className="flex-row items-center gap-2">
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-base font-bold text-white">Submitting...</Text>
                    </View>
                ) : (
                    <Text className="text-base font-bold text-white">Submit</Text>
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
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {formContent}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView
                    className="flex-1 bg-white"
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {formContent}
                </ScrollView>
            )}
        </View>
    );
}
