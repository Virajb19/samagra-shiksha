/**
 * Firebase Configuration & Initialization — Mobile App (Expo)
 *
 * Single entry-point for all Firebase services used by the mobile app:
 *   • Firebase Auth   — email/password authentication
 *   • Cloud Firestore — reads & writes for all app data
 *   • Firebase Storage — profile image & event image uploads
 *
 * Exports singleton instances so every module shares the same connection.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, connectAuthEmulator } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── Firebase project config (from .env) ──
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// ── Emulator config ──
// Set to true to connect to local Firebase emulators (must match firebase.json ports)
// IMPORTANT: keep this opt-in. In Expo dev on a physical device, always-on emulator mode
// often causes "Could not reach Cloud Firestore backend" when your machine is not reachable.
//
// Supports both:
// - EXPO_PUBLIC_USE_FIREBASE_EMULATOR (preferred)
// - EXPO_PUBLIC_USE_FIRESTORE_EMULATOR (legacy compatibility)
const USE_EMULATOR =
  __DEV__ &&
  (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
    process.env.EXPO_PUBLIC_USE_FIRESTORE_EMULATOR === 'true');

/**
 * Resolve the emulator host IP.
 * Expo's hostUri gives the dev machine's LAN IP (e.g. "192.168.1.5:8081").
 * Falls back to localhost for web and 10.0.2.2 for Android emulator.
 */
function getEmulatorHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri.split(':')[0];
  return '10.0.2.2';
}

// ── Singleton instances ──
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let storageEmulatorConnected = false;

/**
 * Returns (or creates) the singleton Firebase App.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized Firebase app');
    console.log(`[Firebase] Emulator mode: ${USE_EMULATOR ? 'ON' : 'OFF'}`);
  } else {
    app = getApps()[0];
  }
  return app;
}

/**
 * Returns the singleton Firebase Auth instance.
 * Uses AsyncStorage for token persistence on React Native.
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    try {
      const reactNativePersistence = (FirebaseAuth as unknown as {
        getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
      }).getReactNativePersistence;

      auth = initializeAuth(firebaseApp, {
        persistence: reactNativePersistence?.(AsyncStorage) as never,
      });
    } catch {
      auth = getAuth(firebaseApp);
    }

    if (USE_EMULATOR && !authEmulatorConnected) {
      connectAuthEmulator(auth, `http://${getEmulatorHost()}:9099`, { disableWarnings: true });
      authEmulatorConnected = true;
      console.log(`[Firebase] Connected to Auth emulator at ${getEmulatorHost()}:9099`);
    }
  }
  return auth;
}

/**
 * Returns the singleton Cloud Firestore instance.
 */
export function getFirebaseDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();

    // Expo/React Native networking can be flaky with WebChannel. Auto long-polling
    // improves reliability on unstable/mobile networks.
    try {
      db = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch {
      // If Firestore was already initialized elsewhere, fall back to the singleton.
      db = getFirestore(firebaseApp);
    }

    if (USE_EMULATOR && !firestoreEmulatorConnected) {
      connectFirestoreEmulator(db, getEmulatorHost(), 8080);
      firestoreEmulatorConnected = true;
      console.log(`[Firebase] Connected to Firestore emulator at ${getEmulatorHost()}:8080`);
    }
  }
  return db;
}

/**
 * Returns the singleton Firebase Storage instance.
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());

    if (USE_EMULATOR && !storageEmulatorConnected) {
      connectStorageEmulator(storage, getEmulatorHost(), 9199);
      storageEmulatorConnected = true;
      console.log(`[Firebase] Connected to Storage emulator at ${getEmulatorHost()}:9199`);
    }
  }
  return storage;
}

// Initialize on import so the app is always ready
getFirebaseApp();

export default app!;
