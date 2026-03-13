import React from 'react';
import { Image, Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

interface AddPhotoSourceModalProps {
    visible: boolean;
    onClose: () => void;
    onPickCamera: () => Promise<void> | void;
    onPickGallery: () => Promise<void> | void;
}

const CAMERA_ICON = require('../../assets/camera.png');
const GALLERY_ICON = require('../../assets/picture.png');

export default function AddPhotoSourceModal({
    visible,
    onClose,
    onPickCamera,
    onPickGallery,
}: AddPhotoSourceModalProps) {
    const handleCameraPick = async () => {
        onClose();
        await onPickCamera();
    };

    const handleGalleryPick = async () => {
        onClose();
        await onPickGallery();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable className="flex-1 justify-center items-center px-6 bg-black/25" onPress={onClose}>
                <Pressable className="w-full max-w-[360px] rounded-2xl bg-white p-5" onPress={(e) => e.stopPropagation()}>
                    <AppText className="text-lg font-bold text-[#1a1a1a] text-center">Add Photo</AppText>
                    <AppText className="text-sm text-gray-500 text-center mt-1">Choose image source</AppText>

                    <View className="flex-row gap-5 mt-5">
                        <TouchableOpacity className="flex-1 items-center" onPress={handleCameraPick}>
                            <View className="w-[82px] h-[82px] rounded-2xl bg-blue-50 items-center justify-center mb-2">
                                <Image source={CAMERA_ICON} style={{ width: 64, height: 64 }} resizeMode="contain" />
                            </View>
                            <AppText className="text-sm font-semibold text-gray-700">Camera</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-1 items-center" onPress={handleGalleryPick}>
                            <View className="w-[82px] h-[82px] rounded-2xl bg-blue-50 items-center justify-center mb-2">
                                <Image source={GALLERY_ICON} style={{ width: 64, height: 64 }} resizeMode="contain" />
                            </View>
                            <AppText className="text-sm font-semibold text-gray-700">Gallery</AppText>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity className="mt-5 py-2.5 rounded-lg border border-gray-200" onPress={onClose}>
                        <AppText className="text-center text-gray-600 font-semibold">Cancel</AppText>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
