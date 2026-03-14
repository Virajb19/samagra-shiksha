import React, { useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Pressable,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTicket } from '../../src/services/firebase/helpdesk.firestore';
import { useAuthStore } from '../../src/lib/store';
import { HelpdeskTicketSchema, type HelpdeskTicketFormData } from '../../src/lib/zod';
import { Toast } from 'react-native-toast-message/lib/src/Toast';

export default function HelpdeskScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<HelpdeskTicketFormData>({
        resolver: zodResolver(HelpdeskTicketSchema),
        defaultValues: { message: '' },
    });

    const messageValue = watch('message');

    const submitMutation = useMutation({
        mutationFn: async (data: HelpdeskTicketFormData) => {
            return await createTicket({
                user_id: user!.id,
                full_name: user!.name || '',
                phone: user!.phone || '',
                message: data.message,
            });
        },
        onSuccess: () => {
            reset();
            setShowSuccessModal(true);
        },
        onError: (error: any) => {
            Toast.show({
                type: 'error',
                text2: error?.message || 'Failed to submit. Please try again.',
            });
        },
    });

    return (
        <KeyboardAvoidingView className="flex-1 bg-[#eaf0fb]" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <AppText className="text-2xl font-bold text-[#1a1a2e] mb-1">Helpdesk</AppText>
                <AppText className="text-sm text-gray-500 mb-6">Please mention your query below. We will respond within 48 hours.</AppText>

                {/* Full Name (read-only) */}
                <View className="mb-4">
                    <AppText className="text-sm font-medium text-gray-600 mb-1.5 ml-1">Full Name</AppText>
                    <TextInput
                        className="bg-[#f3f4f6] rounded-xl px-4 h-12 text-base text-gray-500 border border-[#e5e7eb]"
                        value={user?.name || ''}
                        editable={false}
                    />
                </View>

                {/* Phone Number (read-only) */}
                <View className="mb-4">
                    <AppText className="text-sm font-medium text-gray-600 mb-1.5 ml-1">Phone Number</AppText>
                    <TextInput
                        className="bg-[#f3f4f6] rounded-xl px-4 h-12 text-base text-gray-500 border border-[#e5e7eb]"
                        value={user?.phone || ''}
                        editable={false}
                    />
                </View>

                {/* Message */}
                <View className="mb-6">
                    <AppText className="text-sm font-medium text-gray-600 mb-1.5 ml-1">Message</AppText>
                    <Controller
                        control={control}
                        name="message"
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                className={`bg-white rounded-xl px-4 py-3 text-base text-[#1f2937] min-h-[140px] border ${errors.message ? 'border-red-500' : 'border-[#e5e7eb]'}`}
                                placeholder="Describe your issue in detail (min 10 characters)..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                textAlignVertical="top"
                                value={value}
                                onChangeText={onChange}
                                maxLength={1000}
                            />
                        )}
                    />
                    {errors.message && <AppText className="text-xs text-red-500 mt-1 ml-1">{errors.message.message}</AppText>}
                    <AppText className="text-xs text-gray-400 text-right mt-1">{messageValue?.length || 0}/1000</AppText>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className={`bg-[#3b82f6] rounded-xl py-4 items-center ${submitMutation.isPending ? 'opacity-70' : ''}`}
                    onPress={handleSubmit((data) => submitMutation.mutate(data))}
                    disabled={submitMutation.isPending}
                >
                    {submitMutation.isPending ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <AppText className="text-base font-semibold text-white">Submit</AppText>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View className="flex-1 items-center justify-center px-6 bg-black/40">
                    <Pressable className="absolute inset-0" onPress={() => setShowSuccessModal(false)} />
                    <View className="w-full max-w-[360px] rounded-2xl bg-white px-5 py-6 items-center">
                        <Image
                            source={require('../../assets/assets_submitted.png')}
                            style={{ width: 170, height: 170 }}
                            resizeMode="contain"
                        />
                        <AppText className="text-lg font-bold text-[#1a1a2e] mt-2">Ticket Submitted</AppText>
                        <AppText className="text-sm text-gray-500 text-center mt-1">
                            Your query has been submitted. Our team will get back to you within 48 hours.
                        </AppText>

                        <TouchableOpacity
                            className="mt-6 w-full rounded-xl py-3.5 items-center bg-[#3b82f6]"
                            onPress={() => {
                                setShowSuccessModal(false);
                                router.back();
                            }}
                        >
                            <AppText className="text-white text-base font-semibold">Done</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
