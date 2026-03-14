/**
 * ICT Activity Form Screen (Multi-step: 3 pages)
 *
 * Page 1: Equipment & GeoTagged Photos
 * Page 2: Smart Class & Logbook
 * Page 3: Impact & Observations
 *
 * Uses react-hook-form + zodResolver for per-page validation.
 * Shows field errors + toast on "Next" / "Submit" if invalid.
 * On success navigates to a read-only summary (ICT FormData table).
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
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';

import {
    ICTFormPage1Schema,
    ICTFormPage2Schema,
    ICTFormPage3Schema,
    ICTFormSchema,
    type ICTFormData,
    type ICTFormPage1Data,
    type ICTFormPage2Data,
    type ICTFormPage3Data,
} from '../../src/lib/zod';
import { submitICTForm, getICTFormSubmission, type ICTFormSubmission } from '../../src/services/firebase/ict-form.firestore';
import { getFacultyByUserId } from '../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';
import AnimatedTickOption from '../../src/components/AnimatedTickOption';
import AddPhotoSourceModal from '../../src/components/AddPhotoSourceModal';
import FileTooLargeModal from '../../src/components/FileTooLargeModal';
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

// ─── Radio Group (2 options) ──────────────────────────
function RadioField({
    label,
    options,
    value,
    onChange,
    error,
}: {
    label: string;
    options: string[];
    value: string | undefined;
    onChange: (v: string) => void;
    error?: string;
}) {
    return (
        <View className="mb-5">
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2.5">{label}</AppText>
            <View className="flex-row items-center mt-1 flex-wrap">
                {options.map((opt) => (
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

// ─── PDF Upload Component ──────────────────────────
const MAX_PDF_SIZE_MB = 5;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1000 * 1000;

function PdfUploadField({
    label,
    placeholder,
    value,
    onChange,
    error,
}: {
    label: string;
    placeholder: string;
    value: string | undefined;
    onChange: (uri: string) => void;
    error?: string;
}) {
    const [showFileTooLargeModal, setShowFileTooLargeModal] = useState(false);
    const [selectedFileSizeMB, setSelectedFileSizeMB] = useState('0.0');
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

    const pickPdf = async () => {
        try {
            const DocumentPicker = require('expo-document-picker');
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                let sizeBytes = asset.size ?? 0;

                if (!sizeBytes) {
                    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                    if (fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number') {
                        sizeBytes = fileInfo.size;
                    }
                }

                // Strict 5 MB decimal limit (5,000,000 bytes)
                if (sizeBytes > MAX_PDF_SIZE_BYTES) {
                    setSelectedFileSizeMB((sizeBytes / (1000 * 1000)).toFixed(2));
                    setShowFileTooLargeModal(true);
                    return;
                }

                setSelectedFileName(asset.name ?? null);
                onChange(asset.uri);
            }
        } catch (e: any) {
            console.error('[PdfUploadField] Error:', e);
            Alert.alert('Error', 'Failed to pick document. Please try again.');
        }
    };

    const fallbackFileName = value ? decodeURIComponent(value.split('/').pop()?.split('?')[0] || '') : null;
    const fileName = selectedFileName || fallbackFileName;
    const isUploaded = !!value;

    return (
        <View className="mb-5">
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">{label}</AppText>
            <TouchableOpacity
                className="border rounded-xl px-4 py-4 flex-row items-center"
                style={{ borderColor: isUploaded ? '#22c55e' : '#e5e7eb', backgroundColor: isUploaded ? '#f0fdf4' : '#fafafa' }}
                onPress={pickPdf}
            >
                <Ionicons name="document-outline" size={24} color={isUploaded ? '#16a34a' : BLUE} style={{ marginRight: 12 }} />
                <AppText className={`flex-1 text-[14px] ${isUploaded ? 'text-green-700' : 'text-gray-500'}`} numberOfLines={1}>
                    {fileName || placeholder}
                </AppText>
            </TouchableOpacity>
            {value && (
                <View className="flex-row items-center mt-2 bg-green-50 rounded-lg px-3 py-2">
                    <Ionicons name="document-text" size={20} color="#16a34a" style={{ marginRight: 8 }} />
                    <AppText className="flex-1 text-xs text-green-800 font-medium" numberOfLines={1}>{fileName}</AppText>
                    <TouchableOpacity onPress={() => { setSelectedFileName(null); onChange(''); }}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            )}
            {error && <AppText className="text-xs text-red-500 mt-1">{error}</AppText>}

            <FileTooLargeModal
                visible={showFileTooLargeModal}
                onClose={() => setShowFileTooLargeModal(false)}
                fileSizeMB={selectedFileSizeMB}
                maxSizeMB={MAX_PDF_SIZE_MB}
            />
        </View>
    );
}

// ─── Image Picker Grid (Horizontal Scroller) ──────────────────────────
const MAX_PHOTOS = 10;

function ImagePickerGrid({
    images,
    onAdd,
    onRemove,
    error,
}: {
    images: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    error?: string;
}) {
    return (
        <View className="mb-5">
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-1">
                GeoTagged Photo of each ICT material (at least 1, max {MAX_PHOTOS}) *
            </AppText>
            <AppText className="text-xs text-gray-500 mb-2.5">{images.length}/{MAX_PHOTOS} photos uploaded</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible' }} contentContainerStyle={{ gap: 12, paddingRight: 16, paddingTop: 10, paddingLeft: 2, paddingBottom: 4 }}>
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
                {images.length < MAX_PHOTOS && (
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

// ─── Header ──────────────────────────
function FormHeader() {
    return (
        <View className="px-5 pt-5 pb-4 bg-white">
            <AppText className="text-2xl font-bold text-[#1a1a1a] mb-1">ICT Activities</AppText>
            <AppText className="text-sm text-gray-500">
                Please make sure all the required fields are properly filled.
            </AppText>
        </View>
    );
}

// ─── Submission Table ──────────────────────────
function ICTFormDataTable({ submission }: { submission: ICTFormSubmission }) {

    return (
        <View className="mt-6 mb-4">
            <AppText className="text-lg font-bold text-[#1a1a1a] mb-3">Your Recent ICT Submission</AppText>
                <View
                    key={submission.id}
                    className="bg-white rounded-2xl mb-3 p-4"
                    style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                    <View className="flex-row items-center mb-2">
                        <View className="flex-1">
                            <AppText className="text-base font-bold text-[#1a1a1a]">{submission.school_name || 'ICT Submission'}</AppText>
                            <AppText className="text-xs text-gray-500">
                                {new Date(submission.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </AppText>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>

                    <View className="border-t border-gray-100 pt-2 mt-1">
                        <DataRow label="Smart TVs Provided" value={submission.have_smart_tvs} />
                        <DataRow label="UPS Provided" value={submission.have_ups} />
                        <DataRow label="Pendrives Provided" value={submission.have_pendrives} />
                        <DataRow label="ICT Materials Working" value={submission.ict_materials_working} />
                        <DataRow label="Smart TVs Wall Mounted" value={submission.smart_tvs_wall_mounted} />
                        <DataRow label="Smart TVs Location" value={submission.smart_tvs_location} />
                        <DataRow label="Smart Class in Routine" value={submission.smart_class_in_routine} />
                        <DataRow label="Weekly Smart Class Days" value={submission.weekly_smart_class} />
                        <DataRow label="Has Logbook" value={submission.has_logbook} />
                        <DataRow label="Students Benefited" value={submission.students_benefited} />
                        <DataRow label="Smart TVs Other Purposes" value={submission.smart_tvs_other_purposes} />
                        <DataRow label="Smart Class Benefiting" value={submission.is_smart_class_benefiting} />
                        {submission.benefit_comment ? <DataRow label="Benefit Comment" value={submission.benefit_comment} /> : null}
                        <DataRow label="Teacher Impact" value={submission.noticed_impact} />
                        <DataRow label="How Program Helped" value={submission.how_program_helped} />
                        <DataRow label="Observations" value={submission.observations} />
                        <PdfFilesSection submission={submission as unknown as Record<string, unknown>} />
                        {submission.photos_of_materials.length > 0 && (
                            <View className="mt-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Photos ({submission.photos_of_materials.length})</AppText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {submission.photos_of_materials.map((url, i) => (
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

export default function ICTFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [currentPage, setCurrentPage] = useState(1);
    const [showRecentSubmission, setShowRecentSubmission] = useState(false);
    const [showSubmitSuccessBanner, setShowSubmitSuccessBanner] = useState(false);
    const [showAddPhotoSourceModal, setShowAddPhotoSourceModal] = useState(false);

    // Authorization check — only teachers with ICT responsibility can access
    const isAuthorized = user?.responsibilities?.includes('ICT') ?? false;

    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} formName="ICT" />
            </View>
        );
    }

    // ── Page 1 form ──
    const page1Form = useForm<ICTFormPage1Data>({
        resolver: zodResolver(ICTFormPage1Schema),
        defaultValues: {
            haveSmartTvs: undefined,
            haveUps: undefined,
            havePendrives: undefined,
            ictMaterialsWorking: undefined,
            smartTvsWallMounted: undefined,
            smartTvsLocation: undefined,
            ictMaterialPhotos: [],
        },
    });

    // ── Page 2 form ──
    const page2Form = useForm<ICTFormPage2Data>({
        resolver: zodResolver(ICTFormPage2Schema),
        defaultValues: {
            smartClassInRoutine: undefined,
            schoolRoutinePdf: '',
            weeklySmartClassDays: '0',
            hasLogbook: undefined,
            logbookPdf: '',
        },
    });

    // ── Page 3 form ──
    const page3Form = useForm<ICTFormPage3Data>({
        resolver: zodResolver(ICTFormPage3Schema),
        defaultValues: {
            studentsBenefited: '0',
            smartTvsOtherPurposes: undefined,
            isSmartClassBenefiting: undefined,
            benefitComment: '',
            teacherImpact: '',
            howProgramHelped: '',
            observations: '',
        },
    });

    // ── Fetch existing submissions ──
    const { data: recentSubmission, refetch: refetchRecentSubmission } = useQuery({
        queryKey: ['ict-form-submission', user?.id],
        queryFn: () => getICTFormSubmission(user!.id),
        enabled: !!user?.id,
    });

    // ── Submit mutation ──
    const submitMutation = useMutation({
        mutationKey: ['teacher-form-upload'],
        mutationFn: async (data: ICTFormData) => {
            // Fetch faculty + school data at submission time
            const faculty = await getFacultyByUserId(user!.id);
            return submitICTForm(data, {
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
            queryClient.invalidateQueries({ queryKey: ['ict-form-submission'] });
            queryClient.invalidateQueries({ queryKey: ['ict-form-submissions'] });
            Toast.show({ type: 'success', text2: 'ICT form submitted successfully!', visibilityTime: 2000 });
            refetchRecentSubmission();
            setShowSubmitSuccessBanner(true);
            setShowRecentSubmission(true);
        },
        onError: (error: any) => {
            Toast.show({ type: 'error', text2: error?.message || 'Failed to submit ICT form', visibilityTime: 3000 });
        },
    });

    // ── Navigation handlers ──
    const onPage1Error = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        Toast.show({ type: 'error', text2: firstError?.message || 'Please complete all required fields.', visibilityTime: 3000 });
    };

    const onPage2Error = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        Toast.show({ type: 'error', text2: firstError?.message || 'Please complete all required fields.', visibilityTime: 3000 });
    };

    const onPage3Error = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        Toast.show({ type: 'error', text2: firstError?.message || 'Please complete all required fields.', visibilityTime: 3000 });
    };

    const goToPage2 = () => setCurrentPage(2);
    const goToPage3 = () => setCurrentPage(3);

    const onFinalSubmit = (page3Data: ICTFormPage3Data) => {
        // Merge all 3 pages
        const allData: ICTFormData = {
            ...page1Form.getValues(),
            ...page2Form.getValues(),
            ...page3Data,
        };

        // Full validation
        const result = ICTFormSchema.safeParse(allData);
        if (!result.success) {
            const firstError = result.error.issues[0];
            Toast.show({ type: 'error', text2: firstError?.message || 'Please complete all fields.', visibilityTime: 3000 });
            return;
        }

        submitMutation.mutate(result.data);
    };

    // ── Image picker for Page 1 ──
    const addPhoto = useCallback(async () => {
        setShowAddPhotoSourceModal(true);
    }, []);

    const pickPhotoFromCamera = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant camera permissions.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            const current = page1Form.getValues('ictMaterialPhotos');
            page1Form.setValue('ictMaterialPhotos', [...current, result.assets[0].uri], { shouldValidate: true });
        }
    }, [page1Form]);

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
            const current = page1Form.getValues('ictMaterialPhotos');
            page1Form.setValue('ictMaterialPhotos', [...current, result.assets[0].uri], { shouldValidate: true });
        }
    }, [page1Form]);

    const removePhoto = useCallback(
        (index: number) => {
            const current = page1Form.getValues('ictMaterialPhotos');
            page1Form.setValue('ictMaterialPhotos', current.filter((_, i) => i !== index), { shouldValidate: true });
        },
        [page1Form],
    );

    // ── If showing table after successful submit ──
    if (showRecentSubmission && recentSubmission) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
                    {/* Success message */}
                    {showSubmitSuccessBanner && (
                        <View className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 items-center">
                            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                            <AppText className="text-lg font-bold text-green-700 mt-2">Form Submitted!</AppText>
                            <AppText className="text-sm text-green-600 mt-1 text-center">
                                Your ICT Activities form has been submitted successfully.
                            </AppText>
                        </View>
                    )}

                    <ICTFormDataTable submission={recentSubmission} />

                    <BackToActivityFormsButton onPress={() => router.back()} className="rounded-xl py-4 items-center mt-2" />
                </ScrollView>
            </View>
        );
    }

    const renderPageContent = () => (
        <>
            {currentPage === 1 && (
                <Page1
                    form={page1Form}
                    onNext={page1Form.handleSubmit(goToPage2, onPage1Error)}
                    addPhoto={addPhoto}
                    removePhoto={removePhoto}
                />
            )}
            {currentPage === 2 && (
                <Page2
                    form={page2Form}
                    onNext={page2Form.handleSubmit(goToPage3, onPage2Error)}
                    onBack={() => setCurrentPage(1)}
                />
            )}
            {currentPage === 3 && (
                <Page3
                    form={page3Form}
                    onSubmit={page3Form.handleSubmit(onFinalSubmit, onPage3Error)}
                    onBack={() => setCurrentPage(2)}
                    isSubmitting={submitMutation.isPending}
                />
            )}
        </>
    );

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <FormHeader />

            {/* Progress Indicator */}
            <View className="flex-row items-center justify-center py-3 bg-white border-b border-gray-100">
                {[1, 2, 3].map((page) => (
                    <React.Fragment key={page}>
                        <View
                            className="w-8 h-8 rounded-full items-center justify-center"
                            style={{ backgroundColor: currentPage >= page ? BLUE : '#e5e7eb' }}
                        >
                            <AppText className="text-sm font-bold" style={{ color: currentPage >= page ? '#fff' : '#9ca3af' }}>
                                {page}
                            </AppText>
                        </View>
                        {page < 3 && (
                            <View
                                className="h-0.5 w-12"
                                style={{ backgroundColor: currentPage > page ? BLUE : '#e5e7eb' }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </View>

            {recentSubmission && (
                <View className="px-5 py-3 bg-white border-b border-gray-100">
                    <TouchableOpacity
                        className="rounded-xl py-3 items-center flex-row justify-center"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => {
                            setShowSubmitSuccessBanner(false);
                            setShowRecentSubmission(true);
                        }}
                    >
                        <Ionicons name="eye-outline" size={20} color="#fff" />
                        <AppText className="text-lg font-bold text-white ml-2">See Recent Submission</AppText>
                    </TouchableOpacity>
                </View>
            )}

            {/* Page Content */}
            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                        {renderPageContent()}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                    {renderPageContent()}
                </ScrollView>
            )}

            <AddPhotoSourceModal
                visible={showAddPhotoSourceModal}
                onClose={() => setShowAddPhotoSourceModal(false)}
                onPickCamera={pickPhotoFromCamera}
                onPickGallery={pickPhotoFromGallery}
            />
        </View>
    );
}

// ═══════════════════════════════════════════════
// Page 1 — Equipment & Photos
// ═══════════════════════════════════════════════

function Page1({
    form,
    onNext,
    addPhoto,
    removePhoto,
}: {
    form: ReturnType<typeof useForm<ICTFormPage1Data>>;
    onNext: () => void;
    addPhoto: () => void;
    removePhoto: (i: number) => void;
}) {
    const { control, watch, setValue, formState: { errors } } = form;
    const photos = watch('ictMaterialPhotos');
    const smartTvsLocation = watch('smartTvsLocation');

    return (
        <View>
            <Controller
                control={control}
                name="haveSmartTvs"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Are Two Smart TVs provided by Samagra in School?"
                        value={value}
                        onChange={onChange}
                        error={errors.haveSmartTvs?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="haveUps"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Are Two 1KVA UPS provided by Samagra in School?"
                        value={value}
                        onChange={onChange}
                        error={errors.haveUps?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="havePendrives"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Are e-Content Pendrives (1 each for Class 6 to 12) provided by Samagra in School?"
                        value={value}
                        onChange={onChange}
                        error={errors.havePendrives?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="ictMaterialsWorking"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Are all the ICT materials in working condition?"
                        value={value}
                        onChange={onChange}
                        error={errors.ictMaterialsWorking?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="smartTvsWallMounted"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Are the Smart TVs wall mounted?"
                        value={value}
                        onChange={onChange}
                        error={errors.smartTvsWallMounted?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="smartTvsLocation"
                render={({ field: { value, onChange } }) => (
                    <RadioField
                        label="Where are the Smart TVs installed?"
                        options={['Classrooms', 'Other Rooms']}
                        value={value}
                        onChange={onChange}
                        error={errors.smartTvsLocation?.message}
                    />
                )}
            />

            <ImagePickerGrid
                images={photos || []}
                onAdd={addPhoto}
                onRemove={removePhoto}
                error={errors.ictMaterialPhotos?.message}
            />

            {/* Next Button */}
            <TouchableOpacity
                className="rounded-xl py-4 items-center mt-4"
                style={{ backgroundColor: BLUE }}
                onPress={onNext}
            >
                <AppText className="text-base font-bold text-white">Next</AppText>
            </TouchableOpacity>
        </View>
    );
}

// ═══════════════════════════════════════════════
// Page 2 — Smart Class & Logbook
// ═══════════════════════════════════════════════

function Page2({
    form,
    onNext,
    onBack,
}: {
    form: ReturnType<typeof useForm<ICTFormPage2Data>>;
    onNext: () => void;
    onBack: () => void;
}) {
    const { control, setValue, formState: { errors } } = form;

    return (
        <View>
            <Controller
                control={control}
                name="smartClassInRoutine"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is Smart Class incorporated in the school's normal routine?"
                        value={value}
                        onChange={onChange}
                        error={errors.smartClassInRoutine?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="schoolRoutinePdf"
                render={({ field: { value, onChange } }) => (
                    <PdfUploadField
                        label="Submit copy of School Routine"
                        placeholder="Upload School Routine PDF"
                        value={value}
                        onChange={onChange}
                        error={errors.schoolRoutinePdf?.message}
                    />
                )}
            />

            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of days in a week Smart Class is conducted
            </AppText>
            <Controller
                control={control}
                name="weeklySmartClassDays"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                    />
                )}
            />
            {errors.weeklySmartClassDays && (
                <AppText className="text-xs text-red-500 mb-4">{errors.weeklySmartClassDays.message}</AppText>
            )}

            <Controller
                control={control}
                name="hasLogbook"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is the ICT Teacher In-charge maintaining a Register / Logbook on the number of Smart Class conducted?"
                        value={value}
                        onChange={onChange}
                        error={errors.hasLogbook?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="logbookPdf"
                render={({ field: { value, onChange } }) => (
                    <PdfUploadField
                        label="Submit copy of the logbook"
                        placeholder="Upload Scanned or Xerox PDF"
                        value={value}
                        onChange={onChange}
                        error={errors.logbookPdf?.message}
                    />
                )}
            />

            {/* Navigation Buttons */}
            <View className="flex-row gap-4 mt-4">
                <TouchableOpacity
                    className="flex-1 rounded-xl py-4 items-center border-2"
                    style={{ borderColor: BLUE }}
                    onPress={onBack}
                >
                    <AppText className="text-base font-bold" style={{ color: BLUE }}>Go Back</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 rounded-xl py-4 items-center"
                    style={{ backgroundColor: BLUE }}
                    onPress={onNext}
                >
                    <AppText className="text-base font-bold text-white">Next</AppText>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ═══════════════════════════════════════════════
// Page 3 — Impact & Observations
// ═══════════════════════════════════════════════

function Page3({
    form,
    onSubmit,
    onBack,
    isSubmitting,
}: {
    form: ReturnType<typeof useForm<ICTFormPage3Data>>;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
}) {
    const { control, formState: { errors } } = form;

    return (
        <View>
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of students between Class 6 to 12 benefitting from the Smart Classroom Program
            </AppText>
            <Controller
                control={control}
                name="studentsBenefited"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        style={INPUT_TEXT_STYLE}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                    />
                )}
            />
            {errors.studentsBenefited && (
                <AppText className="text-xs text-red-500 mb-4">{errors.studentsBenefited.message}</AppText>
            )}

            <Controller
                control={control}
                name="smartTvsOtherPurposes"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Are the Smart TVs used for any other purposes besides transacting classes using the e-Content pen-drives? For example - for conducting online girls self-defense classes etc."
                        value={value}
                        onChange={onChange}
                        error={errors.smartTvsOtherPurposes?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="isSmartClassBenefiting"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is the Smart Class Program benefiting the students?"
                        value={value}
                        onChange={onChange}
                        error={errors.isSmartClassBenefiting?.message}
                    />
                )}
            />

            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">If Yes, comment in detail</AppText>
            <Controller
                control={control}
                name="benefitComment"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px] mb-5"
                        style={[INPUT_TEXT_STYLE, { textAlignVertical: 'top' }]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Kindly comment in detail"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={4}
                    />
                )}
            />

            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Have the teachers noticed any impact on students' performance after introduction of the Smart Class Program?
            </AppText>
            <Controller
                control={control}
                name="teacherImpact"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px] mb-5"
                        style={[INPUT_TEXT_STYLE, { textAlignVertical: 'top' }]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Kindly comment in detail"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={4}
                    />
                )}
            />
            {errors.teacherImpact && (
                <AppText className="text-xs text-red-500 mb-4">{errors.teacherImpact.message}</AppText>
            )}

            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                How far has the Program helped the Teachers?
            </AppText>
            <Controller
                control={control}
                name="howProgramHelped"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px] mb-5"
                        style={[INPUT_TEXT_STYLE, { textAlignVertical: 'top' }]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Kindly comment in detail"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={4}
                    />
                )}
            />
            {errors.howProgramHelped && (
                <AppText className="text-xs text-red-500 mb-4">{errors.howProgramHelped.message}</AppText>
            )}

            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                What are the basic observations made by the teachers while conducting the Smart Classes?
            </AppText>
            <Controller
                control={control}
                name="observations"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px] mb-5"
                        style={[INPUT_TEXT_STYLE, { textAlignVertical: 'top' }]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Kindly comment in detail"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={4}
                    />
                )}
            />
            {errors.observations && (
                <AppText className="text-xs text-red-500 mb-4">{errors.observations.message}</AppText>
            )}

            {/* Navigation Buttons */}
            <View className="flex-row gap-4 mt-4">
                <TouchableOpacity
                    className="flex-1 rounded-xl py-4 items-center border-2"
                    style={{ borderColor: BLUE }}
                    onPress={onBack}
                    disabled={isSubmitting}
                >
                    <AppText className="text-base font-bold" style={{ color: BLUE }}>Go Back</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 rounded-xl py-4 items-center ${isSubmitting ? 'bg-gray-400' : ''}`}
                    style={!isSubmitting ? { backgroundColor: BLUE } : undefined}
                    onPress={onSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <AppText className="text-base font-bold text-white">Submit</AppText>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
