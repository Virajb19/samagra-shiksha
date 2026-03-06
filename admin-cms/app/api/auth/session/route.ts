/**
 * POST /api/auth/session — Create a Firebase session cookie
 * DELETE /api/auth/session — Clear the session cookie
 *
 * After the client logs in with Firebase Auth (signInWithEmailAndPassword),
 * it sends the Firebase ID token here. We verify it with firebase-admin and
 * create a long-lived session cookie that can be read server-side in layouts
 * and middleware for route protection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// Session cookie lives for 5 days (Firebase max is 14 days)
const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json(
                { error: 'Missing idToken' },
                { status: 400 }
            );
        }

        const auth = getAdminAuth();

        // Verify the ID token first (ensure it's valid and recent)
        const decodedToken = await auth.verifyIdToken(idToken);

        // Only allow tokens that were issued recently (within 5 minutes)
        // to prevent replay attacks with stolen tokens
        const issuedAt = decodedToken.iat * 1000;
        if (Date.now() - issuedAt > 5 * 60 * 1000) {
            return NextResponse.json(
                { error: 'Token too old. Please sign in again.' },
                { status: 401 }
            );
        }

        // Create a session cookie from the ID token
        const sessionCookie = await auth.createSessionCookie(idToken, {
            expiresIn: SESSION_EXPIRY_MS,
        });

        // Set the session cookie as HttpOnly (cannot be tampered with by JS)
        const response = NextResponse.json({ status: 'ok' });
        response.cookies.set('__session', sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: SESSION_EXPIRY_MS / 1000,
            sameSite: 'lax',
        });

        return response;
    } catch (error: unknown) {
        console.error('Session creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 401 }
        );
    }
}

export async function DELETE() {
    const response = NextResponse.json({ status: 'ok' });
    response.cookies.set('__session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return response;
}
