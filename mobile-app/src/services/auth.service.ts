/**
 * Auth Service — Firebase Authentication
 *
 * Replaces the old backend-based auth with Firebase Auth:
 *   - login   -> signInWithEmailAndPassword + read Firestore user doc
 *   - register -> createUserWithEmailAndPassword + create Firestore user doc
 *   - logout  -> signOut
 *
 * The Firestore `users` collection is the single source of truth for user
 * metadata (role, phone, gender, profile fields, etc.).
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "../lib/firebase";
import { User } from "../types";
import { getUserByEmail } from "./firebase/users.firestore";
import { uploadProfileImage } from "./storage.service";
import { createAuditLog } from "./firebase/audit-logs.firestore";

// -- Error classes --

/** Thrown when an admin tries to log in via the mobile app. */
export class RoleNotAllowedError extends Error {
  constructor(role: string) {
    super(
      "Admin users cannot access the mobile app. Please use the admin portal.",
    );
    this.name = "RoleNotAllowedError";
  }
}

/** Thrown when the user's account isn't activated yet. */
export class UserNotApprovedError extends Error {
  constructor() {
    super(
      "Your account is pending admin approval. Please wait for activation.",
    );
    this.name = "UserNotApprovedError";
  }
}

export class DuplicateFieldError extends Error {
  field: "email" | "phone";

  constructor(field: "email" | "phone", message?: string) {
    super(
      message ||
        (field === "email"
          ? "This email is already registered"
          : "This phone number is already registered"),
    );
    this.name = "DuplicateFieldError";
    this.field = field;
  }
}

// -- Types --

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  isInactive?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  gender: string;
  profile_image_uri?: string;
}

// -- Login --

/**
 * Log in with email + password via Firebase Auth, then fetch the
 * full user profile from Firestore.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  try {
    const auth = getFirebaseAuth();
    console.log("[Auth] Attempting Firebase login...");

    // 1. Firebase Auth sign-in
    const cred = await signInWithEmailAndPassword(
      auth,
      credentials.email.trim(),
      credentials.password,
    );
    const firebaseToken = await cred.user.getIdToken();

    // 2. Fetch Firestore user doc
    const user = await getUserByEmail(credentials.email.trim());
    if (!user) {
      return { success: false, error: "User account not found in database." };
    }

    // 3. Block admin roles from mobile app
    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      console.log(`[Auth] Admin role denied: ${user.role}`);
      await signOut(auth);
      throw new RoleNotAllowedError(user.role);
    }

    console.log("[Auth] Login successful");

    await createAuditLog({
      user_id: user.id,
      action: "USER_LOGIN",
      entity_type: "User",
      entity_id: user.id,
    });

    return { success: true, user, token: firebaseToken };
  } catch (error: any) {
    console.log("[Auth] Login failed:", error?.code || error?.message);

    if (error instanceof RoleNotAllowedError) {
      return { success: false, error: error.message };
    }

    // Map Firebase Auth error codes to user-friendly messages
    const code = error?.code ?? "";
    if (
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential"
    ) {
      return { success: false, error: "Incorrect  email or password." };
    }
    if (code === "auth/too-many-requests") {
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
      };
    }
    if (code === "auth/configuration-not-found") {
      return {
        success: false,
        error:
          "Firebase Auth configuration not found. If using local emulators, verify EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true and that the Auth emulator is running on port 9099.",
      };
    }
    if (code === "auth/user-disabled") {
      return {
        success: false,
        error: "This account has been disabled.",
        isInactive: true,
      };
    }

    return {
      success: false,
      error: error?.message || "An unexpected error occurred.",
    };
  }
}

// -- Register --

/**
 * Create a new user with Firebase Auth + a matching Firestore user doc.
 * New accounts default to is_active = false (pending admin approval).
 */
export async function register(payload: RegisterPayload): Promise<void> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  const email = payload.email.trim().toLowerCase();
  const phone = payload.phone.trim();

  // 1. Create Firebase Auth account (handles email uniqueness natively)
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(
      auth,
      email,
      payload.password,
    );
  } catch (error: any) {
    if (error?.code === "auth/email-already-in-use") {
      throw new DuplicateFieldError("email", "This email is already registered");
    }
    throw error;
  }

  await updateProfile(cred.user, { displayName: payload.name });

  const userId = cred.user.uid;

  // 2. Create Firestore user document IMMEDIATELY so that the
  //    onAuthStateChanged listener finds the profile right away.
  await setDoc(doc(db, "users", userId), {
    id: userId,
    name: payload.name,
    email,
    password: payload.password, // stored to match seed pattern; auth uses Firebase Auth
    phone,
    role: payload.role,
    gender: payload.gender,
    profile_image_url: null,
    is_active: false, // pending admin approval
    has_completed_profile: false,
    created_at: Timestamp.now(),
  });

  // 3. Upload profile image (required) and update the doc
  if (payload.profile_image_uri) {
    console.log("[Auth] Uploading profile image for", userId);
    const uploadResult = await uploadProfileImage(
      payload.profile_image_uri,
      userId,
    );
    if (uploadResult.success && uploadResult.fileUrl) {
      await updateDoc(doc(db, "users", userId), {
        profile_image_url: uploadResult.fileUrl,
      });
    } else {
      throw new Error(uploadResult.error || "Profile image upload failed");
    }
  }

  // 4. Audit log
  try {
    await createAuditLog({
      user_id: userId,
      action: "USER_REGISTERED",
      entity_type: "User",
      entity_id: userId,
    });
  } catch (auditErr) {
    console.warn("[Auth] Audit log failed (non-critical):", auditErr);
  }

  // User stays authenticated 
}

// -- Logout --

/** Sign the user out of Firebase Auth. */
export async function logout(): Promise<void> {
  const auth = getFirebaseAuth();
  const userId = auth.currentUser?.uid ?? null;
  try {
    await createAuditLog({
      user_id: userId,
      action: "USER_LOGOUT",
      entity_type: "User",
      entity_id: userId,
    });
    await signOut(auth);
    console.log("[Auth] Firebase signOut complete");
  } catch (err) {
    console.error("[Auth] signOut error:", err);
  }
}
