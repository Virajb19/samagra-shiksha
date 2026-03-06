/**
 * Headmaster Notices Screen
 * 
 * Displays important notices for the headmaster.
 * Supports filtering by Self and Colleagues tabs.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    Linking,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getNotices } from '../../../src/services/firebase/content.firestore';

// No notices image - using a URI since the GIF needs to be added to assets
// To use: Place the no-notices.gif file in mobile-app/assets/ folder
const NO_NOTICES_IMAGE_URI = 'https://raw.githubusercontent.com/AliARIOGLU/react-native-gif/main/assets/empty-box.gif';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'INFO' | 'WARNING' | 'URGENT' | 'ANNOUNCEMENT';
    created_at: string;
    author?: string;
    target?: 'SELF' | 'SCHOOL';
    file_url?: string;
    file_name?: string;
}

type TabType = 'self' | 'colleagues';

export default function NoticesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabType>('self');
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: notices,
        isLoading,
        error,
        refetch,
        isRefetching,
    } = useQuery<Notice[]>({
        queryKey: ['notices', activeTab],
        queryFn: async () => {
            const data = await getNotices();
            return data;
        },
    });

    const filteredNotices = React.useMemo(() => {
        if (!notices) return [];
        if (!searchQuery.trim()) return notices;

        const query = searchQuery.toLowerCase();
        return notices.filter(
            notice =>
                notice.title.toLowerCase().includes(query) ||
                notice.content.toLowerCase().includes(query)
        );
    }, [notices, searchQuery]);

    const getNoticeIcon = (type: Notice['type']) => {
        switch (type) {
            case 'URGENT':
                return { name: 'alert-circle', color: '#ef4444' };
            case 'WARNING':
                return { name: 'warning', color: '#f59e0b' };
            case 'ANNOUNCEMENT':
                return { name: 'megaphone', color: '#8b5cf6' };
            default:
                return { name: 'information-circle', color: '#2c3e6b' };
        }
    };

    const getNoticeTypeStyle = (type: Notice['type']) => {
        switch (type) {
            case 'URGENT':
                return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
            case 'WARNING':
                return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
            case 'ANNOUNCEMENT':
                return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
            default:
                return { bg: '#e8ecf4', text: '#2c3e6b', border: '#c5cee0' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2c3e6b" />
                <Text style={styles.loadingText}>Loading notices...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Failed to load notices</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>View Notices</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInput}>
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        style={styles.searchTextInput}
                        placeholder="Search notices..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'self' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('self')}
                >
                    <Text style={[styles.tabText, activeTab === 'self' && styles.tabTextActive]}>
                        Self
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'colleagues' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('colleagues')}
                >
                    <Text style={[styles.tabText, activeTab === 'colleagues' && styles.tabTextActive]}>
                        Colleagues
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Notices List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {filteredNotices && filteredNotices.length > 0 ? (
                    <>
                        {filteredNotices.map((notice) => {
                            const icon = getNoticeIcon(notice.type);
                            const typeStyle = getNoticeTypeStyle(notice.type);

                            return (
                                <View
                                    key={notice.id}
                                    style={[
                                        styles.noticeCard,
                                        { borderLeftColor: typeStyle.text },
                                    ]}
                                >
                                    <View style={styles.noticeHeader}>
                                        <View
                                            style={[
                                                styles.typeBadge,
                                                {
                                                    backgroundColor: typeStyle.bg,
                                                    borderColor: typeStyle.border,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={icon.name as any}
                                                size={14}
                                                color={typeStyle.text}
                                            />
                                            <Text
                                                style={[
                                                    styles.typeText,
                                                    { color: typeStyle.text },
                                                ]}
                                            >
                                                {notice.type}
                                            </Text>
                                        </View>
                                        <Text style={styles.dateText}>
                                            {formatDate(notice.created_at)}
                                        </Text>
                                    </View>
                                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                                    <Text style={styles.noticeContent}>{notice.content}</Text>
                                    {notice.author && (
                                        <Text style={styles.authorText}>— {notice.author}</Text>
                                    )}
                                    {/* File attachment */}
                                    {notice.file_url && (
                                        <TouchableOpacity
                                            style={styles.fileAttachment}
                                            onPress={async () => {
                                                if (notice.file_url) {
                                                    try {
                                                        const canOpen = await Linking.canOpenURL(notice.file_url);
                                                        if (canOpen) {
                                                            await Linking.openURL(notice.file_url);
                                                        } else {
                                                            Alert.alert('Error', 'Unable to open this file.');
                                                        }
                                                    } catch (err) {
                                                        Alert.alert('Error', 'Failed to open attachment.');
                                                    }
                                                }
                                            }}
                                        >
                                            <Ionicons name="document-attach" size={18} color="#2c3e6b" />
                                            <Text style={styles.fileText}>
                                                {notice.file_name || 'View Attachment'}
                                            </Text>
                                            <Ionicons name="open-outline" size={16} color="#2c3e6b" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Image
                            source={{ uri: NO_NOTICES_IMAGE_URI }}
                            style={styles.emptyGif}
                            resizeMode="contain"
                        />
                        <Text style={styles.emptyTitle}>No Notices</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery
                                ? 'No notices match your search.'
                                : 'There are no important notices at this time. Check back later for updates.'}
                        </Text>
                    </View>
                )}
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
    placeholder: {
        width: 40,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e8ecf4',
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8ecf4',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a2e',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        gap: 12,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#e8ecf4',
    },
    tabButtonActive: {
        backgroundColor: NAVY,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#ffffff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    noticeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: NAVY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    noticeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    noticeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 8,
    },
    noticeContent: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    authorText: {
        fontSize: 13,
        color: '#6b7280',
        fontStyle: 'italic',
        marginTop: 12,
    },
    fileAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#e8ecf4',
        borderRadius: 8,
        gap: 8,
    },
    fileText: {
        flex: 1,
        fontSize: 13,
        color: NAVY,
        fontWeight: '500',
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyGif: {
        width: 200,
        height: 200,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a2e',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
});
