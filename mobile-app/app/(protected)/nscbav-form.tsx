/**
 * NSCBAV Warden Activity Form Screen (Single-page)
 *
 * Fields:
 * - Photo (proof image)
 * - Number of girl participants
 * - Number of girls benefited
 * - Materials used
 * - Instructor's name
 * - Contact number
 * - Best practices
 * - Success story
 *
 * Only accessible by NSCBAV Wardens. Shows authorization dialog for other wardens.
 * Uses react-hook-form + zodResolver for validation.
 */

import React, { useCallback } from 'react';
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
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import {
    NSCBAVFormSchema,
    type NSCBAVFormData,
} from '../../src/lib/zod';
import {
    submitNSCBAVForm,
    getNSCBAVFormSubmissions,
    type NSCBAVFormSubmission,
} from '../../src/services/firebase/nscbav-form.firestore';
import { getDistricts } from '../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../src/lib/store';

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
            <Text className="text-white text-[28px] font-extrabold mb-1">NSCBAV</Text>
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

// ─── Not Authorized Dialog ──────────────────────────

function NotAuthorizedDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/50 items-center justify-center px-6">
                <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center" style={{ elevation: 10 }}>
                    <Image
                        source={require('../../assets/do_not_enter.png')}
                        style={{ width: 200, height: 200 }}
                        resizeMode="contain"
                    />
                    <Text className="text-xl font-bold text-[#1a1a1a] mt-4 text-center">
                        You're not authorized
                    </Text>
                    <Text className="text-sm text-gray-500 mt-2 text-center leading-5">
                        You don't have permission to access the NSCBAV Form, as only NSCBAV Wardens are authorized.
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        className="mt-5 px-8 py-3 rounded-xl"
                        style={{ backgroundColor: BLUE }}
                    >
                        <Text className="text-white font-bold text-sm">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ─── Submission Table ──────────────────────────

function NSCBAVFormDataTable({ submissions }: { submissions: NSCBAVFormSubmission[] }) {
    if (!submissions.length) return null;

    return (
        <View className="mt-6 mb-4">
            <Text className="text-lg font-bold text-[#1a1a1a] mb-3">Your NSCBAV Submissions</Text>
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
                            <Text className="text-base font-bold text-[#1a1a1a]">NSCBAV Submission</Text>
                            <Text className="text-xs text-gray-500">
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                    <View className="border-t border-gray-100 pt-2 mt-1">
                        {sub.photo ? (
                            <View className="mb-2">
                                <Text className="text-xs font-semibold text-gray-600 mb-1">Photo</Text>
                                <Image source={{ uri: sub.photo }} className="w-20 h-20 rounded-lg" />
                            </View>
                        ) : null}
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
            <Text className="text-xs text-gray-500 w-[45%]">{label}</Text>
            <Text className="text-xs font-medium text-[#1a1a1a] flex-1">{value || '—'}</Text>
        </View>
    );
}

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function NSCBAVFormScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Authorization check — only NSCBAV_WARDEN can submit
    const isAuthorized = user?.role === 'NSCBAV_WARDEN';

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

    const form = useForm<NSCBAVFormData>({
        resolver: zodResolver(NSCBAVFormSchema),
        defaultValues: {
            photo: '',
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
        queryKey: ['nscbav-form-submissions', user?.id],
        queryFn: () => getNSCBAVFormSubmissions(user!.id),
        enabled: !!user?.id && isAuthorized,
    });

    const submitMutation = useMutation({
        mutationFn: async (data: NSCBAVFormData) => {
            return submitNSCBAVForm(data, {
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                ebrc: user!.ebrc || '',
                district: districtName,
            });
        },
        onSuccess: () => {
            Toast.show({ type: 'success', text1: 'NSCBAV form submitted successfully!' });
            refetchSubmissions();
            queryClient.invalidateQueries({ queryKey: ['nscbav-form-submissions'] });
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

    const onSubmit = (data: NSCBAVFormData) => submitMutation.mutate(data);

    const onFormError = () => {
        Toast.show({ type: 'error', text1: 'Please fill all required fields', text2: 'Scroll up to see the errors' });
    };

    // ── Not authorized ──
    if (!isAuthorized) {
        return (
            <View className="flex-1 bg-[#f0f4f8]">
                <StatusBar barStyle="light-content" backgroundColor={BLUE} />
                <FormHeader onBack={() => router.back()} />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} />
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
                        <Text className="text-green-700 font-semibold text-sm ml-3 flex-1">
                            Your NSCBAV form has been submitted successfully.
                        </Text>
                    </View>

                    <NSCBAVFormDataTable submissions={submissions} />

                    <TouchableOpacity
                        className="rounded-xl py-4 items-center mt-2"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => router.back()}
                    >
                        <Text className="text-base font-bold text-white">Back to Activity Forms</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // ── Form content ──
    const renderFormContent = () => (
        <View>
            {/* Photo Upload */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Photo *</Text>
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
                        <Text className="text-sm text-gray-400 mt-2">Tap to upload photo</Text>
                    </View>
                )}
            </TouchableOpacity>
            {errors.photo && <Text className="text-xs text-red-500 mb-4">{errors.photo.message}</Text>}
            {!errors.photo && <View className="mb-5" />}

            {/* Girl Participants */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girl Participants *</Text>
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
            {errors.girlParticipants && <Text className="text-xs text-red-500 mb-4">{errors.girlParticipants.message}</Text>}
            {!errors.girlParticipants && <View className="mb-5" />}

            {/* Girls Benefited */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girls Benifited *</Text>
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
            {errors.girlsBenefited && <Text className="text-xs text-red-500 mb-4">{errors.girlsBenefited.message}</Text>}
            {!errors.girlsBenefited && <View className="mb-5" />}

            {/* Materials Used */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Materials Used *</Text>
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
            {errors.materialsUsed && <Text className="text-xs text-red-500 mb-4">{errors.materialsUsed.message}</Text>}
            {!errors.materialsUsed && <View className="mb-5" />}

            {/* Instructor Name */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Intructor's Name *</Text>
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
            {errors.instructorName && <Text className="text-xs text-red-500 mb-4">{errors.instructorName.message}</Text>}
            {!errors.instructorName && <View className="mb-5" />}

            {/* Contact Number */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Contact Number *</Text>
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
            {errors.contactNumber && <Text className="text-xs text-red-500 mb-4">{errors.contactNumber.message}</Text>}
            {!errors.contactNumber && <View className="mb-5" />}

            {/* Best Practices */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Best Practices *</Text>
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
            {errors.bestPractices && <Text className="text-xs text-red-500 mb-4">{errors.bestPractices.message}</Text>}
            {!errors.bestPractices && <View className="mb-5" />}

            {/* Success Story */}
            <Text className="text-[15px] font-bold text-[#1a1a1a] mb-2">Success Story</Text>
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
