/**
 * IE School Visit Data — Client-Side Firestore Service
 *
 * Cursor-based pagination for useInfiniteQuery.
 * Collection: `ie_school_visit_data`
 */

'use client';

import {
    collection,
    query,
    where,
    orderBy,
    limit as queryLimit,
    startAfter,
    getDocs,
    getCountFromServer,
    Timestamp,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';
import { waitForAuthReady } from '@/services/firebase/auth.firestore';
import { devDelay } from '@/lib/dev-delay';

// ────────────────────── Types ──────────────────────

export interface IESchoolVisitRow {
    id: string;
    school: string;
    school_id: string;
    district: string;
    district_id: string;
    ebrc: string;
    submitted_by_name: string;
    rci_number: string;
    name_of_cwsn: string;
    type_of_disability: string;
    gender: string;
    age: string;
    activities_topics: string;
    therapy_type: string;
    therapy_brief: string;
    expected_outcome: string;
    was_goal_achieved: string;
    photos: string[];
    created_at: string;
}

export interface IESchoolVisitResponse {
    data: IESchoolVisitRow[];
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
}

// ────────────────────── Helpers ──────────────────────

function toIso(value: unknown): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        return new Date(((value as { seconds: number }).seconds ?? 0) * 1000).toISOString();
    }
    return new Date().toISOString();
}

function toRow(docId: string, d: DocumentData): IESchoolVisitRow {
    return {
        id: docId,
        school: d.school ?? '',
        school_id: d.school_id ?? '',
        district: d.district ?? '',
        district_id: d.district_id ?? '',
        ebrc: d.ebrc ?? '',
        submitted_by_name: d.submitted_by_name ?? '',
        rci_number: d.rci_number ?? '',
        name_of_cwsn: d.name_of_cwsn ?? '',
        type_of_disability: d.type_of_disability ?? '',
        gender: d.gender ?? '',
        age: d.age ?? '',
        activities_topics: d.activities_topics ?? '',
        therapy_type: d.therapy_type ?? '',
        therapy_brief: d.therapy_brief ?? '',
        expected_outcome: d.expected_outcome ?? '',
        was_goal_achieved: d.was_goal_achieved ?? '',
        photos: d.photos ?? [],
        created_at: toIso(d.created_at),
    };
}

// ────────────────────── Cursor-based API ──────────────────────

const PAGE_SIZE = 20;

function buildConstraints(district?: string, school?: string, date?: string): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (district && district !== 'all') {
        constraints.push(where('district', '==', district));
    }
    if (school && school !== 'all') {
        constraints.push(where('school', '==', school));
    }
    if (date) {
        const dayStart = new Date(date + 'T00:00:00');
        const dayEnd = new Date(date + 'T23:59:59.999');
        constraints.push(where('created_at', '>=', Timestamp.fromDate(dayStart)));
        constraints.push(where('created_at', '<=', Timestamp.fromDate(dayEnd)));
    }
    constraints.push(orderBy('created_at', 'desc'));
    return constraints;
}

// ────────────────────── Firestore API ──────────────────────

export const ieSchoolVisitDataFirestore = {
    /**
     * Fetch a page of IE school visit data (cursor-based, for useInfiniteQuery).
     */
    async fetchPage(
        cursor?: string,
        district?: string,
        school?: string,
        date?: string,
    ): Promise<IESchoolVisitResponse> {
        await devDelay('read', 'fetching IE school visit data');
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const colRef = collection(db, 'ie_school_visit_data');

        const constraints = buildConstraints(district, school, date);

        // Total count
        const countSnap = await getCountFromServer(query(colRef, ...constraints));
        const total = countSnap.data().count;

        const pageConstraints = [...constraints];

        if (cursor) {
            try {
                const { ts, id } = JSON.parse(cursor);
                pageConstraints.push(startAfter(Timestamp.fromDate(new Date(ts)), id));
            } catch {
                pageConstraints.push(startAfter(Timestamp.fromDate(new Date(cursor))));
            }
        }

        pageConstraints.push(queryLimit(PAGE_SIZE + 1));

        const snap = await getDocs(query(colRef, ...pageConstraints));
        const hasMore = snap.docs.length > PAGE_SIZE;
        const docs = hasMore ? snap.docs.slice(0, PAGE_SIZE) : snap.docs;
        const data = docs.map((d) => toRow(d.id, d.data()));

        const lastDoc = docs[docs.length - 1];
        const nextCursor = lastDoc
            ? JSON.stringify({ ts: toIso(lastDoc.data().created_at), id: lastDoc.id })
            : null;

        return { data, total, nextCursor, hasMore };
    },

    /**
     * Fetch ALL IE school visit rows (no pagination) for XLSX export.
     */
    async fetchAll(
        district?: string,
        school?: string,
        date?: string,
    ): Promise<IESchoolVisitRow[]> {
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const colRef = collection(db, 'ie_school_visit_data');

        const constraints = buildConstraints(district, school, date);
        const snap = await getDocs(query(colRef, ...constraints));
        return snap.docs.map((d) => toRow(d.id, d.data()));
    },
};
