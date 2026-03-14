import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

export function VerifiedBanner() {
    return (
        <View
            className="rounded-xl py-4 items-center flex-row justify-center gap-2"
            style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#34d399', backgroundColor: '#ecfdf5' }}
        >
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <AppText className="text-[15px] font-semibold text-emerald-500">Your account is verified</AppText>
        </View>
    );
}