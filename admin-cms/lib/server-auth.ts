import 'server-only';

import { cookies } from 'next/headers';
import { UserRole } from '@/types';
import { isCmsRole } from './permissions';
import { getAdminAuth } from './firebase-admin';

export interface ServerAuthData {
  isAuthenticated: boolean;
  role: UserRole | null;
}

/**
 * Server-side auth check for Next.js route protection.
 *
 * Strategy:
 *   1. Read the `__session` cookie (HttpOnly Firebase session cookie)
 *   2. Verify it with firebase-admin `verifySessionCookie`
 *   3. Extract the user's role from the decoded claims
 *
 * Supported CMS roles: SUPER_ADMIN, ADMIN
 */
export async function getServerAuth(): Promise<ServerAuthData> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    return { isAuthenticated: false, role: null };
  }

  try {
    const auth = getAdminAuth();
    // In dev, skip revocation check — emulator restarts invalidate user records
    // but the session cookie itself is still structurally valid.
    const checkRevoked = process.env.NODE_ENV === 'production';
    const decoded = await auth.verifySessionCookie(sessionCookie, checkRevoked);
    // Role from custom claims or fallback to userRole cookie
    const role = (decoded.role as UserRole) || cookieStore.get('userRole')?.value as UserRole | null;

    console.log('Server Auth:', { uid: decoded.uid, role });

    if (isCmsRole(role)) {
      return { isAuthenticated: true, role };
    }
  } catch (error) {
    // Expected after emulator restarts or expired sessions — not a real error
    console.warn('[ServerAuth] Session invalid (likely emulator restart or expired):', (error as Error)?.message || error);
  }

  return { isAuthenticated: false, role: null };
}

