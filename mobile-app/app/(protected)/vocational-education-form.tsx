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
    Modal,
    FlatList,
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
import AnimatedTickOption from '../../src/components/AnimatedTickOption';
import AddPhotoSourceModal from '../../src/components/AddPhotoSourceModal';
import BackToActivityFormsButton from '../../src/components/BackToActivityFormsButton';

const BLUE = '#1565C0';
const INPUT_TEXT_STYLE = { fontFamily: 'Lato-Regular' } as const;
const PLACEHOLDER_TEXT_COLOR = '#9ca3af';

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
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2.5">{label}</AppText>
            <View className="flex-row items-center mt-1">
                {(['Yes', 'No'] as const).map((opt) => (
                    <AnimatedTickOption
                        key={opt}
                        label={opt}
                        selected={value === opt}
                        onPress={() => onChange(opt)}
                        activeColor={BLUE}
                        containerStyle={{ marginRight: 24, paddingVertical: 2 }}
                        labelStyle={{ fontFamily: 'Lato-Regular' }}
                    />
                ))}
            </View>
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}
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
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">{label}</AppText>
            <TouchableOpacity
                className="border border-gray-200 rounded-xl px-4 py-4 flex-row items-center bg-[#fafafa]"
                onPress={() => setOpen(true)}
            >
                <AppText className={`flex-1 text-[14px] ${value ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
                    {value || placeholder}
                </AppText>
                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}

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
                                    <AppText className={`text-[15px] ${value === item ? 'font-bold text-blue-600' : 'text-[#1a1a1a]'}`}>{item}</AppText>
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
                <AppText className="text-base font-bold text-[#1a1a1a]">{classLabel}</AppText>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#6b7280" />
            </TouchableOpacity>
            {expanded && (
                <View className="px-4 pb-4">
                    <View className="flex-row gap-4">
                        <View className="flex-1">
                            <AppText className="text-sm font-semibold text-[#1a1a1a] mb-1">Boys *</AppText>
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px]"
                                style={INPUT_TEXT_STYLE}
                                keyboardType="numeric"
                                value={boysValue}
                                onChangeText={onBoysChange}
                                placeholder="0"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                            />
                            {boysError && <AppText className="text-xs text-red-500 mt-1">{boysError}</AppText>}
                        </View>
                        <View className="flex-1">
                            <AppText className="text-sm font-semibold text-[#1a1a1a] mb-1">Girls *</AppText>
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px]"
                                style={INPUT_TEXT_STYLE}
                                keyboardType="numeric"
                                value={girlsValue}
                                onChangeText={onGirlsChange}
                                placeholder="0"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                            />
                            {girlsError && <AppText className="text-xs text-red-500 mt-1">{girlsError}</AppText>}
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
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-1">{label}</AppText>
            <AppText className="text-xs text-gray-500 mb-2.5">{images.length}/{maxPhotos} photos uploaded</AppText>
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
                            style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
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
                        <Image source={require('../../assets/add.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                    </TouchableOpacity>
                )}
            </ScrollView>
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}
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
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">{label}</AppText>
            {value ? (
                <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
                    <Image source={{ uri: value }} style={{ width: 160, height: 120, borderRadius: 12 }} />
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#ef4444', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        onPress={onRemove}
                    >
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    className="border-2 border-blue-200 rounded-xl items-center justify-center bg-blue-50 py-8"
                    style={{ borderStyle: 'dashed' }}
                    onPress={onPick}
                >
                    <Ionicons name="image-outline" size={40} color="#9ca3af" />
                    <AppText className="text-sm text-gray-400 mt-2">{label}</AppText>
                </TouchableOpacity>
            )}
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}
        </View>
    );
}

// ─── Header ──────────────────────────
function FormHeader() {
    return (
        <View className="px-5 pt-5 pb-4 bg-white">
            <AppText className="text-2xl font-bold text-[#1a1a1a] mb-1">Vocational Education</AppText>
            <AppText className="text-sm text-gray-500">
                Please make sure all the required fields are properly filled.
            </AppText>
        </View>
    );
}

// ─── Data Row (Read-only) ──────────────────────────
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

// ─── Submission Table ──────────────────────────
function VocationalFormDataCard({
    submission,
    serialNumber,
}: {
    submission: VocationalEducationFormSubmission;
    serialNumber: number;
}) {

    return (
        <View className="mb-3">
                <View
                    key={submission.id}
                    className="bg-white rounded-2xl mb-3 p-4"
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                    <View className="flex-row items-center mb-2">
                        <View className="bg-green-600 rounded-full px-3 py-1 mr-3">
                            <AppText className="text-lg font-bold text-white">{serialNumber}</AppText>
                        </View>
                        <View className="flex-1">
                            <AppText className="text-base font-bold text-[#1a1a1a]">{submission.trade} - {submission.school_name || 'Submission'}</AppText>
                            <AppText className="text-xs text-gray-500">
                                {new Date(submission.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </AppText>
                        </View>
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        <DataRow label="Trade" value={submission.trade} />
                        <DataRow label="Class 9 (B/G)" value={`${submission.class_9.boys} / ${submission.class_9.girls}`} />
                        <DataRow label="Class 10 (B/G)" value={`${submission.class_10.boys} / ${submission.class_10.girls}`} />
                        <DataRow label="Class 11 (B/G)" value={`${submission.class_11.boys} / ${submission.class_11.girls}`} />
                        <DataRow label="Class 12 (B/G)" value={`${submission.class_12.boys} / ${submission.class_12.girls}`} />
                        <DataRow label="Lab Setup" value={submission.is_lab_setup} />
                        {submission.is_lab_setup === 'No' && <DataRow label="Lab Not Setup Reason" value={submission.lab_not_setup_reason} />}
                        <DataRow label="Guest Lecture" value={submission.is_guest_lecture_done} />
                        {submission.is_guest_lecture_done === 'No' && <DataRow label="Guest Lecture Reason" value={submission.guest_lecture_not_done_reason} />}
                        <DataRow label="Industrial Visit" value={submission.is_industrial_visit_done} />
                        {submission.is_industrial_visit_done === 'No' && <DataRow label="Visit Reason" value={submission.industrial_visit_not_done_reason} />}
                        <DataRow label="Internship" value={submission.is_internship_done} />
                        {submission.is_internship_done === 'Yes' && <DataRow label="Internship Report" value={submission.internship_report} />}
                        {submission.is_internship_done === 'No' && <DataRow label="Internship Reason" value={submission.internship_not_done_reason} />}
                        <DataRow label="Best Practices" value={submission.best_practices} />
                        <DataRow label="Success Stories" value={submission.success_stories} />
                        <PdfFilesSection submission={submission as unknown as Record<string, unknown>} />

                        {(submission.best_practice_photos.length > 0 || submission.success_story_photos.length > 0) && (
                            <View className="mt-2">
                                {submission.best_practice_photos.length > 0 && (
                                    <View className="mb-2">
                                        <AppText className="text-xs font-semibold text-gray-600 mb-1">Best Practice Photos ({submission.best_practice_photos.length})</AppText>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {submission.best_practice_photos.map((url, i) => (
                                                <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                                {submission.success_story_photos.length > 0 && (
                                    <View>
                                        <AppText className="text-xs font-semibold text-gray-600 mb-1">Success Story Photos ({submission.success_story_photos.length})</AppText>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {submission.success_story_photos.map((url, i) => (
                                                <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
        </View>
    );
}

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function VocationalEducationFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [showAllSubmissions, setShowAllSubmissions] = useState(false);
    const [showSubmitSuccessBanner, setShowSubmitSuccessBanner] = useState(false);
    const [showAddPhotoSourceModal, setShowAddPhotoSourceModal] = useState(false);
    const [pendingPhotoTarget, setPendingPhotoTarget] = useState<
        'bestPracticePhotos' | 'successStoryPhotos' | 'labPhoto' | 'guestLecturePhoto' | 'industrialVisitPhoto' | null
    >(null);

    // Authorization check — only teachers with Vocational Education responsibility can access
    const isAuthorized = user?.responsibilities?.includes('Vocational Education') ?? false;

    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
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

    // Fetch all submissions (latest first)
    const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
        queryKey: ['vocational-education-form-submissions', user?.id],
        queryFn: () => getVocationalEducationFormSubmissions(user!.id),
        enabled: !!user?.id,
    });

    // Submit mutation
    const submitMutation = useMutation({
        mutationKey: ['show-text', 'teacher-form-upload'],
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
            setShowSubmitSuccessBanner(true);
            setShowAllSubmissions(true);
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

    const openPhotoSourceModal = useCallback((target: 'bestPracticePhotos' | 'successStoryPhotos' | 'labPhoto' | 'guestLecturePhoto' | 'industrialVisitPhoto') => {
        setPendingPhotoTarget(target);
        setShowAddPhotoSourceModal(true);
    }, []);

    const handlePickedPhoto = useCallback((uri: string) => {
        if (pendingPhotoTarget === 'bestPracticePhotos') {
            const current = form.getValues('bestPracticePhotos');
            form.setValue('bestPracticePhotos', [...current, uri], { shouldValidate: true });
            return;
        }
        if (pendingPhotoTarget === 'successStoryPhotos') {
            const current = form.getValues('successStoryPhotos');
            form.setValue('successStoryPhotos', [...current, uri], { shouldValidate: true });
            return;
        }
        if (pendingPhotoTarget === 'labPhoto' || pendingPhotoTarget === 'guestLecturePhoto' || pendingPhotoTarget === 'industrialVisitPhoto') {
            form.setValue(pendingPhotoTarget, uri, { shouldValidate: true });
        }
    }, [form, pendingPhotoTarget]);

    const pickPhotoFromCamera = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            handlePickedPhoto(result.assets[0].uri);
        }
    }, [handlePickedPhoto]);

    const pickPhotoFromGallery = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera roll permissions.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            handlePickedPhoto(result.assets[0].uri);
        }
    }, [handlePickedPhoto]);

    // Image picker helpers for multi-photo fields
    const addBestPracticePhoto = useCallback(() => {
        openPhotoSourceModal('bestPracticePhotos');
    }, [openPhotoSourceModal]);

    const removeBestPracticePhoto = useCallback((index: number) => {
        const current = form.getValues('bestPracticePhotos');
        form.setValue('bestPracticePhotos', current.filter((_, i) => i !== index), { shouldValidate: true });
    }, [form]);

    const addSuccessStoryPhoto = useCallback(() => {
        openPhotoSourceModal('successStoryPhotos');
    }, [openPhotoSourceModal]);

    const removeSuccessStoryPhoto = useCallback((index: number) => {
        const current = form.getValues('successStoryPhotos');
        form.setValue('successStoryPhotos', current.filter((_, i) => i !== index), { shouldValidate: true });
    }, [form]);

    // Single image picker helpers
    const pickSingleImage = useCallback((fieldName: 'labPhoto' | 'guestLecturePhoto' | 'industrialVisitPhoto') => {
        openPhotoSourceModal(fieldName);
    }, [openPhotoSourceModal]);

    // If showing submissions screen
    if (showAllSubmissions) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
                    {showSubmitSuccessBanner && (
                        <View className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 items-center">
                            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                            <AppText className="text-lg font-bold text-green-700 mt-2">Form Submitted!</AppText>
                            <AppText className="text-sm text-green-600 mt-1 text-center">
                                Your Vocational Education form has been submitted successfully.
                            </AppText>
                        </View>
                    )}

                    <View className="mt-6 mb-4">
                        <AppText className="text-lg font-bold text-[#1a1a1a] mb-3">Your Vocational Education Submissions</AppText>
                        {submissions.length > 0 ? (
                            submissions.map((submission, index) => (
                                <VocationalFormDataCard key={submission.id} submission={submission} serialNumber={index + 1} />
                            ))
                        ) : (
                            <View className="bg-white rounded-2xl p-5" style={{ elevation: 2 }}>
                                <AppText className="text-sm text-gray-500">No submissions found.</AppText>
                            </View>
                        )}
                    </View>

                    <BackToActivityFormsButton onPress={() => router.back()} />
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
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Lab Wasn't Setup *</AppText>
                    <Controller
                        control={control}
                        name="labNotSetupReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                style={INPUT_TEXT_STYLE}
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.labNotSetupReason?.message && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.labNotSetupReason.message}</AppText>
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
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Guest Lecture Not Conducted *</AppText>
                    <Controller
                        control={control}
                        name="guestLectureNotDoneReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                style={INPUT_TEXT_STYLE}
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.guestLectureNotDoneReason?.message && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.guestLectureNotDoneReason.message}</AppText>
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
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Industrial Visit Not Conducted *</AppText>
                    <Controller
                        control={control}
                        name="industrialVisitNotDoneReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                style={INPUT_TEXT_STYLE}
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.industrialVisitNotDoneReason?.message && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.industrialVisitNotDoneReason.message}</AppText>
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
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Internship Report *</AppText>
                    <Controller
                        control={control}
                        name="internshipReport"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                style={INPUT_TEXT_STYLE}
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter Internship Report (max 100 words)"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.internshipReport?.message && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.internshipReport.message}</AppText>
                    )}
                </View>
            )}
            {isInternshipDone === 'No' && (
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Reason Why Internship Not Conducted *</AppText>
                    <Controller
                        control={control}
                        name="internshipNotDoneReason"
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                                style={INPUT_TEXT_STYLE}
                                multiline
                                textAlignVertical="top"
                                placeholder="Enter The Reason (in brief)"
                                placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                                value={value}
                                onChangeText={onChange}
                            />
                        )}
                    />
                    {errors.internshipNotDoneReason?.message && (
                        <AppText className="text-xs text-red-500 mt-1">{errors.internshipNotDoneReason.message}</AppText>
                    )}
                </View>
            )}

            {/* Best Practices */}
            <View className="mb-5">
                <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Best Practices *</AppText>
                <Controller
                    control={control}
                    name="bestPractices"
                    render={({ field: { value, onChange } }) => (
                        <TextInput
                            className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                            style={INPUT_TEXT_STYLE}
                            multiline
                            textAlignVertical="top"
                            placeholder="Enter Best Practices (max 100 words)"
                            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                            value={value}
                            onChangeText={onChange}
                        />
                    )}
                />
                {errors.bestPractices?.message && (
                    <AppText className="text-xs text-red-500 mt-1">{errors.bestPractices.message}</AppText>
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
                <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Success Stories *</AppText>
                <Controller
                    control={control}
                    name="successStories"
                    render={({ field: { value, onChange } }) => (
                        <TextInput
                            className="border border-gray-200 rounded-xl px-4 py-3 bg-[#fafafa] text-[14px] min-h-[100px]"
                            style={INPUT_TEXT_STYLE}
                            multiline
                            textAlignVertical="top"
                            placeholder="Enter Success Stories (max 100 words)"
                            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                            value={value}
                            onChangeText={onChange}
                        />
                    )}
                />
                {errors.successStories?.message && (
                    <AppText className="text-xs text-red-500 mt-1">{errors.successStories.message}</AppText>
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
                        <AppText className="text-base font-bold text-white">Submitting...</AppText>
                    </View>
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

            {submissions.length > 0 && (
                <View className="px-5 py-3 bg-white border-b border-gray-100">
                    <TouchableOpacity
                        className="rounded-xl py-3 items-center flex-row justify-center"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => {
                            setShowSubmitSuccessBanner(false);
                            setShowAllSubmissions(true);
                        }}
                    >
                        <Ionicons name="eye-outline" size={20} color="#fff" />
                        <AppText className="text-lg font-bold text-white ml-2">Show All Submissions</AppText>
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
                        {formContent}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView
                    className="flex-1 bg-white"
                    contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {formContent}
                </ScrollView>
            )}

            <AddPhotoSourceModal
                visible={showAddPhotoSourceModal}
                onClose={() => {
                    setShowAddPhotoSourceModal(false);
                    setPendingPhotoTarget(null);
                }}
                onPickCamera={pickPhotoFromCamera}
                onPickGallery={pickPhotoFromGallery}
            />
        </View>
    );
}
