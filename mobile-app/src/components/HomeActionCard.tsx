import React from 'react';
import { Image, ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#1565C0';
const PROFILE_ICON = require('../../assets/assets_profile.png');
const NOTICES_ICON = require('../../assets/assets_promote.png');
const TEAMWORK_ICON = require('../../assets/assets_teamwork.png');
const FORM_ICON = require('../../assets/assets_form.png');

interface HomeActionCardProps {
    title: string;
    iconName: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    disabled?: boolean;
    iconSource?: ImageSourcePropType;
}

export default function HomeActionCard({
    title,
    iconName,
    onPress,
    disabled = false,
    iconSource,
}: HomeActionCardProps) {
    const normalizedTitle = title.toLowerCase();
    const fallbackIconSource =
        normalizedTitle.includes('profile')
            ? PROFILE_ICON
            : normalizedTitle.includes('important notices')
                ? NOTICES_ICON
                : normalizedTitle.includes('colleague') || normalizedTitle.includes('staff')
                    ? TEAMWORK_ICON
                    : normalizedTitle.includes('project') || normalizedTitle.includes('visit')
                        ? FORM_ICON
                        : null;
    const resolvedIconSource = iconSource ?? fallbackIconSource;

    return (
        <TouchableOpacity
            className={`bg-white rounded-xl items-center justify-center py-4 px-2 w-[31%] min-h-[110px] shadow-sm ${disabled ? 'opacity-50' : ''}`}
            style={{ elevation: 2 }}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View className="w-16 h-16 rounded-full bg-[#e8f4fd] justify-center items-center mb-2">
                {resolvedIconSource ? (
                    <Image source={resolvedIconSource} style={{ width: 55, height: 55 }} resizeMode="contain" />
                ) : (
                    <Ionicons name={iconName} size={34} color={disabled ? '#9ca3af' : BLUE} />
                )}
            </View>
            <AppText
                className={`text-[14px] font-bold text-center leading-[15px] ${disabled ? 'text-gray-400' : 'text-gray-800'}`}
                numberOfLines={2}
            >
                {title}
            </AppText>
        </TouchableOpacity>
    );
}
