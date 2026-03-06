/**
 * Content Firestore Service
 *
 * Notices, events, and circulars.
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';

const db = getFirebaseDb();

// ── Notices ──

/** Fetch notices, ordered by most recent. */
export async function getNotices(): Promise<any[]> {
    const snap = await getDocs(query(collection(db, 'notices'), orderBy('created_at', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Events ──

/** Fetch events, ordered by most recent. */
export async function getEvents(): Promise<any[]> {
    const snap = await getDocs(query(collection(db, 'events'), orderBy('created_at', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Create an event. */
export async function createEvent(data: {
    title: string;
    description?: string;
    event_date: string;
    event_end_date?: string;
    event_time?: string;
    location?: string;
    event_type?: string;
    activity_type?: string;
    flyer_url?: string;
    male_participants?: number;
    female_participants?: number;
    school_id?: string;
    district_id?: string;
    created_by: string;
}): Promise<any> {
    const ref = doc(collection(db, 'events'));
    const record = {
        id: ref.id,
        ...data,
        event_date: Timestamp.fromDate(new Date(data.event_date)),
        event_end_date: data.event_end_date ? Timestamp.fromDate(new Date(data.event_end_date)) : null,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
    };
    await setDoc(ref, record);
    return record;
}

// ── Circulars ──

/** Fetch circulars, ordered by most recent. */
export async function getCirculars(): Promise<any[]> {
    const snap = await getDocs(query(collection(db, 'circulars'), orderBy('created_at', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
