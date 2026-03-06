/**
 * Master Data Firestore Service
 *
 * Districts and schools lookups.
 */

import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { District, School } from '../../types';

const db = getFirebaseDb();

/** Fetch all districts ordered by name. */
export async function getDistricts(): Promise<District[]> {
    const snap = await getDocs(query(collection(db, 'districts'), orderBy('name')));
    return snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || '',
        state: d.data().state || '',
    }));
}

/** Fetch schools, optionally filtered by district. */
export async function getSchools(districtId?: string): Promise<School[]> {
    let q;
    if (districtId) {
        q = query(collection(db, 'schools'), where('district_id', '==', districtId), orderBy('name'));
    } else {
        q = query(collection(db, 'schools'), orderBy('name'));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || '',
        registration_code: d.data().registration_code || '',
        district_id: d.data().district_id || '',
    }));
}
