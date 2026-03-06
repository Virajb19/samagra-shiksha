/**
 * 
 * Registration Screen
 * 
 * Multi-field registration form with:
 * - Profile image upload
 * - Gender selection (tabs)
 * - Full name, email, password
 * - Role dropdown
 * - Phone number
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
    ScrollView,
    Image,
    Alert,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    RegisterSchema,
    RegisterFormData,
    RegistrationRole,
    Gender,
} from '../../src/lib/zod';
import { register } from '../../src/services/auth.service';
import { X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { on } from 'events';

/** Dark navy color used in header and primary buttons */
const NAVY = '#2c3e6b';
const NAVY_LIGHT = '#3a5086';

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS: { label: string; value: RegistrationRole }[] = [
    { label: 'Teacher', value: 'TEACHER' },
    { label: 'Headmaster', value: 'HEADMASTER' },
    { label: 'IE Resource Person', value: 'IE_RESOURCE_PERSON' },
    { label: 'KGBV Warden', value: 'KGBV_WARDEN' },
    { label: 'NSCBAV Warden', value: 'NSCBAV_WARDEN' },
    { label: 'Junior Engineer', value: 'JUNIOR_ENGINEER' },
];

/**
 * Gender options for tabs
 */
const GENDER_OPTIONS: { label: string; value: Gender; icon: string }[] = [
    { label: 'Male', value: 'MALE', icon: '♂' },
    { label: 'Female', value: 'FEMALE', icon: '♀' },
];

