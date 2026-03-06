/**
 * Teacher Helpdesk Screen
 * 
 * Provides support options and ticket submission.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getMyTickets, createTicket } from '../../../src/services/firebase/helpdesk.firestore';
import { useAuthStore } from '../../../src/lib/store';

interface SupportOption {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBgColor: string;
    action: () => void;
}

interface HelpdeskTicket {
    id: string;
    full_name: string;
    phone: string;
    message: string;
    is_resolved: boolean;
    created_at: string;
}

export default function TeacherHelpdeskScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showTicketForm, setShowTicketForm] = useState(false);
    const [message, setMessage] = useState('');
    const { user } = useAuthStore();

    // Fetch user's tickets
    const { data: myTickets, refetch: refetchTickets } = useQuery<HelpdeskTicket[]>({
        queryKey: ['my-helpdesk-tickets'],
        queryFn: async () => {
            const data = await getMyTickets(user!.id);
            return data;
        },
    });

    // Refetch tickets when screen gains focus
    useFocusEffect(useCallback(() => { refetchTickets(); }, [refetchTickets]));

    const submitTicketMutation = useMutation({
        mutationFn: async (data: { message: string }) => {
            return await createTicket({ user_id: user!.id, full_name: user!.name || '', phone: user!.phone || '', message: data.message });
        },
        onSuccess: () => {
            Alert.alert(
                'Success',
                'Your support ticket has been submitted. Our team will get back to you within 24-48 hours.',
                [{ text: 'OK', onPress: () => setShowTicketForm(false) }]
            );
            setMessage('');
            refetchTickets();
        },
        onError: (error: any) => {
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to submit ticket. Please try again.'
            );
        },
    });

    const handleSubmitTicket = () => {
        if (!message.trim() || message.length < 10) {
            Alert.alert('Error', 'Please describe your issue (minimum 10 characters)');
            return;
        }
        submitTicketMutation.mutate({ message });
    };

    const supportOptions: SupportOption[] = [
        {
            id: 'email',
            title: 'Email Support',
            description: 'Send us an email at support@nbse.edu.in',
            icon: 'mail-outline',
            iconColor: '#3b82f6',
            iconBgColor: '#dbeafe',
            action: () => {
                Linking.openURL('mailto:support@nbse.edu.in?subject=Support Request - NBSE Connect');
            },
        },
        {
            id: 'ticket',
            title: 'Submit Ticket',
            description: 'Create a support ticket for detailed assistance',
            icon: 'ticket-outline',
            iconColor: '#8b5cf6',
            iconBgColor: '#ede9fe',
            action: () => setShowTicketForm(true),
        },
    ];

    const faqItems = [
        {
            question: 'How do I complete my profile?',
            answer: 'Go to the Home screen and tap on "Complete Profile". Fill in your designation, qualifications, and teaching assignments.',
        },
        {
            question: 'How do I view my colleagues?',
            answer: 'After completing your profile, tap on "View Colleagues" from the Home screen to see all staff members in your school.',
        },
        {
            question: 'How do I view important notices?',
            answer: 'After completing your profile, tap on "Important Notices" from the Home screen.',
        },
        {
            question: 'Why can\'t I edit my profile?',
            answer: 'Profile details can only be submitted once and cannot be modified. Please contact administration if changes are needed.',
        },
    ];

    return (
        <View className="flex-1 bg-[#f0f2f8]">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {!showTicketForm ? (
                    <>
                        {/* Hero Section */}
                        <View className="items-center py-6">
                            <View className="w-20 h-20 rounded-full bg-[#e8eaf6] justify-center items-center mb-4">
                                <Ionicons name="headset" size={48} color="#2c3e6b" />
                            </View>
                            <Text className="text-[22px] font-bold text-[#1f2937] mb-2">How can we help you?</Text>
                            <Text className="text-sm text-gray-500 text-center">
                                Choose from the options below or browse our FAQs
                            </Text>
                        </View>

                        {/* Support Options */}
                        <View className="mb-6">
                            <Text className="text-base font-semibold text-[#2c3e6b] mb-3">Contact Us</Text>
                            <View className="flex-row flex-wrap gap-3">
                                {supportOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.id}
                                        className="w-[47%] bg-white rounded-xl p-4 items-center"
                                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                                        onPress={option.action}
                                    >
                                        <View
                                            className="w-12 h-12 rounded-full justify-center items-center mb-3"
                                            style={{ backgroundColor: option.iconBgColor }}
                                        >
                                            <Ionicons
                                                name={option.icon}
                                                size={24}
                                                color={option.iconColor}
                                            />
                                        </View>
                                        <Text className="text-sm font-semibold text-[#1f2937] mb-1">{option.title}</Text>
                                        <Text className="text-xs text-gray-500 text-center">
                                            {option.description}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* FAQs */}
                        <View className="mb-6">
                            <Text className="text-base font-semibold text-[#2c3e6b] mb-3">Frequently Asked Questions</Text>
                            {faqItems.map((faq, index) => (
                                <View key={index} className="bg-white rounded-xl p-4 mb-3">
                                    <View className="flex-row items-center gap-2 mb-2">
                                        <Ionicons
                                            name="help-circle"
                                            size={20}
                                            color="#2c3e6b"
                                        />
                                        <Text className="flex-1 text-sm font-semibold text-[#1f2937]">{faq.question}</Text>
                                    </View>
                                    <Text className="text-[13px] text-gray-500 leading-5 ml-7">{faq.answer}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Office Hours */}
                        <View className="flex-row items-center bg-[#f3f4f6] rounded-xl p-4 gap-3 mb-6">
                            <Ionicons name="time-outline" size={20} color="#6b7280" />
                            <View className="flex-1">
                                <Text className="text-sm font-semibold text-[#374151]">Support Hours</Text>
                                <Text className="text-[13px] text-gray-500 mt-0.5">
                                    Monday - Friday: 9:00 AM - 5:00 PM
                                </Text>
                            </View>
                        </View>

                        {/* My Tickets */}
                        {myTickets && myTickets.length > 0 && (
                            <View className="mb-6">
                                <Text className="text-base font-semibold text-[#2c3e6b] mb-3">My Recent Tickets</Text>
                                {myTickets.slice(0, 3).map((ticket) => (
                                    <View key={ticket.id} className="bg-white rounded-xl p-4 mb-3 border border-[#e5e7eb]">
                                        <View className="flex-row justify-between items-center mb-2">
                                            <View className="px-2.5 py-1 rounded-xl" style={{ backgroundColor: ticket.is_resolved ? '#dcfce7' : '#fef3c7' }}>
                                                <Text className="text-xs font-medium" style={{ color: ticket.is_resolved ? '#16a34a' : '#d97706' }}>
                                                    {ticket.is_resolved ? 'Resolved' : 'Pending'}
                                                </Text>
                                            </View>
                                            <Text className="text-xs text-gray-500">
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text className="text-sm text-[#374151] leading-5" numberOfLines={2}>
                                            {ticket.message}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    /* Ticket Form */
                    <View className="bg-white rounded-2xl p-5">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-lg font-semibold text-[#1f2937]">Submit Support Ticket</Text>
                            <TouchableOpacity onPress={() => setShowTicketForm(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Message */}
                        <View className="mb-5">
                            <Text className="text-sm font-medium text-[#374151] mb-2">Describe your issue</Text>
                            <TextInput
                                className="bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] px-3.5 py-3 text-[15px] text-[#1f2937] min-h-[160px]"
                                style={{ paddingTop: 12 }}
                                placeholder="Please describe your issue in detail (minimum 10 characters)..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                                value={message}
                                onChangeText={setMessage}
                            />
                            <Text className="text-xs text-gray-400 text-right mt-1">{message.length}/1000</Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            className={`bg-[#2c3e6b] flex-row items-center justify-center py-3.5 rounded-[10px] gap-2 mt-2 ${submitTicketMutation.isPending ? 'bg-gray-400' : ''}`}
                            onPress={handleSubmitTicket}
                            disabled={submitTicketMutation.isPending}
                        >
                            {submitTicketMutation.isPending ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color="#ffffff" />
                                    <Text className="text-base font-semibold text-white">Submit Ticket</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
