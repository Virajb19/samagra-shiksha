/**
 * Notifications Screen
 * 
 * Shows notification history fetched from server.
 * Users can mark notifications as read.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react-native';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    NotificationItem,
} from '../../../src/services/notification.service';

/**
 * Get icon and color based on notification type
 */
function getNotificationStyle(type: string | null) {
    switch (type) {
        case 'ACCOUNT_ACTIVATED':
            return { color: '#22c55e', icon: '✅' };
        case 'ACCOUNT_DEACTIVATED':
            return { color: '#ef4444', icon: '⚠️' };
        case 'PROFILE_APPROVED':
            return { color: '#22c55e', icon: '✅' };
        case 'PROFILE_REJECTED':
            return { color: '#ef4444', icon: '❌' };
        case 'NEW_CIRCULAR':
            return { color: '#3b82f6', icon: '📄' };
        case 'NEW_EVENT':
            return { color: '#8b5cf6', icon: '📅' };
        case 'NEW_NOTICE':
            return { color: '#f59e0b', icon: '📢' };
        case 'TASK_ASSIGNED':
            return { color: '#06b6d4', icon: '📦' };
        case 'HELPDESK_REPLY':
            return { color: '#ec4899', icon: '💬' };
        default:
            return { color: '#6b7280', icon: '🔔' };
    }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    });
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    /**
     * Fetch notifications
     */
    const fetchNotifications = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
        if (refresh) {
            setIsRefreshing(true);
        } else if (pageNum === 1) {
            setIsLoading(true);
        }

        try {
            const result = await getNotifications(pageNum, 20);
            if (result) {
                if (refresh || pageNum === 1) {
                    setNotifications(result.notifications);
                } else {
                    setNotifications(prev => [...prev, ...result.notifications]);
                }
                setTotalPages(result.totalPages);
                setHasMore(pageNum < result.totalPages);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    /**
     * Load notifications on focus
     */
    useFocusEffect(
        useCallback(() => {
            fetchNotifications(1, true);
        }, [fetchNotifications])
    );

    /**
     * Handle pull-to-refresh
     */
    const handleRefresh = () => {
        fetchNotifications(1, true);
    };

    /**
     * Handle load more
     */
    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            fetchNotifications(page + 1);
        }
    };

    /**
     * Handle mark notification as read
     */
    const handleMarkAsRead = async (notificationId: string) => {
        const success = await markAsRead(notificationId);
        if (success) {
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
        }
    };

    /**
     * Handle mark all as read
     */
    const handleMarkAllAsRead = async () => {
        const success = await markAllAsRead();
        if (success) {
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
        }
    };

    /**
     * Render notification item
     */
    const renderNotification = ({ item }: { item: NotificationItem }) => {
        const style = getNotificationStyle(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    !item.is_read && styles.unreadCard,
                ]}
                onPress={() => !item.is_read && handleMarkAsRead(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.iconContainer}>
                    <Text style={styles.emoji}>{style.icon}</Text>
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {item.body}
                    </Text>
                    <View style={styles.metaRow}>
                        <Clock size={12} color="#6b7280" />
                        <Text style={styles.time}>{formatDate(item.created_at)}</Text>
                        {item.is_read ? (
                            <CheckCheck size={14} color="#22c55e" style={styles.readIcon} />
                        ) : (
                            <View style={styles.unreadDot} />
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    /**
     * Render empty state
     */
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Bell size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
                You're all caught up! New notifications will appear here.
            </Text>
        </View>
    );

    /**
     * Render footer (loading indicator for pagination)
     */
    const renderFooter = () => {
        if (!hasMore || isLoading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color="#4f8cff" />
            </View>
        );
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (isLoading && notifications.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f8cff" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with Mark All Read button */}
            {unreadCount > 0 && (
                <TouchableOpacity
                    style={styles.markAllButton}
                    onPress={handleMarkAllAsRead}
                >
                    <Check size={16} color="#4f8cff" />
                    <Text style={styles.markAllText}>
                        Mark all as read ({unreadCount})
                    </Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderNotification}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor="#4f8cff"
                        colors={['#4f8cff']}
                    />
                }
                contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f0f1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#6b7280',
        marginTop: 12,
        fontSize: 14,
    },
    list: {
        padding: 16,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e1e2e',
    },
    markAllText: {
        color: '#4f8cff',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2a2a3e',
    },
    unreadCard: {
        backgroundColor: '#1e2a3e',
        borderColor: '#3b82f6',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2a2a3e',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    emoji: {
        fontSize: 20,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    body: {
        fontSize: 13,
        color: '#9ca3af',
        lineHeight: 18,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    time: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 4,
    },
    readIcon: {
        marginLeft: 'auto',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        marginLeft: 'auto',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        alignItems: 'center',
    },
});
