/**
 * Login Screen
 * 
 * Email + Password login.
 * 
 * SECURITY:
 * - All non-admin users can login
 * - Admin users are blocked (must use admin portal)
 * - Clear error messages for all failure cases
 * 
 * Uses react-hook-form with zod validation.
 */

import { useState } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
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
import { router } from 'expo-router';
import { useAuthStore } from '../../src/lib/store';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginFormData } from '../../src/lib/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from "lucide-react-native";

const SKY_BLUE_DARK = '#0284C7';
const INPUT_TEXT_STYLE = { fontFamily: 'Lato-Regular', fontSize: 17 } as const;

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

    const loginMutation = useMutation({
        mutationFn: async (data: LoginFormData) => {
            const result = await login({
                email: data.email,
                password: data.password,
            });

            if (!result.success) {
                console.error(result.error);
                throw new Error(result.error || 'Login failed. Please check your credentials.');
            }

            return result;
        },
        onError: (err: any) => {
            setError(err?.message || 'An unexpected error occurred.');
        },
    });

    /**
     * Handle form submission.
     */
    const onSubmit = async (data: LoginFormData) => {
        setError(null);
        await loginMutation.mutateAsync(data);
        // try {
        //     const result = await login({ email: data.email, password: data.password });

        //     if (!result.success) {
        //         setError(result.error || 'Login failed. Please try again.');
        //     }
        //     // On success, the (auth)/_layout guard will detect isAuthenticated
        //     // and redirect to the protected route automatically.
        // } catch (err) {
        //     setError('An unexpected error occurred.');
        // }
    };

    /**
     * Show device ID info (for debugging).
     */
    const showDeviceInfo = () => {
        Alert.alert(
            'App Information',
            'Samagra Shiksha Mobile App',
            [{ text: 'OK' }]
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: SKY_BLUE_DARK }}>
            <StatusBar barStyle="light-content" backgroundColor={SKY_BLUE_DARK} />

            <View className="pb-[36px] items-center justify-center" style={{ paddingTop: Platform.OS === 'ios' ? 62 : 42, backgroundColor: SKY_BLUE_DARK }}>
                <Image
                    source={require('../../assets/assets_banner.png')}
                    style={{ width: 304, height: 104 }}
                    resizeMode="contain"
                />
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
                        <AppText className="text-[30px] font-bold text-[#1a1a2e] mb-9">Login</AppText>

                        {/* Email ID Field */}
                        <View className="mb-6">
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className="text-[17px] text-[#1a1a2e] py-3 px-1"
                                        style={INPUT_TEXT_STYLE}
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
                                <AppText className="text-[13px] text-[#ef4444] mt-1">{errors.email.message}</AppText>
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
                                            className="text-[17px] text-[#1a1a2e] py-3 px-1 flex-1"
                                            style={INPUT_TEXT_STYLE}
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
                                    <AppText className="text-xl opacity-50">
                                        {showPassword ? '👁' : '👁‍🗨'}
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                            <View className={`h-px ${errors.password ? 'bg-[#ef4444]' : 'bg-[#d1d5db]'}`} />
                            {errors.password && (
                                <AppText className="text-[13px] text-[#ef4444] mt-1">{errors.password.message}</AppText>
                            )}
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity className="self-end mb-6 -mt-2" onPress={showDeviceInfo}>
                            <AppText className="text-[15px] font-semibold text-[#1a1a2e]">Forgot Password?</AppText>
                        </TouchableOpacity>

                        {/* Server Error Message */}
                        {error && (
                             <View className="flex-row items-center bg-red-500/[0.08] rounded-[10px] p-3 mb-5 border border-red-500/25 gap-2">
                                <AlertCircle size={18} color="#dc2626" />
                                <AppText className="text-[#dc2626] text-[15px] text-center">{error}</AppText>
                            </View>
                        )}

                        {/* Buttons Row */}
                        <View className="flex-row gap-4 mt-2">
                            <TouchableOpacity
                                className="flex-1 border-[1.5px] border-[#0284C7] rounded-[10px] py-3.5 items-center justify-center min-h-[50px]"
                                onPress={() => router.push({ pathname: '/(auth)/register' as any })}
                            >
                                <AppText className="text-[#0284C7] text-[17px] font-semibold">Register</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 bg-[#0284C7] rounded-[10px] py-3.5 items-center justify-center min-h-[50px] ${isSubmitting ? 'opacity-70' : ''}`}
                                onPress={handleSubmit(onSubmit)}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <AppText className="text-white text-[17px] font-semibold">Log In</AppText>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
