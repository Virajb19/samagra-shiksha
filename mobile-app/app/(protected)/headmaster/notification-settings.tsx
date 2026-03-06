/**
 * Notification Settings Screen - Headmaster
 * 
 * Manage notification preferences.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface NotificationSetting {
    id: string;
    title: string;
    description: string;
    enabled: boolean;
}

export default function NotificationSettingsScreen() {
    const insets = useSafeAreaInsets();
    const [settings, setSettings] = useState<NotificationSetting[]>([
        {
            id: 'push',
            title: 'Push Notifications',
            description: 'Receive notifications on your device',
            enabled: true,
        },
        {
            id: 'circulars',
            title: 'New Circulars',
            description: 'Get notified when new circulars are published',
            enabled: true,
        },
        {
            id: 'events',
            title: 'Event Reminders',
            description: 'Reminders for upcoming events',
            enabled: true,
        },
        {
            id: 'staff',
            title: 'Staff Verification',
            description: 'Notifications when staff request verification',
            enabled: true,
        },
        {
            id: 'deadline',
            title: 'Deadline Reminders',
            description: 'Reminders for important deadlines',
            enabled: true,
        },
    ]);

    const toggleSetting = (id: string) => {
        setSettings(prev =>
            prev.map(setting =>
                setting.id === id
                    ? { ...setting, enabled: !setting.enabled }
                    : setting
            )
        );
    };

    const handleSave = () => {
        // TODO: Save to API
        Alert.alert('Success', 'Notification settings saved successfully.');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Settings</Text>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.description}>
                    Customize which notifications you want to receive
                </Text>

                <View style={styles.settingsList}>
                    {settings.map((setting, index) => (
                        <View
                            key={setting.id}
                            style={[
                                styles.settingItem,
                                index < settings.length - 1 && styles.settingBorder,
                            ]}
                        >
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingTitle}>{setting.title}</Text>
                                <Text style={styles.settingDescription}>
                                    {setting.description}
                                </Text>
                            </View>
                            <Switch
                                value={setting.enabled}
                                onValueChange={() => toggleSetting(setting.id)}
                                trackColor={{ false: '#e5e7eb', true: '#a8b5d6' }}
                                thumbColor={setting.enabled ? '#2c3e6b' : '#9ca3af'}
                            />
                        </View>
                    ))}
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                    <Text style={styles.infoText}>
                        You can always change these settings later from the Profile tab.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f8',
    },
    header: {
        backgroundColor: '#2c3e6b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    saveButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#2c3e6b',
        borderRadius: 6,
    },
    saveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
    },
    settingsList: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    settingBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        color: '#6b7280',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        padding: 14,
        marginTop: 24,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#3b82f6',
        lineHeight: 18,
    },
});
