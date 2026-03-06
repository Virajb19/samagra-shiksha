/**
 * Headmaster Tabs Layout
 * 
 * Bottom tab navigation for headmaster with:
 * - Home
 * - Events
 * - Circulars
 * - Profile
 */

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../../src/lib/store';

const BLUE = '#1565C0';

export default function HeadmasterTabsLayout() {
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: BLUE,
                    height: Platform.OS === 'android'
                        ? 56 + (StatusBar.currentHeight || insets.top)
                        : undefined,
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: '600' },
                headerStatusBarHeight: Platform.OS === 'android'
                    ? (StatusBar.currentHeight || insets.top)
                    : undefined,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    paddingTop: 8,
                    paddingBottom: insets.bottom || 8,
                    height: 70 + (insets.bottom > 0 ? insets.bottom - 8 : 0),
                },
                tabBarActiveTintColor: BLUE,
                tabBarInactiveTintColor: '#9ca3af',
                tabBarLabelStyle: { fontSize: 12, fontWeight: '500', marginTop: 4 },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'SAMAGRA SHIKSHA',
                    headerTitle: () => (
                        <View style={styles.headerTitle}>
                            <Text style={styles.headerLine1}>समग्र शिक्षा</Text>
                            <Text style={styles.headerLine2}>SAMAGRA SHIKSHA NAGALAND</Text>
                        </View>
                    ),
                    headerLeft: () => (
                        <View style={styles.headerLeft}>
                            <Image
                                source={require('../../../../assets/nbse-logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <Image
                                source={require('../../../../assets/nbse-logo.png')}
                                style={styles.logoRight}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="events"
                options={{
                    title: 'Events',
                    tabBarLabel: 'Events',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="circulars"
                options={{
                    title: 'Circulars',
                    tabBarLabel: 'Circulars',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notices"
                options={{
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    headerRight: {
        marginRight: 12,
    },
    headerTitle: {
        alignItems: 'center',
    },
    headerLine1: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    headerLine2: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    logoRight: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
});
