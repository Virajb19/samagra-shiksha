import { create } from 'zustand'
import { UserRole } from '@/types'
import { authFirestore } from '@/services/firebase/auth.firestore'
import { isCmsRole } from './permissions'
import { showInfoToast } from '@/components/ui/custom-toast'
import { getFirebaseAuth } from '@/lib/firebase'

// ========================================
// COOKIE HELPER (userRole only — for SSR route guards)
// ========================================
function setRoleCookie(role: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `userRole=${encodeURIComponent(role)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteRoleCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `userRole=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// Session expiry timer (module-scoped to avoid re-renders)
let _sessionTimerId: ReturnType<typeof setTimeout> | null = null;
const SESSION_DURATION_MS = 25 * 24 * 60 * 60 * 1000; // 25 days
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutes before expiry


// ========================================
// NAVIGATION STORE
// ========================================
interface NavigationState {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  startNavigation: () => set({ isNavigating: true }),
  stopNavigation: () => set({ isNavigating: false }),
}))

// ========================================
// SIDEBAR STORE
// ========================================
interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ isCollapsed: collapsed }),
}))

// ========================================
// AUTH STORE
// ========================================
// Token storage:
//   accessToken   → HttpOnly cookie (backend-managed, never in JS)
//   refreshToken  → HttpOnly cookie (backend-managed, never in JS)
//   userRole      → localStorage + non-HttpOnly cookie (cookie for SSR guards)
//   userName      → localStorage
//   userEmail     → localStorage
//   userProfilePic → localStorage (Appwrite URL from backend)
// ========================================
interface AuthState {
  role: UserRole | null;
  userName: string | null;
  userEmail: string | null;
  userProfilePic: string | null;
  loading: boolean;
  isHydrated: boolean;
  isAuthenticated: boolean

  hydrate: () => void;
  checkSession: () => Promise<void>;
  login: (email: string, password: string, phone?: string, subject?: string, classGroup?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfilePhoto: (photoUrl: string) => void;
  startSessionTimer: () => void;
  clearSessionTimer: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: null,
  userName: null,
  userEmail: null,
  userProfilePic: null,

  loading: true,
  isHydrated: false,
  isAuthenticated: false,

  // Read user info from localStorage on mount, then validate session with server
  hydrate: () => {
    if (typeof window === 'undefined') return;

    const role = localStorage.getItem('userRole') as UserRole | null;
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    const rawPic = localStorage.getItem('userProfilePic');
    // Guard against stale "[object Object]" or other invalid values
    const userProfilePic = (rawPic && rawPic.startsWith('http')) ? rawPic : null;
    if (!userProfilePic && rawPic) localStorage.removeItem('userProfilePic');

    set({
      role,
      userName,
      userEmail,
      userProfilePic,
      isHydrated: true,
    });

    // Only validate session if user was previously logged in (role in localStorage)
    // If no role, user never logged in — skip server call to avoid 401 → refresh failed (no refresh token) → forceLogout loop
    // NOTE: Currently not strictly required since hydrate() is only called inside protected layouts (ProtectedShell, MainLayout),
    // never on the login page. But acts as a safety net if hydrate() is ever added to a root-level provider (layout.tsx) or the login layout.
    if (role) {
      get().checkSession();
      // get().startSessionTimer();
    } else {
      set({ loading: false });
    }
  },

  // Keep security always server side 
  // Validate session by calling GET /auth/me — the only way to verify accessToken
  // Also syncs fresh user info (name, email, role, profile pic) from the server
  // so that changes made in one browser session are reflected in all others on refresh
  checkSession: async () => {
    set({ loading: true });
    try {
      const me = await authFirestore.getMe();
      const freshRole = (me.role as UserRole) || null;
      const freshName = me.name || null;
      const freshEmail = me.email || null;
      const freshPic = (typeof me.profile_image_url === 'string' && me.profile_image_url.length > 0)
        ? me.profile_image_url
        : null;

      // Sync fresh data to localStorage so other tabs / future refreshes pick it up
      if (freshRole) localStorage.setItem('userRole', freshRole);
      if (freshName) localStorage.setItem('userName', freshName);
      if (freshEmail) localStorage.setItem('userEmail', freshEmail);
      if (freshPic) localStorage.setItem('userProfilePic', freshPic);
      else localStorage.removeItem('userProfilePic');

      const { isHydrated } = get();
      const isAuth = isHydrated && isCmsRole(freshRole);

      set({
        role: freshRole,
        userName: freshName,
        userEmail: freshEmail,
        userProfilePic: freshPic,
        isAuthenticated: isAuth,
        loading: false,
      });
    } catch {
      // Keep cached profile pic on transient auth errors
      const cachedPic = typeof window !== 'undefined' ? localStorage.getItem('userProfilePic') : null;
      set({ role: null, userName: null, userEmail: null, userProfilePic: cachedPic, isAuthenticated: false, loading: false });
    } finally {
      set({ loading: false });
    }
  },

  // Login — backend sets HttpOnly cookies, we store user info in localStorage
  login: async (email, password, phone) => {
    const res = await authFirestore.login(email, password, phone ?? '');

    const userRole = res.user.role;
    const name = res.user.name || 'Administrator';
    const userEmail = res.user.email || email;
    // profile_image_url can be null/undefined/object — only store valid URL strings
    const rawPic = res.user.profile_image_url;
    const profilePic = (typeof rawPic === 'string' && rawPic.length > 0) ? rawPic : null;

    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', userEmail);
    if (profilePic) localStorage.setItem('userProfilePic', profilePic);
    else localStorage.removeItem('userProfilePic');

    setRoleCookie(userRole);

    // Create Firebase session cookie for server-side auth verification
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      }
    } catch (err) {
      console.warn('Failed to create session cookie:', err);
    }

