/**
 * GlobalLoader
 *
 * Full-screen semi-transparent overlay that appears automatically
 * whenever any TanStack React Query mutation is in-flight.
 * Uses react-native-animated-spinkit Bars spinner.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useIsMutating } from '@tanstack/react-query';
import { Circle } from 'react-native-animated-spinkit';

export function GlobalLoader() {
    const isMutating = useIsMutating();

    if (isMutating === 0) return null;

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.backdrop} pointerEvents="auto" />
            <Circle size={100} color="#ffffff" />
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.70)',
    },
});
