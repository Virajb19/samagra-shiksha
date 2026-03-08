/**
 * Library Activity Form Screen (Single-page)
 *
 * All fields on one scrollable page:
 * - Library availability & infrastructure
 * - Management & reading culture
 * - Samagra Shiksha support
 * - Initiatives, feedback
 * - Photo uploads (students + logbook)
 *
 * Uses react-hook-form + zodResolver for validation.
 * Shows field errors + toast on "Submit" if invalid.
 */

import React, { useCallback } from 'react';
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
    LibraryFormSchema,
    type LibraryFormData,
} from '../../src/lib/zod';
import {
    submitLibraryForm,
    getLibraryFormSubmissions,
    type LibraryFormSubmission,
} from '../../src/services/firebase/library-form.firestore';
import { getFacultyByUserId } from '../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../src/lib/store';

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

// ─── Image Picker Grid ──────────────────────────
const MAX_PHOTOS = 10;

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
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-1">
                {label}
            </Text>
            <Text className="text-xs text-gray-500 mb-2.5">{images.length}/{MAX_PHOTOS} photos uploaded</Text>
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
                        <Ionicons name="add" size={36} color={BLUE} />
                    </TouchableOpacity>
                )}
            </ScrollView>
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
            <Text className="text-white text-[28px] font-extrabold mb-1">Library</Text>
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

