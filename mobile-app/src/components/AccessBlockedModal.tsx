import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, TouchableOpacity } from 'react-native';
import { AppText } from '@/components/AppText';

const BLUE = '#1565C0';

interface AccessBlockedModalProps {
    visible: boolean;
    mode: 'complete' | 'verification';
    onClose: () => void;
    onComplete: () => void;
}

export default function AccessBlockedModal({
    visible,
    mode,
    onClose,
    onComplete,
}: AccessBlockedModalProps) {
    const isVerification = mode === 'verification';
    const [internalVisible, setInternalVisible] = useState(false);
    const translateY = useRef(new Animated.Value(280)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setInternalVisible(true);
            translateY.setValue(280);
            opacity.setValue(0);
            Animated.parallel([
                Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else if (internalVisible) {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 280, duration: 220, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start(() => setInternalVisible(false));
        }
    }, [visible, internalVisible, opacity, translateY]);

    if (!internalVisible) return null;

    return (
        <Modal visible={internalVisible} transparent statusBarTranslucent onRequestClose={onClose}>
            <Animated.View
                className="flex-1 justify-center items-center px-6"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity }}
            >
                <TouchableOpacity className="absolute top-0 left-0 right-0 bottom-0" activeOpacity={1} onPress={onClose} />
                <Animated.View
                    className="bg-white rounded-3xl w-full px-7 pt-8 pb-7 items-center"
                    style={{ transform: [{ translateY }] }}
                >
                    <Image
                        source={
                            isVerification
                                ? require('../../assets/do_not_enter.png')
                                : require('../../assets/assets_complete.png')
                        }
                        className="w-[140px] h-[140px] mb-5"
                        resizeMode="contain"
                    />
                    <AppText className="text-[22px] font-bold text-[#1a1a2e] text-center mb-2">
                        {isVerification ? 'Account under verification' : 'Complete your profile'}
                    </AppText>
                    <AppText className="text-sm text-gray-500 text-center leading-[22px] mb-7">
                        {isVerification
                            ? 'Your account is under verification. Contact Admin or your headmaster.'
                            : 'Kindly complete your profile by filling up relevant experience details.'}
                    </AppText>
                    {isVerification ? (
                        <TouchableOpacity
                            className="rounded-xl py-3.5 w-full items-center"
                            style={{ backgroundColor: BLUE }}
                            onPress={onClose}
                        >
                            <AppText className="text-white text-base font-semibold">OK, Got it</AppText>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <TouchableOpacity
                                className="rounded-xl py-3.5 w-full items-center mb-3"
                                style={{ backgroundColor: BLUE }}
                                onPress={onComplete}
                            >
                                <AppText className="text-white text-base font-semibold">Complete Profile</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} className="py-2">
                                <AppText className="text-gray-400 text-sm">Maybe later</AppText>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
