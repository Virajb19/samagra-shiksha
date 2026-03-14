import React from 'react';
import { Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

interface FileTooLargeModalProps {
    visible: boolean;
    onClose: () => void;
    fileSizeMB: string;
    maxSizeMB: number;
}

export default function FileTooLargeModal({
    visible,
    onClose,
    fileSizeMB,
    maxSizeMB,
}: FileTooLargeModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable className="flex-1 justify-center items-center px-6 bg-black/40" onPress={onClose}>
                <Pressable className="w-full max-w-[360px] rounded-2xl bg-white p-5" onPress={(e) => e.stopPropagation()}>
                    <AppText className="text-lg font-bold text-[#1a1a1a] text-center">File Too Large</AppText>
                    <AppText className="text-sm text-gray-600 text-center mt-2">
                          Selected file is{" "}
                     <AppText className="font-bold text-[#1a1a1a]">
                        {fileSizeMB} MB
                     </AppText>.
                    </AppText>
                    <AppText className="text-sm text-gray-600 text-center mt-1">
                            Maximum allowed size is{" "}
                            <AppText className="font-bold text-[#1a1a1a]">
                                {maxSizeMB} MB
                            </AppText>.
                    </AppText>

                    <TouchableOpacity className="mt-5 py-2.5 rounded-lg border border-gray-200" onPress={onClose}>
                        <AppText className="text-center text-gray-700 font-semibold">Close</AppText>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}