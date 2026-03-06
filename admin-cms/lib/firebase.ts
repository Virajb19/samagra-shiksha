/**
 * Firebase Configuration for Admin CMS
 * 
 * This module initializes Firebase for web push notifications.
 * Uses Firebase Cloud Messaging (FCM) for browser notifications.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const firebasePublicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

function requiredEnv(name: keyof typeof firebasePublicEnv): string {
  const value = firebasePublicEnv[name];
  if (!value) {
    throw new Error(`Missing required Firebase env: ${name}`);
  }
  return value;
}

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: requiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requiredEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requiredEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requiredEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requiredEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let messaging: Messaging | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let firestoreEmulatorConnected = false;
let storage: FirebaseStorage | null = null;
let functionsClient: Functions | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

/**
 * Get Firebase Messaging instance (browser only)
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') {
    return null; // Server-side, no messaging
  }

  if (!messaging) {
    const app = getFirebaseApp();
    messaging = getMessaging(app);
  }
  return messaging;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Firebase] Notification permission denied');
      return null;
    }

    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      return null;
    }

    // Get FCM token
    // Note: You'll need to add your VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    console.log('[Firebase] FCM Token:', token);
    return token;
  } catch (error) {
    console.error('[Firebase] Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  return onMessage(messagingInstance, (payload: MessagePayload) => {
    console.log('[Firebase] Foreground message received:', payload);
    callback(payload);
  });
}

let authEmulatorConnected = false;

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());

    // Connect to Auth emulator in development
    if (!authEmulatorConnected && process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === 'true') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      authEmulatorConnected = true;
      console.log('[Firebase] Connected to Auth emulator at 127.0.0.1:9099');
    }
  }
  return auth;
}

/**
 * Get Firestore instance.
 * Automatically connects to the local emulator when
 * NEXT_PUBLIC_USE_FIRESTORE_EMULATOR is 'true' (dev mode).
 */
export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());

    // Connect to Firestore emulator in development
    if (!firestoreEmulatorConnected && process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === 'true') {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      firestoreEmulatorConnected = true;
      console.log('[Firebase] Connected to Firestore emulator at 127.0.0.1:8080');
    }
  }
  return firestore;
}

let storageEmulatorConnected = false;

/**
 * Get Firebase Storage instance
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());

    // Connect to Storage emulator in development
    if (!storageEmulatorConnected && process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === 'true') {
      connectStorageEmulator(storage, '127.0.0.1', 9199);
      storageEmulatorConnected = true;
      console.log('[Firebase] Connected to Storage emulator at 127.0.0.1:9199');
    }
  }
  return storage;
}

/**
 * Get Firebase Functions instance
 */
export function getFirebaseFunctions(): Functions {
  if (!functionsClient) {
    functionsClient = getFunctions(getFirebaseApp());
  }
  return functionsClient;
}

export { firebaseConfig };
