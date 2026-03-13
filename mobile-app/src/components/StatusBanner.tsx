import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';

const BLUE = '#1565C0';

interface StatusBannerProps {
    message: string;
    /** If provided, the banner becomes tappable */
    onPress?: () => void;
}

/**
 * Dashed-border status banner used across screens for
 * "Kindly complete your profile" / "Your account is under verification" messages.
 *
 * Uses inline `borderWidth` + `borderStyle: 'dashed'` because
 * NativeWind className-based borderWidth breaks dashed rendering.
 */
export default function StatusBanner({ message, onPress }: StatusBannerProps) {
    const content = (
        <AppText className="text-[15px] font-semibold text-center" style={{ color: BLUE }}>
            {message}
        </AppText>
    );

    const style = {
        borderWidth: 1.5,
        borderColor: BLUE,
        borderStyle: 'dashed' as const,
        backgroundColor: '#e8f4fd',
    };

    if (onPress) {
        return (
            <TouchableOpacity
                className="mx-4 mt-2 rounded-xl py-4 items-center"
                style={style}
                onPress={onPress}
                activeOpacity={0.8}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return (
        <View className="mx-4 mt-2 rounded-xl py-4 items-center" style={style}>
            {content}
        </View>
    );
}
