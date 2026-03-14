import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

const BLUE = '#1565C0';

interface BackToActivityFormsButtonProps {
    onPress: () => void;
    className?: string;
}

export default function BackToActivityFormsButton({
    onPress,
    className = 'rounded-xl py-4 items-center mt-2',
}: BackToActivityFormsButtonProps) {
    return (
        <TouchableOpacity
            className={`${className} flex-row justify-center`}
            style={{ backgroundColor: BLUE }}
            onPress={onPress}
        >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <AppText className="text-base font-bold text-white ml-2">Back to Activity Forms</AppText>
        </TouchableOpacity>
    );
}