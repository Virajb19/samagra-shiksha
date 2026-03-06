"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFirestore, getFirebaseFunctions } from "@/lib/firebase";
import { User } from "@/types";
import { UserFilterParams } from "@/services/contracts";
import { getUsersFromFirestore } from "@/services/firebase/users.firestore";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

type CreateUserInput = {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role: string;
  gender?: string;
  coordinator_subject?: string;
  coordinator_class_group?: string;
};

async function getUserById(userId: string): Promise<User> {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, "users", userId));

  if (!snapshot.exists()) {
    throw new Error("User not found");
  }

  const data = snapshot.data();
  return {
    id: userId,
    name: (data.name as string) || "",
    email: data.email as string | undefined,
    phone: (data.phone as string) || "",
    role: (data.role as User["role"]) || "TEACHER",
    gender: data.gender as User["gender"],
    profile_image_url: data.profile_image_url as string | undefined,
    is_active: (data.is_active as boolean) ?? true,
    created_at: new Date().toISOString(),
    coordinator_subject: data.coordinator_subject as string | undefined,
    coordinator_class_group: data.coordinator_class_group as string | undefined,

    // Role-specific fields
    district_id: data.district_id as string | undefined,
    responsibilities: data.responsibilities as string[] | undefined,
    kgbv_type: data.kgbv_type as User["kgbv_type"],
    residential_location: data.residential_location as string | undefined,
    ebrc: data.ebrc as string | undefined,
    qualification: data.qualification as string | undefined,
    years_of_experience: data.years_of_experience as number | undefined,
    date_of_joining: data.date_of_joining as string | undefined,
    aadhaar_number: data.aadhaar_number as string | undefined,
    has_completed_profile: (data.has_completed_profile as boolean) ?? false,
  };
}

export const firebaseUsersAdminApi = {
  getAll: async (filters?: UserFilterParams) => {
    await waitForAuthReady();
    return getUsersFromFirestore(filters);
  },

  async createUser(data: CreateUserInput): Promise<User> {
    await waitForAuthReady();
    const functionsClient = getFirebaseFunctions();
    const createUserByAdmin = httpsCallable(functionsClient, "createUserByAdmin");

    const result = await createUserByAdmin({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: data.role,
      gender: data.gender,
      coordinator_subject: data.coordinator_subject,
      coordinator_class_group: data.coordinator_class_group,
    });

    const payload = result.data as { uid?: string; userId?: string };
    const userId = payload.uid || payload.userId;

    if (!userId) {
      throw new Error("createUserByAdmin function did not return user id");
    }

    return getUserById(userId);
  },

  async toggleStatus(userId: string, isActive: boolean): Promise<void> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    await updateDoc(doc(db, "users", userId), {
      is_active: isActive,
    });
  },

  async updateProfilePhoto(profileImageUrl: string): Promise<User> {
    await waitForAuthReady();
    const functionsClient = getFirebaseFunctions();
    const updateMyProfilePhoto = httpsCallable(functionsClient, "updateMyProfilePhoto");
    const result = await updateMyProfilePhoto({ profile_image_url: profileImageUrl });

    const payload = result.data as { userId?: string; uid?: string };
    const userId = payload.userId || payload.uid;

    if (!userId) {
      throw new Error("updateMyProfilePhoto function did not return user id");
    }

    return getUserById(userId);
  },

  async uploadProfilePhoto(_file: File, _onProgress?: (progress: number) => void): Promise<{ user: User; photoUrl: string }> {
    throw new Error("Profile upload should use Firebase Storage service directly in Phase 2");
  },

  async updateUser(userId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    role?: string;
    coordinator_subject?: string;
    coordinator_class_group?: string;
  }): Promise<User> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    await setDoc(doc(db, "users", userId), {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true });

    return getUserById(userId);
  },
};
