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
import { AppText } from './AppText';

export function GlobalLoader() {
    const isMutating = useIsMutating();
    const isTeacherFormUploadMutating = useIsMutating({ mutationKey: ['teacher-form-upload'] });

    if (isMutating === 0) return null;

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.backdrop} pointerEvents="auto" />
            <View style={styles.content}>
                <Circle size={100} color="#ffffff" />
                {isTeacherFormUploadMutating > 0 && (
                    <AppText style={styles.message}>Please wait, this might take some time.</AppText>
                )}
            </View>
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
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 260,
        paddingHorizontal: 16,
    },
    message: {
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 18,
        fontSize: 16,
        lineHeight: 22,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.70)',
    },
});
