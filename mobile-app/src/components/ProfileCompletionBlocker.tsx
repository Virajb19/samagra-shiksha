import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    Image,
    StatusBar,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserRole } from '../types';

interface ProfileCompletionBlockerProps {
    visible: boolean;
    userName?: string;
    userRole: UserRole;
}

const NAVY = '#2c3e6b';

/**
 * Get the complete-profile route based on user role.
 */
function getCompleteProfileRoute(role: UserRole): string {
    switch (role) {
        case 'TEACHER':
            return '/(protected)/teacher/complete-profile';
        case 'HEADMASTER':
            return '/(protected)/headmaster/complete-profile';
        case 'KGBV_WARDEN':
            return '/(protected)/kgbv-warden/complete-profile';
        case 'NSCBAV_WARDEN':
            return '/(protected)/nscbav-warden/complete-profile';
        case 'IE_RESOURCE_PERSON':
            return '/(protected)/ie-resource-person/complete-profile';
        default:
            return '/(protected)/teacher/complete-profile';
    }
}

export default function ProfileCompletionBlocker({
    visible,
    userName,
    userRole,
}: ProfileCompletionBlockerProps) {
    if (!visible) return null;

    const handleCompleteProfile = () => {
        const route = getCompleteProfileRoute(userRole);
        router.push(route as any);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <StatusBar barStyle="light-content" backgroundColor={NAVY} />

                {/* Dark Navy Header - Matches Login Screen */}
                <View style={styles.headerSection}>
                    <View style={styles.headerContent}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/nbse-logo.png')}
                                style={styles.logo}
                                resizeMode="cover"
                            />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>NBSE</Text>
                            <Text style={styles.headerTitle}>CONNECT</Text>
                        </View>
                    </View>
                </View>

                {/* White Card Section - Matches Login Screen */}
                <View style={styles.card}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <Text style={styles.cardTitle}>Complete your profile</Text>

                        {/* Greeting */}
                        {userName && (
                            <Text style={styles.greeting}>
                                Welcome, <Text style={styles.userName}>{userName}</Text>!
                            </Text>
                        )}

                        {/* Illustration */}
                        <View style={styles.illustrationContainer}>
                            <View style={styles.illustration}>
                                <Ionicons name="document-text" size={60} color={NAVY} />
                                <View style={styles.checkmarkBadge}>
                                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                                </View>
                            </View>
                        </View>

                        {/* Description */}
                        <Text style={styles.description}>
                            Kindly complete your profile by filling up details about your teaching experience. Before you can access all features, you need to provide your professional details.
                        </Text>

                        {/* Warning Banner */}
                        <View style={styles.warningBanner}>
                            <Ionicons name="alert-circle" size={20} color="#92400e" />
                            <Text style={styles.warningText}>
                                <Text style={{ fontWeight: '700' }}>Important:</Text> Your profile information cannot be modified after submission. Please ensure all details are correct.
                            </Text>
                        </View>

                        {/* Action Row - Single Button */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.completeButton}
                                onPress={handleCompleteProfile}
                            >
                                <Text style={styles.completeButtonText}>Complete Profile</Text>
                                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        {/* Info Text */}
                        <Text style={styles.footerInfo}>
                            After completing your profile, an admin will review and approve your account.
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: NAVY,
    },
    /* Header Section */
    headerSection: {
        backgroundColor: NAVY,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    logoContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    logo: {
        width: 70,
        height: 70,
    },
    headerTextContainer: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 2,
        lineHeight: 38,
    },

    /* Card Content */
    card: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 28,
        paddingTop: 36,
    },
    scrollContent: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
        textAlign: 'center',
    },
    greeting: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    userName: {
        color: NAVY,
        fontWeight: '600',
    },

    /* Illustration */
    illustrationContainer: {
        marginBottom: 24,
    },
    illustration: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f4ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },

    /* Text Content */
    description: {
        fontSize: 15,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },

    /* Warning Banner */
    warningBanner: {
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fcd34d',
        marginBottom: 32,
        gap: 12,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: '#92400e',
        lineHeight: 20,
    },

    /* Button */
    buttonContainer: {
        width: '100%',
        marginBottom: 24,
    },
    completeButton: {
        backgroundColor: NAVY,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: NAVY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    completeButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },

    /* Footer */
    footerInfo: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

