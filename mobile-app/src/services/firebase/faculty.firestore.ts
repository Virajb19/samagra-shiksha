/**
 * Faculty Firestore Service
 *
 * Faculty reads, colleague lookup, verification, and school staffs.
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
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';

const db = getFirebaseDb();

/** Fetch the faculty record for a given user (HM/Teacher). */
export async function getFacultyByUserId(userId: string): Promise<any | null> {
    const snap = await getDocs(query(collection(db, 'faculties'), where('user_id', '==', userId)));
    if (snap.empty) return null;
    const fDoc = snap.docs[0];
    const fData = fDoc.data();

    let school: any = null;
    if (fData.school_id) {
        const sSnap = await getDoc(doc(db, 'schools', fData.school_id));
        if (sSnap.exists()) {
            school = { id: sSnap.id, ...sSnap.data() };
            // Resolve district name from the districts collection
            if (school.district_id) {
                const dSnap = await getDoc(doc(db, 'districts', school.district_id));
                if (dSnap.exists()) {
                    school.district_name = dSnap.data().name ?? school.district_id;
                }
            }
        }
    }

    return { id: fDoc.id, ...fData, school };
}

/** Fetch all faculty (colleagues) at a given school. */
export async function getColleagues(schoolId: string, excludeUserId?: string): Promise<any[]> {
    const snap = await getDocs(query(collection(db, 'faculties'), where('school_id', '==', schoolId)));
    const results: any[] = [];
    for (const fDoc of snap.docs) {
        const fData = fDoc.data();
        if (excludeUserId && fData.user_id === excludeUserId) continue;
        const uSnap = await getDoc(doc(db, 'users', fData.user_id));
        const user = uSnap.exists() ? { id: uSnap.id, name: uSnap.data().name, profile_image_url: uSnap.data().profile_image_url } : null;
        results.push({ id: fDoc.id, ...fData, user });
    }
    return results;
}


/** Get all staff at a school (for headmaster view-staffs). */
export async function getSchoolStaffs(schoolId: string): Promise<any[]> {
    const facSnap = await getDocs(query(collection(db, 'faculties'), where('school_id', '==', schoolId)));
    const results: any[] = [];
    for (const fDoc of facSnap.docs) {
        const fData = fDoc.data();
        const uSnap = await getDoc(doc(db, 'users', fData.user_id));
        if (!uSnap.exists()) continue;
        const uData = uSnap.data();
        const user = {
            id: uSnap.id,
            name: uData.name ?? '',
            role: uData.role ?? 'TEACHER',
            phone: uData.phone ?? '',
            email: uData.email ?? '',
            gender: uData.gender ?? '',
            profile_image_url: uData.profile_image_url ?? null,
            is_active: uData.is_active ?? false,
        };
        results.push({ id: fDoc.id, ...fData, user });
    }
    return results;
}

/** Toggle a user's is_active status (for headmaster activate/deactivate). */
export async function toggleUserActive(userId: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
        is_active: isActive,
        updated_at: Timestamp.now(),
    });
}
