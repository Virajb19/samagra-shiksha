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

import { useState } from "react";
import { AppText } from "@/components/AppText";
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  RegisterSchema,
  RegisterFormData,
  RegistrationRole,
  Gender,
} from "../../src/lib/zod";
import { register, DuplicateFieldError } from "../../src/services/auth.service";
import { X } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";

const SKY_BLUE_DARK = "#0284C7";
const INPUT_TEXT_STYLE = { fontFamily: "Lato-Regular", fontSize: 17 } as const;

/**
 * Role options for dropdown
 */
const ROLE_OPTIONS: { label: string; value: RegistrationRole }[] = [
  { label: "Teacher", value: "TEACHER" },
  { label: "Headmaster", value: "HEADMASTER" },
  { label: "IE Resource Person", value: "IE_RESOURCE_PERSON" },
  { label: "KGBV Warden", value: "KGBV_WARDEN" },
  { label: "NSCBAV Warden", value: "NSCBAV_WARDEN" },
  { label: "Junior Engineer", value: "JUNIOR_ENGINEER" },
];

/**
 * Gender options for tabs
 */
const GENDER_OPTIONS: {
  label: string;
  value: Gender;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
    { label: "Male", value: "MALE", icon: "male" },
    { label: "Female", value: "FEMALE", icon: "female" },
  ];

