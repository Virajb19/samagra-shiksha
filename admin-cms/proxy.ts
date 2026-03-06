import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route Protection Middleware
 * 
 * Enforces:
 * 1. Authentication — requires userRole + (accessToken OR __session) cookies
 * 2. Login page protection — redirects authenticated users to dashboard
 * 3. Protected page protection — redirects unauthenticated users to login
 * 4. Role-based tab access — restricted roles can only access certain pages
 */

const CMS_ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const ROLE_TAB_ACCESS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
};

function canAccessPath(role: string, pathname: string): boolean {
  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.some(tab => pathname === tab || pathname.startsWith(`${tab}/`));
}

function getDefaultPath(role: string): string {
  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed || allowed.length === 0) return '/login';
  if (allowed.includes('*')) return '/dashboard';
  return allowed[0];
}

function isAuthenticated(request: NextRequest): { authenticated: boolean; role: string | undefined } {
  const role = request.cookies.get('userRole')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;
  const sessionCookie = request.cookies.get('__session')?.value;

  // A session is valid if we have EITHER the legacy access token OR the Firebase session cookie
  const hasSession = Boolean(accessToken || sessionCookie);
  const hasValidRole = Boolean(role && CMS_ALLOWED_ROLES.includes(role));

  return {
    authenticated: hasSession && hasValidRole,
    role,
  };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const { authenticated, role } = isAuthenticated(request);

  // ─── LOGIN PAGE PROTECTION ───
  if (pathname.startsWith('/login')) {
    if (authenticated && role) {
      console.log("Login page protected")
      return NextResponse.redirect(new URL(getDefaultPath(role), request.url));
    }
    return NextResponse.next();
  }

  // ─── PROTECTED PAGE PROTECTION ───
  // Skip root path — it has its own client-side auth redirect
  if (!authenticated && pathname !== '/') {
    console.log("Protected page protected")
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'auth');
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('userRole', '', { path: '/', maxAge: 0 });
    return response;
  }

  // ─── ROLE-BASED TAB ACCESS ───
  if (role && !canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultPath(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};

