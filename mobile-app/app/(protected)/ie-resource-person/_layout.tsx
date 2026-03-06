/**
 * IE Resource Person Routes Layout
 * Stack nav: Tabs + Complete Profile + Visit Forms.
 */
import { Stack } from 'expo-router';

export default function IEResourcePersonLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: '#2c3e6b' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: '#f3f4f6' },
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="complete-profile" options={{ title: 'Complete Profile', headerBackTitle: 'Back' }} />
            <Stack.Screen name="view-profile" options={{ headerShown: false }} />
            <Stack.Screen name="school-visit-form" options={{ title: 'IE School Visit', headerBackTitle: 'Back' }} />
            <Stack.Screen name="home-visit-form" options={{ title: 'IE Home Visit', headerBackTitle: 'Back' }} />
        </Stack>
    );
}
