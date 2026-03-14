import React from 'react';
import { View, Image } from 'react-native';
import { AppText } from '@/components/AppText';

export default function ProfileLockedBanner() {
    return (
        <View
            className="rounded-lg p-3 flex-row items-start mb-4"
            style={{ backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffc107' }}
        >
            <Image
                source={require('../../assets/padlock.png')}
                style={{ width: 20, height: 20, marginTop: 1, marginRight: 8 }}
                resizeMode="contain"
            />
            <AppText className="flex-1 text-[15px] leading-[18px] text-[#856404]">
                Profile is locked and cannot be edited.
            </AppText>
        </View>
    );
}