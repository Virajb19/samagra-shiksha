/**
 * Login Screen
 * 
 * Email + Password login.
 * 
 * SECURITY:
 * - All non-admin users can login
 * - Admin users are blocked (must use admin portal)
 * - Inactive users (not approved by admin) are blocked
 * - Clear error messages for all failure cases
 * 
 * Uses react-hook-form with zod validation.
 */

import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/lib/store';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginFormData } from '../../src/lib/zod';

/** Dark navy color used in header and primary buttons */
const NAVY = '#2c3e6b';
const NAVY_LIGHT = '#3a5086';

export default function LoginScreen() {
    const { login } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    /**
     * Handle form submission.
     */
    const onSubmit = async (data: LoginFormData) => {
        setError(null);

        try {
            const result = await login({ email: data.email, password: data.password });

            if (!result.success) {
                setError(result.error || 'Login failed. Please try again.');
            }
            // On success, the (auth)/_layout guard will detect isAuthenticated
            // and redirect to the protected route automatically.
        } catch (err) {
            setError('An unexpected error occurred.');
        }
    };

    /**
     * Show device ID info (for debugging).
     */
    const showDeviceInfo = () => {
        Alert.alert(
            'App Information',
            'NBSE Connect Mobile App',
            [{ text: 'OK' }]
        );
    };

    return (
        <View className="flex-1 bg-[#2c3e6b]">
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            {/* Dark Navy Header */}
            <View className="bg-[#2c3e6b] pb-[50px] items-center justify-center" style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40 }}>
                <View className="flex-row items-center gap-4">
                    <View className="w-[70px] h-[70px] rounded-full overflow-hidden bg-white">
                        <Image
                            source={require('../../assets/nbse-logo.png')}
                            className="w-[70px] h-[70px]"
                            resizeMode="cover"
                        />
                    </View>
                    <View className="justify-center">
                        <Text className="text-[32px] font-extrabold text-white tracking-[2px] leading-[38px]">NBSE</Text>
                        <Text className="text-[32px] font-extrabold text-white tracking-[2px] leading-[38px]">CONNECT</Text>
                    </View>
                </View>
            </View>

            {/* White Card Section */}
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-1 bg-white rounded-t-[30px] px-7 pt-9 pb-10 min-h-full">
                        <Text className="text-[28px] font-bold text-[#1a1a2e] mb-9">Login</Text>

                        {/* Email ID Field */}
                        <View className="mb-6">
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className="text-base text-[#1a1a2e] py-3 px-1"
                                        placeholder="Email ID"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        onFocus={() => setError(null)}
                                        editable={!isSubmitting}
                                    />
                                )}
                            />
                            <View className={`h-px ${errors.email ? 'bg-[#ef4444]' : 'bg-[#d1d5db]'}`} />
                            {errors.email && (
                                <Text className="text-xs text-[#ef4444] mt-1">{errors.email.message}</Text>
                            )}
                        </View>

                        {/* Password Field */}
                        <View className="mb-6">
                            <View className="flex-row items-center">
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            className="text-base text-[#1a1a2e] py-3 px-1 flex-1"
                                            placeholder="Password"
                                            placeholderTextColor="#9ca3af"
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            autoComplete="password"
                                            value={value}
                                            onChangeText={(text) => {
                                                onChange(text);
                                                setError(null);
                                            }}
                                            onBlur={onBlur}
                                            editable={!isSubmitting}
                                        />
                                    )}
                                />
                                <TouchableOpacity
                                    className="p-2"
                                    onPress={() => setShowPassword(!showPassword)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text className="text-xl opacity-50">
                                        {showPassword ? '👁' : '👁‍🗨'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View className={`h-px ${errors.password ? 'bg-[#ef4444]' : 'bg-[#d1d5db]'}`} />
                            {errors.password && (
                                <Text className="text-xs text-[#ef4444] mt-1">{errors.password.message}</Text>
                            )}
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity className="self-end mb-6 -mt-2" onPress={showDeviceInfo}>
                            <Text className="text-sm font-semibold text-[#1a1a2e]">Forgot Password?</Text>
                        </TouchableOpacity>

                        {/* Server Error Message */}
                        {error && (
                            <View className="bg-red-500/[0.08] rounded-[10px] p-3 mb-5 border border-red-500/25">
                                <Text className="text-[#dc2626] text-sm text-center">{error}</Text>
                            </View>
                        )}

                        {/* Buttons Row */}
                        <View className="flex-row gap-4 mt-2">
                            <TouchableOpacity
                                className="flex-1 border-[1.5px] border-[#2c3e6b] rounded-[10px] py-3.5 items-center justify-center min-h-[50px]"
                                onPress={() => router.push({ pathname: '/(auth)/register' as any })}
                            >
                                <Text className="text-[#2c3e6b] text-base font-semibold">Register</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 bg-[#2c3e6b] rounded-[10px] py-3.5 items-center justify-center min-h-[50px] ${isSubmitting ? 'bg-[#3a5086] opacity-70' : ''}`}
                                onPress={handleSubmit(onSubmit)}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text className="text-white text-base font-semibold">Log In</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <Toast />
        </View>
    );
}