export default function RegisterScreen() {
    // const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            profileImage: '',
            gender: 'MALE',
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'TEACHER',
            phone: '',
        },
    });

    const onFormError = (errors: any) => {
        console.log('[Register] Validation errors:', errors);
        const firstError = Object.values(errors)?.[0]?.message || 'Please fill out all required fields correctly.';
        Toast.show({
            type: 'error',
            text1: 'Registration Error',
            text2: firstError,
            position: 'bottom',
            bottomOffset: 60
        });
    };

    const selectedGender = watch('gender');
    const selectedRole = watch('role');
    const profileImage = watch('profileImage');

    /**
     * Pick image from gallery
     */
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please grant access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setValue('profileImage', result.assets[0].uri);
        }
    };

    /**
     * Handle form submission
     */
    const onSubmit = async (data: RegisterFormData) => {

        try {
            // Prepare registration payload — image URI is passed to register()
            // which uploads it AFTER creating the Firebase Auth account
            // (so storage security rules pass).
            const payload = {
                name: data.fullName,
                email: data.email,
                password: data.password,
                phone: data.phone,
                role: data.role,
                gender: data.gender,
                profile_image_uri: data.profileImage || undefined,
            };

            console.log('[Register] Submitting registration...');

            // Call registration service
            await register(payload);

            Alert.alert(
                'Registration Submitted',
                'Your registration has been submitted successfully. Please wait for admin approval.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
            );
        } catch (error: any) {
            console.log('[Register] Error:', error);

            // Extract error message
            let errorMessage = 'Failed to submit registration. Please try again.';

            if (error?.response?.data?.message) {
                const msg = error.response.data.message;
                errorMessage = Array.isArray(msg) ? msg[0] : msg;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            Alert.alert('Registration Failed', errorMessage);
        } finally {
            // setIsSubmitting(false);
        }
    };

    /**
     * Get role label for display
     */
    const getRoleLabel = (value: RegistrationRole): string => {
        return ROLE_OPTIONS.find((opt) => opt.value === value)?.label || value;
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
                    <View className="flex-1 bg-white rounded-t-[30px] px-7 pt-8 pb-10">
                        {/* Title */}
                        <Text className="text-[28px] font-bold text-[#1a1a2e] mb-2">Create Account</Text>
                        <Text className="text-sm text-gray-500 leading-5 mb-6">
                            Make sure you have access to the entered Email ID / Phone Number.
                        </Text>

                        {/* Profile Image */}
                        <View className="items-center mb-7 relative">
                            <TouchableOpacity
                                className={`w-[120px] h-[120px] rounded-full overflow-hidden border-2 ${errors.profileImage ? 'border-[#ef4444]' : 'border-[#e5e7eb]'}`}
                                onPress={pickImage}
                            >
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} className="w-full h-full" />
                                ) : (
                                    <View className="flex-1 bg-[#f9fafb] justify-center items-center">
                                        <Text className="text-[28px] mb-0.5 opacity-40">📷</Text>
                                        <Text className="text-xs text-gray-400 font-medium">IMG</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {profileImage && (
                                <TouchableOpacity
                                    className="absolute top-0 right-[33%] w-6 h-6 rounded-full bg-[#ef4444] items-center justify-center"
                                    onPress={() => setValue('profileImage', '')}
                                >
                                    <X size={14} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {errors.profileImage && (
                                <Text className="text-xs text-[#ef4444] mt-2">{errors.profileImage.message}</Text>
                            )}
                        </View>

                        {/* Gender Selection */}
                        <View className="flex-row gap-3 mb-7">
                            {GENDER_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    className={`flex-1 flex-row items-center justify-center py-3 rounded-[25px] gap-1.5 ${selectedGender === option.value ? 'bg-[#2c3e6b]' : 'bg-[#f3f4f6] border border-[#e5e7eb]'}`}
                                    onPress={() => setValue('gender', option.value)}
                                >
                                    <Text
                                        className={`text-base ${selectedGender === option.value ? 'text-white' : 'text-[#374151]'}`}
                                    >
                                        {option.icon}
                                    </Text>
                                    <Text
                                        className={`text-[15px] font-semibold ${selectedGender === option.value ? 'text-white' : 'text-[#374151]'}`}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Full Name */}
                        <View className="mb-[22px]">
                            <Controller
                                control={control}
                                name="fullName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className="text-base text-[#1a1a2e] py-3 px-1"
                                        placeholder="Full Name"
                                        placeholderTextColor="#9ca3af"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        autoCapitalize="words"
                                        editable={!isSubmitting}
                                    />
                                )}
                            />
                            <View className={`h-px bg-[#d1d5db] ${errors.fullName ? 'bg-[#ef4444]' : ''}`} />
                            {errors.fullName && (
                                <Text className="text-[#ef4444] text-xs mt-1">{errors.fullName.message}</Text>
                            )}
                        </View>

                        {/* Email */}
                        <View className="mb-[22px]">
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className="text-base text-[#1a1a2e] py-3 px-1"
                                        placeholder="Email ID"
                                        placeholderTextColor="#9ca3af"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        editable={!isSubmitting}
                                    />
                                )}
                            />
                            <View className={`h-px bg-[#d1d5db] ${errors.email ? 'bg-[#ef4444]' : ''}`} />
                            {errors.email && (
                                <Text className="text-[#ef4444] text-xs mt-1">{errors.email.message}</Text>
                            )}
                        </View>

                        {/* Password */}
                        <View className="mb-[22px]">
                            <View className="flex-row items-center">
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            className="text-base text-[#1a1a2e] py-3 px-1 flex-1"
                                            placeholder="Password"
                                            placeholderTextColor="#9ca3af"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
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
                            <View className={`h-px bg-[#d1d5db] ${errors.password ? 'bg-[#ef4444]' : ''}`} />
                            {errors.password && (
                                <Text className="text-[#ef4444] text-xs mt-1">{errors.password.message}</Text>
                            )}
                        </View>

                        {/* Confirm Password */}
                        <View className="mb-[22px]">
                            <View className="flex-row items-center">
                                <Controller
                                    control={control}
                                    name="confirmPassword"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            className="text-base text-[#1a1a2e] py-3 px-1 flex-1"
                                            placeholder="Confirm Password"
                                            placeholderTextColor="#9ca3af"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            secureTextEntry={!showConfirmPassword}
                                            autoCapitalize="none"
                                            editable={!isSubmitting}
                                        />
                                    )}
                                />
                                <TouchableOpacity
                                    className="p-2"
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text className="text-xl opacity-50">
                                        {showConfirmPassword ? '👁' : '👁‍🗨'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View className={`h-px bg-[#d1d5db] ${errors.confirmPassword ? 'bg-[#ef4444]' : ''}`} />
                            {errors.confirmPassword && (
                                <Text className="text-[#ef4444] text-xs mt-1">{errors.confirmPassword.message}</Text>
                            )}
                        </View>

                        {/* Role Dropdown */}
                        <View className="mb-[22px]">
                            <TouchableOpacity
                                className="flex-row justify-between items-center py-3 px-1"
                                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                                disabled={isSubmitting}
                            >
                                <Text className="text-base text-[#1a1a2e] font-medium">{getRoleLabel(selectedRole)}</Text>
                                <Text className="text-xs text-gray-500">{showRoleDropdown ? '▲' : '▼'}</Text>
                            </TouchableOpacity>
                            <View className={`h-px bg-[#d1d5db] ${errors.role ? 'bg-[#ef4444]' : ''}`} />

                            {showRoleDropdown && (
                                <View className="bg-white rounded-xl mt-1 border border-[#e5e7eb] overflow-hidden" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                                    {ROLE_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            className={`px-4 py-3.5 border-b border-[#f3f4f6] ${selectedRole === option.value ? 'bg-[#2c3e6b]/[0.06]' : ''}`}
                                            onPress={() => {
                                                setValue('role', option.value);
                                                setShowRoleDropdown(false);
                                            }}
                                        >
                                            <Text
                                                className={`text-base ${selectedRole === option.value ? 'text-[#2c3e6b] font-semibold' : 'text-gray-500'}`}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {errors.role && (
                                <Text className="text-[#ef4444] text-xs mt-1">{errors.role.message}</Text>
                            )}
                        </View>

                        {/* Phone Number */}
                        <View className="mb-[22px]">
                            <View className="flex-row items-center">
                                <Text className="text-base text-[#2c3e6b] font-medium py-3">+91</Text>
                                <Text className="text-base text-[#d1d5db] mx-2.5">|</Text>
                                <Controller
                                    control={control}
                                    name="phone"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            className="text-base text-[#1a1a2e] py-3 px-1 flex-1"
                                            placeholder="Phone Number"
                                            placeholderTextColor="#9ca3af"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            keyboardType="phone-pad"
                                            autoComplete="tel"
                                            editable={!isSubmitting}
                                        />
                                    )}
                                />
                            </View>
                            <View className={`h-px bg-[#d1d5db] ${errors.phone ? 'bg-[#ef4444]' : ''}`} />
                            {errors.phone && (
                                <Text className="text-[#ef4444] text-xs mt-1">{errors.phone.message}</Text>
                            )}
                        </View>

                        {/* Terms & Privacy */}
                        <Text className="text-[13px] text-gray-500 text-center leading-[18px] mb-5">
                            By registering, you agree to the{' '}
                            <Text className="text-[#2c3e6b] font-semibold">Terms & Privacy Policy</Text>
                            {' '}of NBSE, Government of Nagaland
                        </Text>

                        {/* Register Button */}
                        <TouchableOpacity
                            className={`bg-[#2c3e6b] rounded-[10px] py-4 items-center justify-center min-h-[54px] ${isSubmitting ? 'bg-[#3a5086] opacity-70' : ''}`}
                            onPress={handleSubmit(onSubmit, onFormError)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="text-white text-lg font-bold">Register</Text>
                            )}
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View className="flex-row justify-center items-center mt-5 gap-1.5">
                            <Text className="text-gray-500 text-sm">Already have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text className="text-[#2c3e6b] text-sm font-semibold">Login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