const HOME_ROUTE_BY_ROLE: Record<RegistrationRole, string> = {
  TEACHER: "/(protected)/teacher/(tabs)/home",
  HEADMASTER: "/(protected)/headmaster/(tabs)/home",
  IE_RESOURCE_PERSON: "/(protected)/ie-resource-person/(tabs)/home",
  KGBV_WARDEN: "/(protected)/kgbv-warden/(tabs)/home",
  NSCBAV_WARDEN: "/(protected)/nscbav-warden/(tabs)/home",
  JUNIOR_ENGINEER: "/(protected)/junior-engineer/(tabs)/home",
};

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  // const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      profileImage: "",
      gender: "MALE",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "TEACHER",
      phone: "",
    },
  });

  const onFormError = (errors: any) => {
    console.log("[Register] Validation errors:", errors);
    const firstError =
      (Object.values(errors)?.[0] as { message?: string } | undefined)
        ?.message || "Please fill out all required fields correctly.";
    Toast.show({
      type: "error",
      text1: "Registration Error",
      text2: firstError,
    });
  };

  const selectedGender = watch("gender");
  const selectedRole = watch("role");
  const profileImage = watch("profileImage");
  const registerMutation = useMutation({
    mutationFn: register,
  });

  /**
   * Pick image from gallery
   */
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please grant access to your photo library.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setValue("profileImage", result.assets[0].uri, { shouldValidate: true });
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: RegisterFormData) => {
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

    console.log("[Register] Submitting registration...");

    // Handled via mutateAsync onSuccess/onError.
    // Wrapped in try-catch because mutateAsync re-throws after onError runs.
    try {
      await registerMutation.mutateAsync(payload, {
        onSuccess: () => {
          // User is already authenticated from createUserWithEmailAndPassword
          // and onAuthStateChanged has picked up the profile. Just navigate.
          router.push(
            HOME_ROUTE_BY_ROLE[data.role as RegistrationRole] as any,
          );
        },
        onError: (error: any) => {
          console.log("[Register] Error:", error);

          // Field-level duplicate checks from auth service
          if (error instanceof DuplicateFieldError) {
            const field = error.field as FieldPath<RegisterFormData>;
            const errorMessage = error.message;

            setError(field, {
              type: "manual",
              message: errorMessage,
            });

            Toast.show({
              type: "error",
              text1: "Registration Failed",
              text2: errorMessage,
            });
            return;
          }

          // Extract error message
          let errorMessage = "Failed to submit registration. Please try again.";

          if (error?.response?.data?.message) {
            const msg = error.response.data.message;
            errorMessage = Array.isArray(msg) ? msg[0] : msg;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          Toast.show({
            type: "error",
            text1: "Registration Failed",
            text2: errorMessage,
          });
        },
      });
    } catch {
      // Error already handled by onError callback above
    }
  };

  /**
   * Get role label for display
   */
  const getRoleLabel = (value: RegistrationRole): string => {
    return ROLE_OPTIONS.find((opt) => opt.value === value)?.label || value;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: SKY_BLUE_DARK }}>
      <StatusBar barStyle="light-content" backgroundColor={SKY_BLUE_DARK} />

      <View
        className="pb-[36px] items-center justify-center"
        style={{
          paddingTop: Platform.OS === "ios" ? 62 : 42,
          backgroundColor: SKY_BLUE_DARK,
        }}
      >
        <Image
          source={require("../../assets/assets_banner.png")}
          style={{ width: 304, height: 104 }}
          resizeMode="contain"
        />
      </View>

      {/* White Card Section */}
      <KeyboardAvoidingView
        className="flex-1 bg-white rounded-t-[30px] overflow-hidden"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="flex-1 px-7 pt-8"
            style={{ paddingBottom: Math.max(insets.bottom + 12, 20) }}
          >
            {/* Title */}
            <AppText className="text-[30px] font-bold text-[#1a1a2e] mb-2">
              Create Account
            </AppText>
            <AppText className="text-[15px] text-gray-500 leading-[22px] mb-6">
              Make sure you have access to the entered Email ID / Phone Number.
            </AppText>

            {/* Profile Image */}
            <View className="items-center mb-7 relative">
              <TouchableOpacity
                className={`w-[120px] h-[120px] rounded-full overflow-hidden border-2 ${errors.profileImage ? "border-[#ef4444]" : "border-[#e5e7eb]"}`}
                onPress={pickImage}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    className="w-full h-full"
                  />
                ) : (
                  <View className="flex-1 bg-[#f9fafb] justify-center items-center">
                    <AppText className="text-[28px] mb-0.5 opacity-40">
                      📷
                    </AppText>
                    <AppText className="text-[13px] text-gray-400 font-medium">
                      IMG
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>

              {profileImage && (
                <TouchableOpacity
                  className="absolute top-0 right-[33%] w-6 h-6 rounded-full bg-[#ef4444] items-center justify-center"
                  onPress={() => setValue("profileImage", "")}
                >
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              )}
              {errors.profileImage && (
                <AppText className="text-[13px] text-[#ef4444] mt-2">
                  {errors.profileImage.message}
                </AppText>
              )}
            </View>

            {/* Gender Selection */}
            <View className="flex-row gap-3 mb-7">
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-1 flex-row items-center justify-center px-3 py-2 rounded-xl gap-1.5 ${selectedGender === option.value ? "bg-[#0284C7]" : "bg-[#f3f4f6] border border-[#e5e7eb]"}`}
                  onPress={() => setValue("gender", option.value)}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={25}
                    color={
                      selectedGender === option.value ? "#ffffff" : "#374151"
                    }
                  />
                  <AppText
                    className={`text-[17px] font-semibold ${selectedGender === option.value ? "text-white" : "text-[#374151]"}`}
                  >
                    {option.label}
                  </AppText>
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
                    className="text-[17px] text-[#1a1a2e] py-3 px-1"
                    style={INPUT_TEXT_STYLE}
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
              <View
                className={`h-px bg-[#d1d5db] ${errors.fullName ? "bg-[#ef4444]" : ""}`}
              />
              {errors.fullName && (
                <AppText className="text-[#ef4444] text-[13px] mt-1">
                  {errors.fullName.message}
                </AppText>
              )}
            </View>

            {/* Email */}
            <View className="mb-[22px]">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="text-[17px] text-[#1a1a2e] py-3 px-1"
                    style={INPUT_TEXT_STYLE}
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
              <View
                className={`h-px bg-[#d1d5db] ${errors.email ? "bg-[#ef4444]" : ""}`}
              />
              {errors.email && (
                <AppText className="text-[#ef4444] text-[13px] mt-1">
                  {errors.email.message}
                </AppText>
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
                      className="text-[17px] text-[#1a1a2e] py-3 px-1 flex-1"
                      style={INPUT_TEXT_STYLE}
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
                  <AppText className="text-xl opacity-50">
                    {showPassword ? "👁" : "👁‍🗨"}
                  </AppText>
                </TouchableOpacity>
              </View>
              <View
                className={`h-px bg-[#d1d5db] ${errors.password ? "bg-[#ef4444]" : ""}`}
              />
              {errors.password && (
                <AppText className="text-[#ef4444] text-[13px] mt-1">
                  {errors.password.message}
                </AppText>
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
                      className="text-[17px] text-[#1a1a2e] py-3 px-1 flex-1"
                      style={INPUT_TEXT_STYLE}
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
                  <AppText className="text-xl opacity-50">
                    {showConfirmPassword ? "👁" : "👁‍🗨"}
                  </AppText>
                </TouchableOpacity>
              </View>
              <View
                className={`h-px bg-[#d1d5db] ${errors.confirmPassword ? "bg-[#ef4444]" : ""}`}
              />
              {errors.confirmPassword && (
                <AppText className="text-[#ef4444] text-[13px] mt-1">
                  {errors.confirmPassword.message}
                </AppText>
              )}
            </View>

            {/* Role Dropdown */}
            <View className="mb-[22px]">
              <TouchableOpacity
                className="flex-row justify-between items-center py-3 px-1"
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                disabled={isSubmitting}
              >
                <AppText className="text-[17px] text-[#1a1a2e] font-medium">
                  {getRoleLabel(selectedRole)}
                </AppText>
                <AppText className="text-sm text-gray-500">
                  {showRoleDropdown ? "▲" : "▼"}
                </AppText>
              </TouchableOpacity>
              <View
                className={`h-px bg-[#d1d5db] ${errors.role ? "bg-[#ef4444]" : ""}`}
              />

              {showRoleDropdown && (
                <View
                  className="bg-white rounded-xl mt-1 border border-[#e5e7eb] overflow-hidden"
                  style={{
                    elevation: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      className={`px-4 py-3.5 border-b border-[#f3f4f6] ${selectedRole === option.value ? "bg-[#0284C7]/[0.08]" : ""}`}
                      onPress={() => {
                        setValue("role", option.value);
                        setShowRoleDropdown(false);
                      }}
                    >
                      <AppText
                        className={`text-[17px] ${selectedRole === option.value ? "text-[#0284C7] font-semibold" : "text-gray-500"}`}
                      >
                        {option.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.role && (
                <AppText className="text-[#ef4444] text-[13px] mt-1">
                  {errors.role.message}
                </AppText>
              )}
            </View>

            {/* Phone Number */}
            <View className="mb-[22px]">
              <View className="flex-row items-center">
                <AppText className="text-[17px] text-[#0284C7] font-medium py-3">
                  +91
                </AppText>
                <AppText className="text-[17px] text-[#d1d5db] mx-2.5">
                  |
                </AppText>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="text-[17px] text-[#1a1a2e] py-3 px-1 flex-1"
                      style={INPUT_TEXT_STYLE}
                      placeholder="Phone Number"
                      placeholderTextColor="#9ca3af"
                      value={value}
                      onChangeText={(text) =>
                        onChange(text.replace(/[^0-9]/g, "").slice(0, 10))
                      }
                      onBlur={onBlur}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      editable={!isSubmitting}
                      maxLength={10}
                    />
                  )}
                />
              </View>
              <View
                className={`h-px bg-[#d1d5db] ${errors.phone ? "bg-[#ef4444]" : ""}`}
              />
              {errors.phone && (
                <AppText className="text-[#ef4444] text-[13px] mt-1">
                  {errors.phone.message}
                </AppText>
              )}
            </View>

            {/* Terms & Privacy */}
            <AppText className="text-[14px] text-gray-500 text-center leading-[20px] mb-5">
              By registering, you agree to the{" "}
              <AppText className="text-[#0284C7] font-semibold">
                Terms & Privacy Policy
              </AppText>{" "}
              of Samagra Shiksha, Nagaland
            </AppText>

            {/* Register Button */}
            <TouchableOpacity
              className={`bg-[#0284C7] rounded-[10px] py-4 items-center justify-center min-h-[54px] ${isSubmitting ? "opacity-70" : ""}`}
              onPress={handleSubmit(onSubmit, onFormError)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <AppText className="text-white text-[18px] font-bold">
                  Register
                </AppText>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center items-center mt-7 gap-1.5">
              <AppText className="text-gray-500 text-[15px]">
                Already have an account?
              </AppText>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <AppText className="text-[#0284C7] text-[15px] font-semibold">
                  Login
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
