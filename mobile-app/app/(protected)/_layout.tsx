/**
 * Protected Routes Layout
 * 
 * Guards all routes in (protected) group.
 * Redirects to login if not authenticated.
 * Routes users based on their role.
 * 
 * SECURITY:
 * - Checks auth state on every render
 * - Provides logout in header
 * - Shows user info
 */
// import 'react-native-get-random-values';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { useAuthStore } from '../../src/lib/store';
import { Ionicons } from '@expo/vector-icons';
// import { notificationService } from '../../src/services/notification.service';

export default function ProtectedLayout() {
    const { isAuthenticated, isLoading, user, logout } = useAuthStore();
    const segments = useSegments();
    // const [unreadCount, setUnreadCount] = useState(0);

    // // Fetch unread notification count
    // const fetchUnreadCount = useCallback(async () => {
    //     try {
    //         const count = await notificationService.getUnreadCount(user?.id ?? '');
    //         setUnreadCount(count);
    //     } catch (error) {
    //         console.log('Failed to fetch notification count');
    //     }
    // }, []);

    // // Refresh unread count periodically
    // useEffect(() => {
    //     if (isAuthenticated) {
    //         fetchUnreadCount();
    //         const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    //         return () => clearInterval(interval);
    //     }
    // }, [isAuthenticated, fetchUnreadCount]);

    // Redirect to login if not authenticated
    // Redirect to pending-approval if not active AND profile is completed
    // Route to appropriate screen based on role
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/(auth)/login');
            return;
        }

        if (!isLoading && isAuthenticated && user) {
            // Check current route
            const currentRoute = segments.join('/');

            // Shared routes accessible by all roles — don't redirect
            const sharedRoutes = ['activity-forms', 'notifications', 'ict-form', 'library-form', 'science-lab-form', 'self-defense-form', 'kgbv-form', 'nscbav-form'];
            if (sharedRoutes.some((r) => currentRoute.includes(r))) return;

            // Route based on role
            if (user.role === 'TEACHER') {
                if (!currentRoute.includes('teacher')) {
                    router.replace('/(protected)/teacher/(tabs)/home');
                }
            } else if (user.role === 'HEADMASTER') {
                if (!currentRoute.includes('headmaster')) {
                    router.replace('/(protected)/headmaster/(tabs)/home');
                }
            } else if (user.role === 'KGBV_WARDEN') {
                if (!currentRoute.includes('kgbv-warden')) {
                    router.replace('/(protected)/kgbv-warden/(tabs)/home');
                }
            } else if (user.role === 'NSCBAV_WARDEN') {
                if (!currentRoute.includes('nscbav-warden')) {
                    router.replace('/(protected)/nscbav-warden/(tabs)/home');
                }
            } else if (user.role === 'IE_RESOURCE_PERSON') {
                if (!currentRoute.includes('ie-resource-person')) {
                    router.replace('/(protected)/ie-resource-person/(tabs)/home');
                }
            }
        }
    }, [isAuthenticated, isLoading, user, segments]);

    // Handle logout
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    // Don't render until auth check complete
    if (isLoading || !isAuthenticated) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1a1a2e',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerRight: () => (
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            onPress={() => {
                                // setUnreadCount(0);
                                router.push('/(protected)/notifications' as any);
                            }}
                            className="px-2 py-1.5 relative"
                        >
                            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                            {/* {unreadCount > 0 && (
                                <View className="absolute top-0 right-0.5 bg-[#ef4444] rounded-[10px] min-w-[18px] h-[18px] justify-center items-center px-1">
                                    <Text className="text-white text-[10px] font-bold">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )} */}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} className="px-3 py-1.5">
                            <Text className="text-[#ef4444] text-sm font-medium">Logout</Text>
                        </TouchableOpacity>
                    </View>
                ),
                contentStyle: { backgroundColor: '#0f0f1a' },
            }}
        >
            <Stack.Screen
                name="teacher"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="headmaster"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                }}
            />
            <Stack.Screen
                name="kgbv-warden"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="nscbav-warden"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="ie-resource-person"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="activity-forms"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="ict-form"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="library-form"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="science-lab-form"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="self-defense-form"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="kgbv-form"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="nscbav-form"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}


