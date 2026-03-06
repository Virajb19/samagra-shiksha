/**
 * Headmaster/Principal Home Screen
 * 
 * Redirects to the tabs layout.
 */

import { useEffect } from 'react';
import { router } from 'expo-router';

export default function HeadmasterIndexRedirect() {
    useEffect(() => {
        router.replace('/(protected)/headmaster/(tabs)/home');
    }, []);

    return null;
}
