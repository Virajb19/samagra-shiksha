import React from 'react';
import { TouchableOpacity, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import type { Project } from '@/types';

const BLUE = '#1565C0';

interface ProjectCardProps {
    project: Project;
    onPress: () => void;
    className?: string;
    style?: StyleProp<ViewStyle>;
    activeOpacity?: number;
}

export default function ProjectCard({
    project,
    onPress,
    className = 'rounded-2xl overflow-hidden',
    style,
    activeOpacity = 0.85,
}: ProjectCardProps) {
    const progressPercent = Math.max(0, Math.min(project.progress, 100));
    const progressWidth = `${progressPercent}%` as DimensionValue;
    const isCompleted = project.status === 'Completed';
    const progressTone = isCompleted
        ? { color: '#22c55e' }
        : progressPercent < 40
            ? { color: '#ef4444' }
            : progressPercent < 80
                ? { color: '#f59e0b' }
                : { color: '#22c55e' };
    const progressLabel =
        project.progress === 0
            ? 'N/A'
            : isCompleted
                ? 'Completed'
                : project.progress >= 100
                    ? '100% (Pending close)'
                    : `${project.progress}%`;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={activeOpacity}
            className={className}
            style={style}
        >
            <View style={{ backgroundColor: BLUE, padding: 16 }}>
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                        <AppText className="text-white/80 text-xs font-semibold mb-1">{project.activity}</AppText>
                        <AppText className="text-white text-lg font-bold" numberOfLines={1}>{project.school_name}</AppText>
                    </View>
                    <View className="rounded-lg px-3 py-1" style={{ backgroundColor: progressTone.color }}>
                        <AppText className="text-white text-xs font-bold">{progressLabel}</AppText>
                    </View>
                </View>
                <View className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <View style={{ width: progressWidth, backgroundColor: progressTone.color, height: '100%', borderRadius: 999 }} />
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <AppText className="text-white/70 text-xs ml-1">{project.district_name}</AppText>
                </View>
            </View>
        </TouchableOpacity>
    );
}