    set({
      role: userRole,
      userName: name,
      userEmail,
      userProfilePic: profilePic,
      loading: false,
      isHydrated: true,
      isAuthenticated: true,
    });

    // Start session expiry timer (25 days)
    // localStorage.setItem('sessionExpiresAt', String(Date.now() + SESSION_DURATION_MS));
    // get().startSessionTimer();
  },

  // Logout — backend clears HttpOnly cookies, we clear localStorage + cookies client-side
  logout: async () => {
    try {
      await authFirestore.logout();
    } catch {
      // Continue cleanup even if backend call fails
    }

    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userProfilePic');
    localStorage.removeItem('sessionExpiresAt');
    deleteRoleCookie();
    get().clearSessionTimer();

    // Clear Firebase session cookie
    if (typeof window !== 'undefined') {
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => { });
    }

    set({
      role: null,
      userName: null,
      userEmail: null,
      userProfilePic: null,
      loading: false,
    });
  },

  updateProfilePhoto: (photoUrl: string) => {
    localStorage.setItem('userProfilePic', photoUrl);
    set({ userProfilePic: photoUrl });
  },

  startSessionTimer: () => {
    if (typeof window === 'undefined') return;

    // Clear any existing timer
    if (_sessionTimerId) clearTimeout(_sessionTimerId);

    const expiresAt = Number(localStorage.getItem('sessionExpiresAt'));
    if (!expiresAt) return;

    const warningMs = expiresAt - Date.now() - WARNING_BEFORE_MS;
    if (warningMs <= 0) return; // Already past the warning window

    _sessionTimerId = setTimeout(() => {
      showInfoToast(
        'Your session will expire in 5 minutes. Please save your work and re-login if needed.',
        15000,
        'top-center',
      );
    }, warningMs);
  },

  clearSessionTimer: () => {
    if (_sessionTimerId) {
      clearTimeout(_sessionTimerId);
      _sessionTimerId = null;
    }
  },
}));