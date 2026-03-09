/**
 * NotAuthorizedDialog — Shared access-blocked modal
 *
 * Shows a centered dialog with the `do_not_enter.png` image, telling the user
 * they are not authorized to access a particular form. Used by both warden and
 * teacher form screens.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, Modal } from 'react-native';

const BLUE = '#1565C0';

interface NotAuthorizedDialogProps {
    visible: boolean;
    onClose: () => void;
    /** The form name to display in the message, e.g. "ICT", "KGBV" */
    formName: string;
    /** Custom message. If not provided, a default message is used. */
    message?: string;
}

export function NotAuthorizedDialog({ visible, onClose, formName, message }: NotAuthorizedDialogProps) {
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
                        {message || `You are not assigned to the ${formName} responsibility, so you cannot access this form.`}
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
