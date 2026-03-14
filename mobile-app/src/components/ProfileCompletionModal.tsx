import React from 'react';
import { Image, Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

const BLUE = '#1565C0';

interface ProfileCompletionModalProps {
    visible: boolean;
    onContinue: () => void;
}

export default function ProfileCompletionModal({ visible, onContinue }: ProfileCompletionModalProps) {
    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onContinue}>
            <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={onContinue}>
                <Pressable className="w-full max-w-[360px] bg-white rounded-3xl p-6 items-center" onPress={(e) => e.stopPropagation()}>
                    <Image
                        source={require('../../assets/assets_submitted.png')}
                        style={{ width: 120, height: 120 }}
                        resizeMode="contain"
                    />
                    <AppText className="text-[22px] font-bold text-[#1a1a1a] mt-2 text-center">Profile Completed</AppText>
                    <AppText className="text-sm text-gray-500 text-center mt-2 leading-5">
                        Profile completed successfully. Your account is now under verification.
                    </AppText>

                    <TouchableOpacity
                        onPress={onContinue}
                        className="mt-5 px-10 py-3 rounded-xl"
                        style={{ backgroundColor: BLUE }}
                    >
                        <AppText className="text-white text-sm font-bold">Continue</AppText>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
