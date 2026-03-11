/**
 * KGBV Warden Activity Form Screen (Single-page)
 *
 * Fields:
 * - Photo (proof image)
 * - Activities (dropdown)
 * - Number of girl participants
 * - Number of girls benefited
 * - Materials used
 * - Instructor's name
 * - Contact number
 * - Best practices
 * - Success story
 *
 * Only accessible by KGBV Wardens. Shows authorization dialog for other wardens.
 * Uses react-hook-form + zodResolver for validation.
 */

import React, { useCallback, useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
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
    KGBVFormSchema,
    KGBV_ACTIVITY_OPTIONS,
    type KGBVFormData,
} from '../../src/lib/zod';
import {
    submitKGBVForm,
    getKGBVFormSubmissions,
    type KGBVFormSubmission,
} from '../../src/services/firebase/kgbv-form.firestore';
import { getDistricts } from '../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';

const BLUE = '#1565C0';

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
            <AppText className="text-white text-[28px] font-extrabold mb-1">KGBV</AppText>
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

function KGBVFormDataTable({ submissions }: { submissions: KGBVFormSubmission[] }) {
    if (!submissions.length) return null;

    return (
        <View className="mt-6 mb-4">
            <AppText className="text-lg font-bold text-[#1a1a1a] mb-3">Your KGBV Submissions</AppText>
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
                            <AppText className="text-base font-bold text-[#1a1a1a]">{sub.activity || 'KGBV Submission'}</AppText>
                            <AppText className="text-xs text-gray-500">
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </AppText>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        {sub.photo ? (
                            <View className="mb-2">
                                <AppText className="text-xs font-semibold text-gray-600 mb-1">Photo</AppText>
                                <Image source={{ uri: sub.photo }} className="w-20 h-20 rounded-lg" />
                            </View>
                        ) : null}
                        <DataRow label="Activity" value={sub.activity} />
                        <DataRow label="Girl Participants" value={sub.girl_participants} />
                        <DataRow label="Girls Benefited" value={sub.girls_benefited} />
                        <DataRow label="Materials Used" value={sub.materials_used} />
                        <DataRow label="Instructor" value={sub.instructor_name} />
                        <DataRow label="Contact" value={sub.contact_number} />
                        <DataRow label="Best Practices" value={sub.best_practices} />
                        {sub.success_story ? <DataRow label="Success Story" value={sub.success_story} /> : null}
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

export default function KGBVFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Authorization check — only KGBV_WARDEN can submit
    const isAuthorized = user?.role === 'KGBV_WARDEN';

    // Resolve district name from district_id
    const { data: districts = [] } = useQuery({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const districtName = React.useMemo(() => {
        if (!user?.district_id) return '';
        const d = districts.find((dist) => dist.id === user.district_id);
        return d?.name ?? user.district_id;
    }, [user?.district_id, districts]);

    const form = useForm<KGBVFormData>({
        resolver: zodResolver(KGBVFormSchema),
        defaultValues: {
            photo: '',
            activity: '',
            girlParticipants: '',
            girlsBenefited: '',
            materialsUsed: '',
            instructorName: '',
            contactNumber: '',
            bestPractices: '',
            successStory: '',
        },
    });

    const { control, watch, setValue, formState: { errors }, handleSubmit } = form;
    const photo = watch('photo');

    const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
        queryKey: ['kgbv-form-submissions', user?.id],
        queryFn: () => getKGBVFormSubmissions(user!.id),
        enabled: !!user?.id && isAuthorized,
    });

    const submitMutation = useMutation({
        mutationFn: async (data: KGBVFormData) => {
            return submitKGBVForm(data, {
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                ebrc: user!.ebrc || '',
                district: districtName,
                kgbvType: user!.kgbv_type || '',
            });
        },
        onSuccess: () => {
            Toast.show({ type: 'success', text1: 'KGBV form submitted successfully!' });
            refetchSubmissions();
            queryClient.invalidateQueries({ queryKey: ['kgbv-form-submissions'] });
            setShowTable(true);
        },
        onError: (error) => {
            Toast.show({ type: 'error', text1: 'Failed to submit', text2: error.message });
        },
    });

    const [showTable, setShowTable] = React.useState(false);
    const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);

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

    const onSubmit = (data: KGBVFormData) => submitMutation.mutate(data);

    const onFormError = () => {
        Toast.show({ type: 'error', text1: 'Please fill all required fields', text2: 'Scroll up to see the errors' });
    };

    // ── Not authorized ──
    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} formName="KGBV" message="You don't have permission to access the KGBV Form, as only KGBV Wardens are authorized." />
            </View>
        );
    }

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
                            Your KGBV form has been submitted successfully.
                        </AppText>
                    </View>

                    <KGBVFormDataTable submissions={submissions} />

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
            {/* Photo Upload */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Photo *</AppText>
            <TouchableOpacity
                onPress={pickPhoto}
                style={{
                    width: '100%', height: 160, borderRadius: 12,
                    borderWidth: 2, borderStyle: photo ? 'solid' : 'dashed',
                    borderColor: photo ? '#e5e7eb' : '#93c5fd',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: photo ? '#fff' : '#eff6ff',
                    overflow: 'hidden', marginBottom: 4,
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
            {errors.photo && <AppText className="text-xs text-red-500 mb-4">{errors.photo.message}</AppText>}
            {!errors.photo && <View className="mb-5" />}

            {/* Activities Dropdown */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Activities *</AppText>
            <Controller
                control={control}
                name="activity"
                render={({ field: { onChange, value } }) => (
                    <View className="mb-1">
                        {/* Dropdown trigger */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setActivityDropdownOpen((prev) => !prev)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#f9fafb',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: activityDropdownOpen ? '#1565C0' : '#e5e7eb',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                            }}
                        >
                            <AppText
                                style={{
                                    fontSize: 15,
                                    color: value ? '#1a1a1a' : '#9ca3af',
                                    flex: 1,
                                }}
                                numberOfLines={1}
                            >
                                {value || 'Select option'}
                            </AppText>
                            <Ionicons
                                name={activityDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>

                        {/* Dropdown options list */}
                        {activityDropdownOpen && (
                            <View
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#e5e7eb',
                                    marginTop: 4,
                                    maxHeight: 220,
                                    overflow: 'hidden',
                                    elevation: 4,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                }}
                            >
                                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    {KGBV_ACTIVITY_OPTIONS.map((opt) => {
                                        const isSelected = value === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    onChange(opt);
                                                    setActivityDropdownOpen(false);
                                                }}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 12,
                                                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                    borderBottomWidth: 0.5,
                                                    borderBottomColor: '#f3f4f6',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <AppText
                                                    style={{
                                                        fontSize: 14,
                                                        color: isSelected ? '#1565C0' : '#374151',
                                                        fontWeight: isSelected ? '600' : '400',
                                                        flex: 1,
                                                    }}
                                                >
                                                    {opt}
                                                </AppText>
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={18} color="#1565C0" />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}
            />
            {errors.activity && <AppText className="text-xs text-red-500 mb-4">{errors.activity.message}</AppText>}
            {!errors.activity && <View className="mb-5" />}

            {/* Girl Participants */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girl Participants *</AppText>
            <Controller
                control={control}
                name="girlParticipants"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Total Girl Participants"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.girlParticipants && <AppText className="text-xs text-red-500 mb-4">{errors.girlParticipants.message}</AppText>}
            {!errors.girlParticipants && <View className="mb-5" />}

            {/* Girls Benefited */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girls Benifited *</AppText>
            <Controller
                control={control}
                name="girlsBenefited"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Total Girls Benifited"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.girlsBenefited && <AppText className="text-xs text-red-500 mb-4">{errors.girlsBenefited.message}</AppText>}
            {!errors.girlsBenefited && <View className="mb-5" />}

            {/* Materials Used */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Materials Used *</AppText>
            <Controller
                control={control}
                name="materialsUsed"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Materials Used"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={{ minHeight: 80 }}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.materialsUsed && <AppText className="text-xs text-red-500 mb-4">{errors.materialsUsed.message}</AppText>}
            {!errors.materialsUsed && <View className="mb-5" />}

            {/* Instructor Name */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Intructor's Name *</AppText>
            <Controller
                control={control}
                name="instructorName"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Intructor`s Name"
                        placeholderTextColor="#9ca3af"
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
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.contactNumber && <AppText className="text-xs text-red-500 mb-4">{errors.contactNumber.message}</AppText>}
            {!errors.contactNumber && <View className="mb-5" />}

            {/* Best Practices */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Best Practices *</AppText>
            <Controller
                control={control}
                name="bestPractices"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Best Practices"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={{ minHeight: 80 }}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            {errors.bestPractices && <AppText className="text-xs text-red-500 mb-4">{errors.bestPractices.message}</AppText>}
            {!errors.bestPractices && <View className="mb-5" />}

            {/* Success Story */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Success Story</AppText>
            <Controller
                control={control}
                name="successStory"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Write Success Story"
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{ minHeight: 100 }}
                        value={value}
                        onChangeText={onChange}
                    />
                )}
            />
            <View className="mb-5" />

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
