import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { User } from '../types';
import { login as authLogin, logout as authLogout, LoginCredentials } from '../services/auth.service';
import { getUserById, getUserByEmail, mapUserDoc } from '../services/firebase/users.firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { getUserData, storeUserData, clearAuthData } from '../utils/storage';

// ── Types ────────────────────────────────────────────────────

interface LoginParams {
    email: string;
    password: string;
}

interface LoginResult {
    success: boolean;
    error?: string;
    isInactive?: boolean;
}

interface AuthState {
    /** Current authenticated user (Firestore profile) */
    user: User | null;
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Whether auth state is being loaded/checked */
    isLoading: boolean;
    /** Whether the store has been initialized (listener attached) */
    isHydrated: boolean;

    /** Initialize the auth listener — call once in root layout */
    init: () => () => void;
    /** Login with email + password */
    login: (params: LoginParams) => Promise<LoginResult>;
    /** Logout — sign out of Firebase Auth and clear local cache */
    logout: () => Promise<void>;
    /** Re-fetch user data from Firestore */
    refreshUser: () => Promise<void>;
}

// ── Store ────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isHydrated: false,

    /**
     * Subscribe to Firebase Auth state changes + real-time user doc.
     * Returns the combined unsubscribe function for cleanup.
     */
    init: () => {
        if (get().isHydrated) {
            return () => { };
        }

        const auth = getFirebaseAuth();
        const db = getFirebaseDb();
        let userDocUnsub: (() => void) | null = null;

        // Immediately hydrate from cached user data (survives app kill)
        (async () => {
            const cached = await getUserData();
            if (cached && !get().isAuthenticated) {
                console.log('[AuthStore] Hydrating from cache:', cached.name);
                set({ user: cached, isAuthenticated: true, isLoading: false });
            }
        })();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            try {
                // Clean up previous user doc listener
                if (userDocUnsub) {
                    userDocUnsub();
                    userDocUnsub = null;
                }

                if (firebaseUser) {
                    console.log('[AuthStore] Firebase user detected:', firebaseUser.uid);

                    // Show cached user instantly for fast UI
                    const cached = await getUserData();
                    if (cached) {
                        set({ user: cached, isAuthenticated: true });
                    }

                    // Fetch latest profile from Firestore
                    // Try by uid first, fallback to email (seed creates separate doc IDs)
                    let profile = await getUserById(firebaseUser.uid);
                    if (!profile && firebaseUser.email) {
                        profile = await getUserByEmail(firebaseUser.email);
                    }

                    if (profile) {
                        set({ user: profile, isAuthenticated: true });
                        await storeUserData(profile);

                        // Real-time listener on the CORRECT Firestore doc (by profile.id, not auth uid)
                        userDocUnsub = onSnapshot(
                            doc(db, 'users', profile.id),
                            async (snap) => {
                                if (snap.exists()) {
                                    const updated = mapUserDoc(snap);
                                    console.log('[AuthStore] Real-time update:', { is_active: updated.is_active, has_completed_profile: updated.has_completed_profile });
                                    set({ user: updated, isAuthenticated: true });
                                    await storeUserData(updated);
                                }
                            },
                            (error) => {
                                console.error('[AuthStore] onSnapshot error:', error);
                            }
                        );
                    } else if (cached) {
                        // No Firestore doc found but we have a cache — keep user logged in
                        console.log('[AuthStore] Using cached profile (Firestore doc not found)');
                    } else {
                        console.warn('[AuthStore] No Firestore profile found, logging out');
                        set({ user: null, isAuthenticated: false });
                    }
                } else {
                    console.log('[AuthStore] No Firebase session');
                    set({ user: null, isAuthenticated: false });
                }
            } catch (err) {
                console.error('[AuthStore] onAuthStateChanged error:', err);
                set({ user: null, isAuthenticated: false });
            } finally {
                set({ isLoading: false, isHydrated: true });
            }
        });

        set({ isHydrated: true });
        return () => {
            unsubscribe();
            if (userDocUnsub) userDocUnsub();
        };
    },

    login: async (params: LoginParams): Promise<LoginResult> => {
        try {
            const credentials: LoginCredentials = {
                email: params.email,
                password: params.password,
            };

            const result = await authLogin(credentials);

            if (result.success && result.user) {
                await storeUserData(result.user);
                set({ user: result.user, isAuthenticated: true });
                return { success: true };
            }

            return { success: false, error: result.error, isInactive: result.isInactive };
        } catch (error) {
            console.error('[AuthStore] Login error:', error);
            return { success: false, error: 'An unexpected error occurred.' };
        }
    },

    logout: async () => {
        try {
            console.log('[AuthStore] Logging out...');
            await authLogout();
            await clearAuthData();
            set({ user: null, isAuthenticated: false });
            console.log('[AuthStore] Logged out successfully');
        } catch (error) {
            console.error('[AuthStore] Logout error:', error);
        }
    },

    refreshUser: async () => {
        try {
            const auth = getFirebaseAuth();
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) return;

            const profile = await getUserById(firebaseUser.uid);
            if (profile) {
                set({ user: profile, isAuthenticated: true });
                await storeUserData(profile);
                console.log('[AuthStore] User data refreshed from Firestore');
            }
        } catch (error) {
            console.error('[AuthStore] Failed to refresh user:', error);
        }
    },
}));
