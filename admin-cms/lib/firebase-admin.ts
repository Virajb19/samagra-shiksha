/**
 * Firebase Admin SDK — Server-Side Singleton
 *
 * This module provides a server-only Firestore instance via `firebase-admin`.
 * It's used exclusively in Next.js Server Components and API routes where the
 * client-side Firebase SDK cannot be used.
 *
 * Emulator support:
 *   When `USE_FIRESTORE_EMULATOR` env var is 'true' (default in dev),
 *   the SDK connects to the local Firestore emulator at the host specified
 *   by `FIRESTORE_EMULATOR_HOST` (default: '127.0.0.1:8080').
 *
 * Usage:
 *   import { getAdminFirestore } from '@/lib/firebase-admin';
 *   const db = getAdminFirestore();
 *   const snapshot = await db.collection('users').get();
 */

import admin from 'firebase-admin';

// ────────────────────── Configuration ──────────────────────

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tracking-aa41a';
const USE_EMULATOR = process.env.USE_FIRESTORE_EMULATOR !== 'false';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// ────────────────────── Emulator Setup ──────────────────────

// The firebase-admin SDK reads FIRESTORE_EMULATOR_HOST from process.env
// to determine whether to connect to the emulator. We set it here so
// server components automatically route to the local emulator in dev.
if (USE_EMULATOR) {
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
    // Auth emulator must also be configured for createSessionCookie to work with emulator tokens
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
}

// ────────────────────── App Initialization (Singleton) ──────────────────────

if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
}

// ────────────────────── Exports ──────────────────────

/**
 * Returns the server-side Firestore instance (firebase-admin).
 * Safe to call multiple times — uses the singleton app.
 */
export function getAdminFirestore(): admin.firestore.Firestore {
    return admin.firestore();
}

/**
 * Returns the server-side Auth instance (firebase-admin).
 * Used for verifying session cookies and ID tokens server-side.
 */
export function getAdminAuth(): admin.auth.Auth {
    return admin.auth();
}

/** Re-export FieldValue for convenience in queries */
export const FieldValue = admin.firestore.FieldValue;

/** Re-export Timestamp for date handling */
export const Timestamp = admin.firestore.Timestamp;

