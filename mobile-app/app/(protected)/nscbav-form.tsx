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
import { AppText } from '@/components/AppText';
import {
    View,
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
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import {
    NSCBAVFormSchema,
    type NSCBAVFormData,
} from '../../src/lib/zod';
import {
    submitNSCBAVForm,
} from '../../src/services/firebase/nscbav-form.firestore';
import { getDistricts } from '../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../src/lib/store';
import { NotAuthorizedDialog } from '../../src/components/NotAuthorizedDialog';

const BLUE = '#1565C0';
const INPUT_TEXT_STYLE = { fontFamily: 'Lato-Regular' } as const;
const PLACEHOLDER_TEXT_COLOR = '#9ca3af';

// ─── Header ──────────────────────────

function FormHeader() {
    return (
        <View className="px-5 pt-5 pb-4 bg-white">
            <AppText className="text-2xl font-bold text-[#1a1a1a] mb-1">NSCBAV</AppText>
            <AppText className="text-sm text-gray-500">
                Please make sure all the required fields are properly filled.
            </AppText>
        </View>
    );
}

// ═══════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════

export default function NSCBAVFormScreen() {
    const router = useRouter();
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

    const submitMutation = useMutation({
        mutationKey: ['show-text', 'nscbav-form-submit'],
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
            router.back();
        },
        onError: (error) => {
            Toast.show({ type: 'error', text1: 'Failed to submit', text2: error.message });
        },
    });

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
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <FormHeader />
                <NotAuthorizedDialog visible={true} onClose={() => router.back()} formName="NSCBAV" message="You don't have permission to access the NSCBAV Form, as only NSCBAV Wardens are authorized." />
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

            {/* Girl Participants */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girl Participants *</AppText>
            <Controller
                control={control}
                name="girlParticipants"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Total Girl Participants"
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
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Number of Girls Benifited *</AppText>
            <Controller
                control={control}
                name="girlsBenefited"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Total Girls Benifited"
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

            {/* Materials Used */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Materials Used *</AppText>
            <Controller
                control={control}
                name="materialsUsed"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Materials Used"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={[INPUT_TEXT_STYLE, { minHeight: 80 }]}
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

            {/* Best Practices */}
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Best Practices *</AppText>
            <Controller
                control={control}
                name="bestPractices"
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a] border border-gray-200 mb-1"
                        placeholder="Enter Best Practices"
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        style={[INPUT_TEXT_STYLE, { minHeight: 80 }]}
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
                        placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={[INPUT_TEXT_STYLE, { minHeight: 100 }]}
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
