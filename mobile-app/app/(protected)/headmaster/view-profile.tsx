/**
 * Headmaster View Profile Screen
 * 
 * Displays the headmaster's profile information including
 * school details, qualifications, and experience.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getFacultyByUserId } from '../../../src/services/firebase/faculty.firestore';
import { useAuthStore } from '../../../src/lib/store';

interface FacultyProfile {
    id: string;
    highest_qualification: string;
    years_of_experience: number;
    designation: string;
    is_profile_locked: boolean;
    school: {
        id: string;
        name: string;
        registration_code?: string;
        code?: string;
        district?: {
            name: string;
        };
    } | null;
}

interface ProfileResponse {
    has_profile: boolean;
    faculty: FacultyProfile | null;
}

export default function ViewProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const {
        data: profile,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['faculty-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error('Not authenticated');
            const data = await getFacultyByUserId(user.id);
            return data; // null if no faculty doc yet
        },
        enabled: !!user?.id,
    });

    // Format gender for display
    const formatGender = (gender: string | null | undefined) => {
        if (!gender) return 'Not specified';
        return gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : gender;
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2c3e6b" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load profile</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
                <Text style={[styles.errorText, { marginTop: 12 }]}>Profile not completed yet</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => router.replace('/(protected)/headmaster/complete-profile')}
                >
                    <Text style={styles.retryButtonText}>Complete Profile</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                <Text style={styles.headerTitle}>My Profile</Text>
                {!profile.is_profile_locked && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push('/headmaster/complete-profile')}
                    >
                        <Text style={styles.editButtonText}>Edit Details</Text>
                    </TouchableOpacity>
                )}
                {profile.is_profile_locked && <View style={styles.placeholder} />}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Profile Locked Badge */}
                {profile.is_profile_locked && (
                    <View style={styles.lockedBadge}>
                        <Ionicons name="lock-closed" size={16} color="#2c3e6b" />
                        <Text style={styles.lockedText}>
                            Profile is locked and cannot be edited
                        </Text>
                    </View>
                )}

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Full Name</Text>
                                <Text style={styles.infoValue}>{user?.name || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={styles.infoValue}>{user?.phone || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Ionicons name={user?.gender === 'MALE' ? 'male' : user?.gender === 'FEMALE' ? 'female' : 'person-outline'} size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Gender</Text>
                                <Text style={styles.infoValue}>{formatGender(user?.gender)}</Text>
                            </View>
                        </View>
                        {user?.email && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <Ionicons name="mail-outline" size={20} color="#6b7280" />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Email</Text>
                                        <Text style={styles.infoValue}>{user.email}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* School Information */}
                {profile.school && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>School Information</Text>
                        <View style={styles.card}>
                            <View style={styles.infoRow}>
                                <Ionicons name="school-outline" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>School Name</Text>
                                    <Text style={styles.infoValue}>{profile.school.name}</Text>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <Ionicons name="barcode-outline" size={20} color="#6b7280" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>School Code</Text>
                                    <Text style={styles.infoValue}>{profile.school.registration_code || profile.school.code || '-'}</Text>
                                </View>
                            </View>
                            {profile.school.district && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location-outline" size={20} color="#6b7280" />
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>District</Text>
                                            <Text style={styles.infoValue}>{profile.school.district.name}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}

                {/* Experience Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Experience Details</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="briefcase-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Designation</Text>
                                <Text style={styles.infoValue}>
                                    {profile.designation || 'Principal/Headmaster'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="ribbon-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Highest Qualification</Text>
                                <Text style={styles.infoValue}>
                                    {profile.highest_qualification}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Ionicons name="time-outline" size={20} color="#6b7280" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Years of Experience</Text>
                                <Text style={styles.infoValue}>
                                    {profile.years_of_experience} years
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const NAVY = '#2c3e6b';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: NAVY,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    editButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
    placeholder: {
        width: 80,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8ecf4',
        borderWidth: 1,
        borderColor: '#c5cee0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    lockedText: {
        fontSize: 13,
        color: NAVY,
        fontWeight: '500',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        shadowColor: NAVY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: '#1a1a2e',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f2f8',
        marginVertical: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f8',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f8',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: NAVY,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});
