/**
 * IE School Visit Form Screen
 *
 * Uses react-hook-form + zodResolver for validation.
 * Shows first error in toast via onFormError.
 */

import React, { useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { IESchoolVisitFormSchema, type IESchoolVisitFormData } from '../../../src/lib/zod';
import { submitIESchoolVisitForm } from '../../../src/services/firebase/ie-visit-form.firestore';
import { getDistricts, getSchools } from '../../../src/services/firebase/master-data.firestore';
import { useAuthStore } from '../../../src/lib/store';
import SelectModal from '../../../src/components/SelectModal';
import AnimatedTickOption from '../../../src/components/AnimatedTickOption';

const BLUE = '#1565C0';
const INPUT_TEXT_STYLE = { fontFamily: 'Lato-Regular' } as const;
const PLACEHOLDER_TEXT_COLOR = '#9ca3af';


function GenderRadio({ value, onChange, error }: { value?: string; onChange: (v: 'MALE' | 'FEMALE') => void; error?: string }) {
    return (
        <View className="mb-5">
            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2.5">Gender *</AppText>
            <View className="flex-row items-center mt-1">
                {(['MALE', 'FEMALE'] as const).map((g) => (
                    <AnimatedTickOption
                        key={g}
                        label={g === 'MALE' ? 'Male' : 'Female'}
                        selected={value === g}
                        onPress={() => onChange(g)}
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

function YesNoField({ label, value, onChange, error }: { label: string; value?: string; onChange: (v: 'Yes' | 'No') => void; error?: string }) {
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

export default function IESchoolVisitFormScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<IESchoolVisitFormData>({
        resolver: zodResolver(IESchoolVisitFormSchema),
        defaultValues: {
            nameOfCwSN: '',
            typeOfDisability: '',
            districtId: '',
            schoolId: '',
            gender: 'MALE',
            age: '',
            activitiesTopics: '',
            therapyType: '',
            therapyBrief: '',
            expectedOutcome: '',
            wasGoalAchieved: 'Yes',
            geoTaggedPhotos: [],
        },
    });

    const selectedDistrictId = watch('districtId');
    const photos = watch('geoTaggedPhotos');

    const { data: districts = [] } = useQuery({ queryKey: ['districts'], queryFn: getDistricts });
    const { data: schools = [], isLoading: isLoadingSchools } = useQuery({
        queryKey: ['schools', selectedDistrictId],
        queryFn: () => getSchools(selectedDistrictId),
        enabled: !!selectedDistrictId,
    });

    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [showSchoolModal, setShowSchoolModal] = useState(false);

    const submitMutation = useMutation({
        mutationFn: (data: IESchoolVisitFormData) => {
            const districtName = districts.find(d => d.id === data.districtId)?.name || '';
            const schoolName = schools.find(s => s.id === data.schoolId)?.name || '';
            return submitIESchoolVisitForm(data, {
                userId: user!.id,
                userName: user!.name,
                rciNumber: user?.rci_number || '',
                ebrc: user?.ebrc || '',
                districtName,
                schoolName,
            });
        },
        onSuccess: () => {
            Toast.show({ type: 'success', text1: 'Success', text2: 'School visit form submitted successfully!' });
            router.back();
        },
        onError: (err) => {
            Toast.show({ type: 'error', text1: 'Error', text2: err instanceof Error ? err.message : 'Failed to submit form' });
        },
    });

    const onFormError = (errs: typeof errors) => {
        const firstKey = Object.keys(errs)[0] as keyof typeof errs;
        if (firstKey) {
            const msg = errs[firstKey]?.message;
            if (msg) Toast.show({ type: 'error', text1: 'Validation Error', text2: String(msg) });
        }
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 10 - photos.length,
        });
        if (!result.canceled && result.assets) {
            const newPhotos = [...photos, ...result.assets.map(a => a.uri)].slice(0, 10);
            setValue('geoTaggedPhotos', newPhotos, { shouldValidate: true });
        }
    };

    const removePhoto = (idx: number) => {
        const updated = photos.filter((_, i) => i !== idx);
        setValue('geoTaggedPhotos', updated, { shouldValidate: true });
    };

    const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
    const selectedSchool = schools.find(s => s.id === watch('schoolId'));

    return (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
                <AppText className="text-2xl font-bold text-[#1a1a1a] mb-1">IE School Visit</AppText>
                <AppText className="text-sm text-gray-500 mb-6">Please make sure all the required fields are properly filled.</AppText>

                {/* Name of CwSN */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Name of CwSN *</AppText>
                    <Controller control={control} name="nameOfCwSN" render={({ field: { onChange, value } }) => (
                        <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" style={INPUT_TEXT_STYLE} placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter full name" value={value} onChangeText={onChange} />
                    )} />
                    {errors.nameOfCwSN && <AppText className="text-xs text-red-500 mt-1">{errors.nameOfCwSN.message}</AppText>}
                </View>

                {/* Type of Disability */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Type of Disability *</AppText>
                    <Controller control={control} name="typeOfDisability" render={({ field: { onChange, value } }) => (
                        <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" style={INPUT_TEXT_STYLE} placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter type of disability" value={value} onChangeText={onChange} />
                    )} />
                    {errors.typeOfDisability && <AppText className="text-xs text-red-500 mt-1">{errors.typeOfDisability.message}</AppText>}
                </View>

                {/* District */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">District *</AppText>
                    <TouchableOpacity className="border border-gray-300 rounded-xl px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowDistrictModal(true)}>
                        <AppText className={selectedDistrict ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{selectedDistrict?.name || 'Select district'}</AppText>
                        <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                    {errors.districtId && <AppText className="text-xs text-red-500 mt-1">{errors.districtId.message}</AppText>}
                </View>

                {/* District Select Modal */}
                <SelectModal
                    visible={showDistrictModal}
                    onClose={() => setShowDistrictModal(false)}
                    title="Select District"
                    data={districts}
                    selectedValue={selectedDistrictId}
                    onSelect={(value) => {
                        setValue('districtId', value, { shouldValidate: true });
                        setValue('schoolId', '', { shouldValidate: false });
                    }}
                />

                {/* School */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">School *</AppText>
                    {!selectedDistrictId ? (
                        <View className="border border-gray-200 rounded-xl px-4 py-3.5 flex-row justify-between items-center bg-gray-100" style={{ opacity: 0.6 }}>
                            <AppText className="text-[15px] text-gray-400">Select district first</AppText>
                            <Ionicons name="chevron-down" size={20} color="#d1d5db" />
                        </View>
                    ) : isLoadingSchools ? (
                        <View className="border border-gray-300 rounded-xl px-4 py-3.5 flex-row justify-between items-center">
                            <AppText className="text-[15px] text-gray-400">Fetching schools...</AppText>
                            <ActivityIndicator size="small" color={BLUE} />
                        </View>
                    ) : (
                        <TouchableOpacity className="border border-gray-300 rounded-xl px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowSchoolModal(true)}>
                            <AppText className={selectedSchool ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{selectedSchool?.name || `Select School in ${selectedDistrict?.name || ''}`}</AppText>
                            <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                    {errors.schoolId && <AppText className="text-xs text-red-500 mt-1">{errors.schoolId.message}</AppText>}
                </View>

                {/* School Select Modal */}
                <SelectModal
                    visible={showSchoolModal}
                    onClose={() => setShowSchoolModal(false)}
                    title={`Select School${selectedDistrict ? ` — ${selectedDistrict.name}` : ''}`}
                    data={schools}
                    selectedValue={watch('schoolId')}
                    onSelect={(value) => {
                        setValue('schoolId', value, { shouldValidate: true });
                    }}
                    loading={isLoadingSchools}
                />

                {/* Gender */}
                <Controller control={control} name="gender" render={({ field: { onChange, value } }) => (
                    <View className="flex-row items-start mb-5">
                        <View className="flex-1">
                            <GenderRadio value={value} onChange={onChange} error={errors.gender?.message} />
                        </View>
                        <View className="flex-1 ml-4">
                            <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Age *</AppText>
                            <Controller control={control} name="age" render={({ field: { onChange: onChangeAge, value: ageVal } }) => (
                                <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" style={INPUT_TEXT_STYLE} placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter age" value={ageVal} onChangeText={onChangeAge} keyboardType="numeric" />
                            )} />
                            {errors.age && <AppText className="text-xs text-red-500 mt-1">{errors.age.message}</AppText>}
                        </View>
                    </View>
                )} />

                {/* Activities / Topics covered */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Activities / Topics covered *</AppText>
                    <Controller control={control} name="activitiesTopics" render={({ field: { onChange, value } }) => (
                        <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter activities" value={value} onChangeText={onChange} multiline numberOfLines={3} textAlignVertical="top" style={[INPUT_TEXT_STYLE, { minHeight: 80 }]} />
                    )} />
                    {errors.activitiesTopics && <AppText className="text-xs text-red-500 mt-1">{errors.activitiesTopics.message}</AppText>}
                </View>

                {/* Type of Therapy */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Type of Therapy (If any therapy is given)</AppText>
                    <Controller control={control} name="therapyType" render={({ field: { onChange, value } }) => (
                        <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" style={INPUT_TEXT_STYLE} placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter type of therapy" value={value} onChangeText={onChange} />
                    )} />
                </View>

                {/* Explain Activities / Therapy */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Explain Activities / Therapy (in brief) *</AppText>
                    <Controller control={control} name="therapyBrief" render={({ field: { onChange, value } }) => (
                        <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter activities / therapy" value={value} onChangeText={onChange} multiline numberOfLines={3} textAlignVertical="top" style={[INPUT_TEXT_STYLE, { minHeight: 80 }]} />
                    )} />
                    {errors.therapyBrief && <AppText className="text-xs text-red-500 mt-1">{errors.therapyBrief.message}</AppText>}
                </View>

                {/* Expected Outcome */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2">Expected Outcome (for the child) *</AppText>
                    <Controller control={control} name="expectedOutcome" render={({ field: { onChange, value } }) => (
                        <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] text-[#1a1a1a]" placeholderTextColor={PLACEHOLDER_TEXT_COLOR} placeholder="Enter expected outcome" value={value} onChangeText={onChange} multiline numberOfLines={3} textAlignVertical="top" style={[INPUT_TEXT_STYLE, { minHeight: 80 }]} />
                    )} />
                    {errors.expectedOutcome && <AppText className="text-xs text-red-500 mt-1">{errors.expectedOutcome.message}</AppText>}
                </View>

                {/* Was the desired goal achieved? */}
                <Controller control={control} name="wasGoalAchieved" render={({ field: { onChange, value } }) => (
                    <YesNoField label="Was the desired goal for the child achieved? *" value={value} onChange={onChange} error={errors.wasGoalAchieved?.message} />
                )} />

                {/* Geo-tagged Photos */}
                <View className="mb-5">
                    <AppText className="text-[15px] font-bold text-[#1a1a1a] mb-2.5">Geo-tagged Photos (atleast 1 Image) *</AppText>
                    <View className="flex-row flex-wrap gap-3">
                        {photos.map((uri, idx) => (
                            <View key={idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
                                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                                <TouchableOpacity style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }} onPress={() => removePhoto(idx)}>
                                    <Ionicons name="close" size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {photos.length < 10 && (
                            <TouchableOpacity style={{ width: 92, height: 92, borderRadius: 14, borderWidth: 2, borderColor: BLUE, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }} onPress={pickImages}>
                                <Image source={require('../../../assets/add.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {errors.geoTaggedPhotos && <AppText className="text-xs text-red-500 mt-1">{errors.geoTaggedPhotos.message}</AppText>}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className="rounded-xl py-4 items-center mb-1"
                    style={{ backgroundColor: BLUE, opacity: submitMutation.isPending ? 0.7 : 1 }}
                    onPress={handleSubmit((data) => submitMutation.mutate(data), onFormError)}
                    disabled={submitMutation.isPending}
                    activeOpacity={0.8}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <AppText className="text-white text-lg font-bold">Submit</AppText>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
