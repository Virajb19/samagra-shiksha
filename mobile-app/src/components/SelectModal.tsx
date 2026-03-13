/**
 * SelectModal — Reusable bottom-sheet select modal.
 *
 * Renders a slide-up Modal with a FlatList of items.
 * Includes bottom padding so the last item is never hidden
 * behind the device navigation bar.
 */

import React from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#1E88E5';

export interface SelectModalProps {
    visible: boolean;
    title: string;
    data: { id: string; name: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
    loading?: boolean;
    accentColor?: string;
}

export default function SelectModal({
    visible,
    title,
    data,
    selectedValue,
    onSelect,
    onClose,
    loading,
    accentColor = ACCENT,
}: SelectModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-[20px] max-h-[70%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                        <AppText className="text-lg font-semibold text-gray-800">{title}</AppText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color={accentColor} style={{ padding: 40 }} />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className={`py-3.5 px-4 border-b border-gray-100 flex-row justify-between items-center ${selectedValue === item.id ? 'bg-blue-50' : 'bg-white'}`}
                                    onPress={() => {
                                        onSelect(item.id);
                                        onClose();
                                    }}
                                >
                                    <AppText
                                        className={`text-base ${selectedValue === item.id ? 'font-semibold' : 'text-gray-700'}`}
                                        style={selectedValue === item.id ? { color: accentColor } : undefined}
                                    >
                                        {item.name}
                                    </AppText>
                                    {selectedValue === item.id && (
                                        <Ionicons name="checkmark" size={20} color={accentColor} />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <AppText className="text-center p-5 text-gray-500">No items available</AppText>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}
