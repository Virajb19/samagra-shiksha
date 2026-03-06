/**
 * Activity Forms Firestore Service (Mobile)
 *
 * Reads activity form documents from the `activity_forms` collection.
 */

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';

const db = getFirebaseDb();

export interface ActivityForm {
    id: string;
    name: string;
    status: 'Active' | 'Inactive' | 'Closed';
    starting_date: string | null;
    ending_date: string | null;
}

/** Fetch all activity forms, ordered by name. Status is computed from the date window. */
export async function getActivityForms(): Promise<ActivityForm[]> {
    const snap = await getDocs(query(collection(db, 'activity_forms'), orderBy('name', 'asc')));
    const now = new Date();

    return snap.docs.map((doc) => {
        const d = doc.data();
        const startingDate = toIso(d.starting_date);
        const endingDate = toIso(d.ending_date);

        // Compute effective status from the date window:
        // - "Active":   admin set "Open" AND today is within [starting_date, ending_date]
        // - "Inactive": admin set "Open" but today is BEFORE starting_date (scheduled)
        // - "Closed":   admin set "Closed" OR today is AFTER ending_date (expired)
        let computedStatus: 'Active' | 'Inactive' | 'Closed' = 'Closed';
        if (d.status === 'Open' && startingDate && endingDate) {
            const start = new Date(startingDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endingDate);
            // Set end to end-of-day so the form stays open on the last day
            end.setHours(23, 59, 59, 999);
            if (now >= start && now <= end) {
                computedStatus = 'Active';
            } else if (now < start) {
                computedStatus = 'Inactive';
            }
            // If now > end, stays "Closed" (expired)
        }

        return {
            id: doc.id,
            name: d.name ?? '',
            status: computedStatus,
            starting_date: startingDate,
            ending_date: endingDate,
        };
    });
}

/** Get only teacher/headmaster forms (ICT, Library, Science Lab, Self Defence, Vocational Education). */
export async function getTeacherForms(): Promise<ActivityForm[]> {
    const TEACHER_FORMS = ['ICT', 'Library', 'Science Lab', 'Self Defence', 'Vocational Education'];
    const all = await getActivityForms();
    return all.filter((f) => TEACHER_FORMS.includes(f.name));
}

/** Get only warden forms (KGBV, NSCBAV). */
export async function getWardenForms(): Promise<ActivityForm[]> {
    const WARDEN_FORMS = ['KGBV', 'NSCBAV'];
    const all = await getActivityForms();
    return all.filter((f) => WARDEN_FORMS.includes(f.name));
}

function toIso(val: any): string | null {
    if (!val) return null;
    if (val?.toDate) return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') return val;
    return null;
}
