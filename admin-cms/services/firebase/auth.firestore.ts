"use client";

import { LoginResponse } from '@/types';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { devDelay } from '@/lib/dev-delay';
import { isCmsRole } from '@/lib/permissions';

/**
 * Wait for Firebase Auth to finish restoring the persisted session.
 * On page refresh, `auth.currentUser` is initially `null` while Firebase
 * asynchronously rehydrates the session from IndexedDB.
 * This helper resolves once `onAuthStateChanged` fires for the first time.
 */
export function waitForAuthReady(): Promise<import('firebase/auth').User | null> {
    const auth = getFirebaseAuth();
    // If currentUser is already available (e.g. after login, no refresh), resolve immediately
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// ============================
// AUTH FIRESTORE
// ============================
export const authFirestore = {
    // Admin-only login for CMS (only ADMIN/SUPER_ADMIN can login)
    login: async (email: string, password: string, phone: string): Promise<LoginResponse> => {
        await devDelay('write', 'authFirestore.login');
        const auth = getFirebaseAuth();
        const db = getFirebaseFirestore();

        // Authenticate with Firebase — wrap to provide user-friendly error
        let firebaseUser;
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            firebaseUser = credential.user;
        } catch (error: any) {
            throw new Error('Login failed! Please check your email or password');
        }

        const token = await firebaseUser.getIdToken();
        const tokenResult = await firebaseUser.getIdTokenResult();

        // Firestore user docs use auto-generated IDs, not Firebase Auth UIDs — query by email
        const userQuery = await getDocs(query(collection(db, 'users'), where('email', '==', firebaseUser.email)));
        const profileData = !userQuery.empty ? userQuery.docs[0].data() : {};

        // Check if role is allowed to access the CMS
        const userRole = (tokenResult.claims.role as string | undefined) || (profileData.role as string | undefined) || null;
        if (!isCmsRole(userRole as any)) {
            await signOut(auth);
            throw new Error('Access denied. Only administrators can access this portal.');
        }

        // Verify phone number matches the profile (if phone was provided)
        if (phone && phone.trim()) {
            const profilePhone = (profileData.phone as string | undefined) || '';
            // Normalize: strip spaces, dashes, and leading +91/0
            const normalize = (p: string) => p.replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)/, '');
            if (profilePhone && normalize(phone) !== normalize(profilePhone)) {
                // Sign out since credentials were valid but phone doesn't match
                await signOut(auth);
                throw new Error('Phone number does not match the provided email');
            }
        }

        const loginUser: LoginResponse['user'] = {
            id: firebaseUser.uid,
            name: (profileData.name as string | undefined) || firebaseUser.displayName || 'Administrator',
            email: firebaseUser.email || email,
            phone: (profileData.phone as string | undefined) || phone || '',
            role: ((tokenResult.claims.role as string | undefined) || (profileData.role as string | undefined) || 'ADMIN') as LoginResponse['user']['role'],
            gender: (profileData.gender as LoginResponse['user']['gender']) || undefined,
            profile_image_url: (profileData.profile_image_url as string | undefined) || firebaseUser.photoURL || undefined,
            is_active: (profileData.is_active as boolean | undefined) ?? true,
        };

        return {
            access_token: token,
            user: loginUser,
        };
    },
    // Logout - signs out from Firebase Auth
    logout: async (): Promise<void> => {
        await devDelay('write', 'authFirestore.logout');
        const auth = getFirebaseAuth();
        await signOut(auth);
    },
    // Get current user profile — validates session by checking Firebase Auth state
    getMe: async (): Promise<{
        id: string;
        name: string;
        email: string;
        phone: string;
        role: string;
        gender: string;
        profile_image_url: string | null;
        is_active: boolean;
    }> => {
        await devDelay('read', 'authFirestore.getMe');
        const auth = getFirebaseAuth();
        const db = getFirebaseFirestore();

        // On page refresh, auth.currentUser is null while Firebase rehydrates the
        // persisted session from IndexedDB. Wait for that to finish first.
        const currentUser = auth.currentUser ?? await waitForAuthReady();

        if (!currentUser) {
            throw new Error('Not authenticated');
        }

        const tokenResult = await currentUser.getIdTokenResult();
        // Firestore user docs use auto-generated IDs, not Firebase Auth UIDs — query by email
        const userQuery = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
        const profileData = !userQuery.empty ? userQuery.docs[0].data() : {};

        return {
            id: currentUser.uid,
            name: (profileData.name as string | undefined) || currentUser.displayName || 'Administrator',
            email: currentUser.email || '',
            phone: (profileData.phone as string | undefined) || '',
            role: (tokenResult.claims.role as string | undefined) || (profileData.role as string | undefined) || 'USER',
            gender: (profileData.gender as string | undefined) || '',
            profile_image_url: (profileData.profile_image_url as string | undefined) || currentUser.photoURL,
            is_active: (profileData.is_active as boolean | undefined) ?? true,
        };
    },
}
