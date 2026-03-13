/**
 * Reusable Profile Header Card
 * Blue rounded-bottom card showing user avatar, name, email, and role badge.
 * Used on all role-specific home screens.
 */

import React from 'react';
import { View, Image } from 'react-native';
import { AppText } from '@/components/AppText';
import { useAuthStore } from '@/lib/store';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderCardProps {
    roleLabel: string;
}

const BLUE = '#1565C0';
const SKY_BLUE_LIGHT = '#7DD3FC';
const SKY_BLUE_SOFT = '#E0F2FE';
const SKY_BLUE_DARK = '#0284C7';

export function ProfileHeaderCard({ roleLabel }: ProfileHeaderCardProps) {
    const { user } = useAuthStore();

    return (
        <View className="rounded-b-3xl px-5 pt-5 pb-7" style={{ backgroundColor: BLUE }}>
            <View className="flex-row items-center rounded-3xl px-3 py-2 bg-white">
                <View className="mr-4">
                    {user?.profile_image_url ? (
                        <Image
                            source={{ uri: user.profile_image_url }}
                            className="w-28 h-28 rounded-full"
                            style={{
                                borderWidth: 3,
                                borderColor: BLUE,
                            }}
                        />
                    ) : (
                        <View className="w-24 h-24 rounded-full justify-center items-center bg-white/20 border-[3px] border-white/40">
                            <Ionicons name="person" size={44} color="rgba(255,255,255,0.8)" />
                        </View>
                    )}
                </View>
                <View className="flex-1">
                    <AppText className="text-black text-3xl font-bold mb-1" numberOfLines={1}>
                        {user?.name || 'User'}
                    </AppText>
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="mail-outline" size={15} color="rgba(0,0,0,0.8)" />
                        <AppText className="text-base text-black/80 ml-1 flex-1" numberOfLines={1}>
                            {user?.email || 'No email'}
                        </AppText>
                    </View>
                    <View className="border-2 items-center justify-center px-3.5 py-1 rounded-lg w-full" style={{ borderColor: SKY_BLUE_LIGHT, backgroundColor: SKY_BLUE_SOFT }}>
                        <AppText className="text-base font-semibold" style={{ color: SKY_BLUE_DARK }}>
                            {roleLabel}
                        </AppText>
                    </View>
                </View>
            </View>
        </View>
    );
}