// ─── Submission Table ──────────────────────────
function LibraryFormDataTable({ submissions }: { submissions: LibraryFormSubmission[] }) {
    if (!submissions.length) return null;

    return (
        <View className="mt-6 mb-4">
            <Text className="text-lg font-bold text-[#1a1a1a] mb-3">Your Library Submissions</Text>
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
                            <Text className="text-base font-bold text-[#1a1a1a]">{sub.school_name || 'Library Submission'}</Text>
                            <Text className="text-xs text-gray-500">
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>

                    <View className="border-t border-gray-100 pt-2 mt-1">
                        <DataRow label="Library Available" value={sub.is_library_available} />
                        <DataRow label="Child Friendly" value={sub.is_child_friendly} />
                        <DataRow label="Proper Furniture" value={sub.has_proper_furniture} />
                        <DataRow label="Management Committee" value={sub.has_management_committee} />
                        <DataRow label="Teacher In-charge" value={sub.library_teacher_name} />
                        <DataRow label="Reading Corner" value={sub.has_reading_corner} />
                        <DataRow label="Reading Corners" value={sub.number_of_reading_corners} />
                        <DataRow label="Computers" value={sub.number_of_computers} />
                        <DataRow label="Readers Club" value={sub.has_readers_club} />
                        <DataRow label="Weekly Library Period" value={sub.has_weekly_library_period} />
                        <DataRow label="Periods/Week" value={sub.library_periods_per_week} />
                        <DataRow label="Books from Samagra" value={sub.received_books_from_samagra} />
                        <DataRow label="Books Received" value={sub.number_of_books_received} />
                        <DataRow label="Initiative" value={sub.innovative_initiative} />
                        {sub.suggestions_feedback ? <DataRow label="Feedback" value={sub.suggestions_feedback} /> : null}
                        {sub.student_photos.length > 0 && (
                            <View className="mt-2">
                                <Text className="text-xs font-semibold text-gray-600 mb-1">Student Photos ({sub.student_photos.length})</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {sub.student_photos.map((url, i) => (
                                        <Image key={i} source={{ uri: url }} className="w-16 h-16 rounded-lg mr-2" />
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        {sub.logbook_photos.length > 0 && (
                            <View className="mt-2">
                                <Text className="text-xs font-semibold text-gray-600 mb-1">Logbook Photos ({sub.logbook_photos.length})</Text>
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
            <Text className="text-xs text-gray-500 w-[45%]">{label}</Text>
            <Text className="text-xs font-medium text-[#1a1a1a] flex-1">{value || '—'}</Text>
        </View>
    );
}

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function LibraryFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // ── Form setup ──
    const form = useForm<LibraryFormData>({
        resolver: zodResolver(LibraryFormSchema),
        defaultValues: {
            isLibraryAvailable: undefined,
            isChildFriendly: undefined,
            hasProperFurniture: undefined,
            hasManagementCommittee: undefined,
            libraryTeacherName: '',
            hasReadingCorner: undefined,
            numberOfReadingCorners: '0',
            numberOfComputers: '0',
            hasReadersClub: undefined,
            hasWeeklyLibraryPeriod: undefined,
            libraryPeriodsPerWeek: '0',
            receivedBooksFromSamagra: undefined,
            numberOfBooksReceived: '0',
            innovativeInitiative: '',
            suggestionsFeedback: '',
            studentPhotos: [],
            logbookPhotos: [],
        },
    });

    const { control, watch, setValue, formState: { errors }, handleSubmit } = form;
    const studentPhotos = watch('studentPhotos');
    const logbookPhotos = watch('logbookPhotos');

    // ── Fetch existing submissions ──
    const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
        queryKey: ['library-form-submissions', user?.id],
        queryFn: () => getLibraryFormSubmissions(user!.id),
        enabled: !!user?.id,
    });

    // ── Submit mutation ──
    const submitMutation = useMutation({
        mutationFn: async (data: LibraryFormData) => {
            const faculty = await getFacultyByUserId(user!.id);
            return submitLibraryForm(data, {
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
            queryClient.invalidateQueries({ queryKey: ['library-form-submissions'] });
            Toast.show({ type: 'success', text2: 'Library form submitted successfully!', visibilityTime: 2000 });
            refetchSubmissions();
            setShowTable(true);
        },
        onError: (error: any) => {
            Toast.show({ type: 'error', text2: error?.message || 'Failed to submit Library form', visibilityTime: 3000 });
        },
    });

    const [showTable, setShowTable] = React.useState(false);

    const onFormError = (formErrors: any) => {
        const firstError = Object.values(formErrors)[0] as any;
        Toast.show({ type: 'error', text2: firstError?.message || 'Please complete all required fields.', visibilityTime: 3000 });
    };

    const onSubmit = (data: LibraryFormData) => {
        submitMutation.mutate(data);
    };

    // ── Image picker helpers ──
    const pickImage = useCallback(async (field: 'studentPhotos' | 'logbookPhotos') => {
        Alert.alert('Add Photo', 'Choose how to add a photo', [
            {
                text: 'Take Photo',
                onPress: async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Required', 'Please grant camera permissions.');
                        return;
                    }
                    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
                    if (!result.canceled && result.assets[0]) {
                        const current = form.getValues(field);
                        form.setValue(field, [...current, result.assets[0].uri], { shouldValidate: true });
                    }
                },
            },
            {
                text: 'Choose from Gallery',
                onPress: async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Required', 'Please grant camera roll permissions.');
                        return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                        const current = form.getValues(field);
                        form.setValue(field, [...current, result.assets[0].uri], { shouldValidate: true });
                    }
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }, [form]);

    const removeImage = useCallback((field: 'studentPhotos' | 'logbookPhotos', index: number) => {
        const current = form.getValues(field);
        form.setValue(field, current.filter((_, i) => i !== index), { shouldValidate: true });
    }, [form]);

    // ── If showing table after successful submit ──
    if (showTable) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
                    {/* Success message */}
                    <View className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 items-center">
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text className="text-lg font-bold text-green-700 mt-2">Form Submitted!</Text>
                        <Text className="text-sm text-green-600 mt-1 text-center">
                            Your Library form has been submitted successfully.
                        </Text>
                    </View>

                    <LibraryFormDataTable submissions={submissions} />

                    <TouchableOpacity
                        className="rounded-xl py-4 items-center mt-4"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => router.back()}
                    >
                        <Text className="text-base font-bold text-white">Back to Activity Forms</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // ── Form Content ──
    const renderFormContent = () => (
        <View>
            {/* Library Availability */}
            <Controller
                control={control}
                name="isLibraryAvailable"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is Library available in the school?"
                        value={value}
                        onChange={onChange}
                        error={errors.isLibraryAvailable?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="isChildFriendly"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is the Library child friendly and vibrant?"
                        value={value}
                        onChange={onChange}
                        error={errors.isChildFriendly?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="hasProperFurniture"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Does the Library have properly maintained book shelves, benches and desks?"
                        value={value}
                        onChange={onChange}
                        error={errors.hasProperFurniture?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="hasManagementCommittee"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Is Library management committee constituted in the school?"
                        value={value}
                        onChange={onChange}
                        error={errors.hasManagementCommittee?.message}
                    />
                )}
            />

            {/* Teacher In-charge */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Name of Library Teacher In-charge
            </Text>
            <Controller
                control={control}
                name="libraryTeacherName"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Library Teacher In-charge's full name"
                        placeholderTextColor="#b0b0b0"
                    />
                )}
            />
            {errors.libraryTeacherName && (
                <Text className="text-xs text-red-500 mb-4">{errors.libraryTeacherName.message}</Text>
            )}

            {/* Reading Corner */}
            <Controller
                control={control}
                name="hasReadingCorner"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Does the school have reading corner?"
                        value={value}
                        onChange={onChange}
                        error={errors.hasReadingCorner?.message}
                    />
                )}
            />

            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of Reading Corners
            </Text>
            <Controller
                control={control}
                name="numberOfReadingCorners"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#b0b0b0"
                    />
                )}
            />
            {errors.numberOfReadingCorners && (
                <Text className="text-xs text-red-500 mb-4">{errors.numberOfReadingCorners.message}</Text>
            )}

            {/* Computers */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of functional Computers in Library
            </Text>
            <Controller
                control={control}
                name="numberOfComputers"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#b0b0b0"
                    />
                )}
            />
            {errors.numberOfComputers && (
                <Text className="text-xs text-red-500 mb-4">{errors.numberOfComputers.message}</Text>
            )}

            {/* Readers Club */}
            <Controller
                control={control}
                name="hasReadersClub"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Does the school have readers club?"
                        value={value}
                        onChange={onChange}
                        error={errors.hasReadersClub?.message}
                    />
                )}
            />

            {/* Library Period */}
            <Controller
                control={control}
                name="hasWeeklyLibraryPeriod"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Do all the class have Library period at least once a week?"
                        value={value}
                        onChange={onChange}
                        error={errors.hasWeeklyLibraryPeriod?.message}
                    />
                )}
            />

            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of Library periods in a week
            </Text>
            <Controller
                control={control}
                name="libraryPeriodsPerWeek"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#b0b0b0"
                    />
                )}
            />
            {errors.libraryPeriodsPerWeek && (
                <Text className="text-xs text-red-500 mb-4">{errors.libraryPeriodsPerWeek.message}</Text>
            )}

            {/* Samagra Shiksha Books */}
            <Controller
                control={control}
                name="receivedBooksFromSamagra"
                render={({ field: { value, onChange } }) => (
                    <YesNoField
                        label="Were any library books received from Samagra Shiksha?"
                        value={value}
                        onChange={onChange}
                        error={errors.receivedBooksFromSamagra?.message}
                    />
                )}
            />

            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Number of Library books received from Samagra Shiksha (till date)
            </Text>
            <Controller
                control={control}
                name="numberOfBooksReceived"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] mb-1"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#b0b0b0"
                    />
                )}
            />
            {errors.numberOfBooksReceived && (
                <Text className="text-xs text-red-500 mb-4">{errors.numberOfBooksReceived.message}</Text>
            )}

            {/* Innovative Initiative */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Any innovative initiative taken up to develop reading culture in children
            </Text>
            <Controller
                control={control}
                name="innovativeInitiative"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px] mb-5"
                        style={{ textAlignVertical: 'top' }}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Explain in-brief"
                        placeholderTextColor="#b0b0b0"
                        multiline
                        numberOfLines={4}
                    />
                )}
            />
            {errors.innovativeInitiative && (
                <Text className="text-xs text-red-500 mb-4">{errors.innovativeInitiative.message}</Text>
            )}

            {/* Suggestions / Feedback */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">
                Suggestions / Feedback
            </Text>
            <Controller
                control={control}
                name="suggestionsFeedback"
                render={({ field: { value, onChange } }) => (
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] min-h-[100px] mb-5"
                        style={{ textAlignVertical: 'top' }}
                        value={value}
                        onChangeText={onChange}
                        placeholder="(Optional)"
                        placeholderTextColor="#b0b0b0"
                        multiline
                        numberOfLines={4}
                    />
                )}
            />

            {/* Student Photos */}
            <ImagePickerGrid
                label="Photos of students utilising library books during library period (atleast 1 Image) *"
                images={studentPhotos || []}
                onAdd={() => pickImage('studentPhotos')}
                onRemove={(i) => removeImage('studentPhotos', i)}
                error={errors.studentPhotos?.message}
            />

            {/* Logbook Photos */}
            <ImagePickerGrid
                label="Photos of Library Logbook (atleast 1 Image) *"
                images={logbookPhotos || []}
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
                    <Text className="text-base font-bold text-white">Submit</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-[#f0f4f8]">
            <StatusBar barStyle="light-content" backgroundColor={BLUE} />
            <FormHeader onBack={() => router.back()} />

            {/* Form Content */}
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
