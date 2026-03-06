/**
 * Users Firestore Service
 *
 * User profile reads, status checks, and personal-details updates.
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    Timestamp,
    DocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { User } from '../../types';

const db = getFirebaseDb();

// ── Reads ──

/** Fetch a user document by Firestore doc id. */
export async function getUserById(userId: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return mapUserDoc(snap);
}

/** Find user by email (used during login to map Firebase Auth → Firestore user doc). */
export async function getUserByEmail(email: string): Promise<User | null> {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    if (snap.empty) return null;
    return mapUserDoc(snap.docs[0]);
}

/** Get profile completion status for the current user. */
export async function getProfileStatus(userId: string): Promise<{
    has_completed_profile: boolean;
}> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User not found');
    const d = userDoc.data();

    return {
        has_completed_profile: d.has_completed_profile === true,
    };
}

// ── Writes ──

/** Update personal details (name, gender, phone). */
export async function updatePersonalDetails(
    userId: string,
    data: { name?: string; gender?: string; phone?: string },
): Promise<void> {
    await updateDoc(doc(db, 'users', userId), { ...data, updated_at: Timestamp.now() });
}

// ── Helpers ──

/** Map a Firestore user document to the app User type. */
export function mapUserDoc(snap: DocumentSnapshot): User {
    const d = snap.data()!;
    return {
        id: snap.id,
        name: d.name ?? '',
        email: d.email ?? undefined,
        phone: d.phone ?? '',
        role: d.role ?? 'TEACHER',
        gender: d.gender ?? undefined,
        profile_image_url: d.profile_image_url ?? undefined,
        is_active: d.is_active ?? false,
        has_completed_profile: d.has_completed_profile ?? false,

        district_id: d.district_id ?? undefined,
        responsibilities: d.responsibilities ?? undefined,
        kgbv_type: d.kgbv_type ?? undefined,
        residential_location: d.residential_location ?? undefined,
        ebrc: d.ebrc ?? undefined,
        qualification: d.qualification ?? undefined,
        years_of_experience: d.years_of_experience ?? undefined,
        date_of_joining: d.date_of_joining ? toIsoString(d.date_of_joining) : undefined,
        aadhaar_number: d.aadhaar_number ?? undefined,
    };
}

/** Convert Firestore Timestamp to ISO string. */
export function toIsoString(val: any): string {
    if (val?.toDate) return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') return val;
    return '';
}
