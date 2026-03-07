/**
 * IE Home Visit Data — Client-Side Firestore Service
 *
 * Cursor-based pagination for useInfiniteQuery.
 * Collection: `ie_home_visit_data`
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
    getDoc,
    doc,
    getCountFromServer,
    Timestamp,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';
import { waitForAuthReady } from '@/services/firebase/auth.firestore';
import { devDelay } from '@/lib/dev-delay';

// ────────────────────── Types ──────────────────────

export interface IEHomeVisitRow {
    id: string;
    ebrc: string;
    district: string;
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

export interface IEHomeVisitResponse {
    data: IEHomeVisitRow[];
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

function toRow(docId: string, d: DocumentData): IEHomeVisitRow {
    return {
        id: docId,
        ebrc: d.ebrc ?? '',
        district: d.district ?? '',
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

function buildConstraints(district?: string, date?: string): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];
    if (district && district !== 'all') {
        constraints.push(where('district', '==', district));
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

export const ieHomeVisitDataFirestore = {
    /**
     * Fetch a page of IE home visit data (cursor-based, for useInfiniteQuery).
     */
    async fetchPage(
        cursor?: string,
        district?: string,
        date?: string,
    ): Promise<IEHomeVisitResponse> {
        await devDelay('read', 'fetching IE home visit data');
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const colRef = collection(db, 'ie_home_visit_data');

        const baseConstraints = buildConstraints(district, date);

        // Total count
        const countSnap = await getCountFromServer(query(colRef, ...baseConstraints));
        const total = countSnap.data().count;

        // Fetch data
        const constraints: QueryConstraint[] = [
            ...baseConstraints,
            queryLimit(PAGE_SIZE + 1),
        ];

        if (cursor) {
            const cursorDoc = await getDoc(doc(db, 'ie_home_visit_data', cursor));
            if (cursorDoc.exists()) {
                constraints.push(startAfter(cursorDoc));
            }
        }

        const snap = await getDocs(query(colRef, ...constraints));
        const hasMore = snap.docs.length > PAGE_SIZE;
        const docs = snap.docs.slice(0, PAGE_SIZE);
        const data = docs.map((d) => toRow(d.id, d.data()));

        return {
            data,
            total,
            nextCursor: data.length > 0 ? data[data.length - 1].id : null,
            hasMore,
        };
    },

    /**
     * Fetch ALL IE home visit rows (no pagination) for XLSX export.
     */
    async fetchAll(
        district?: string,
        date?: string,
    ): Promise<IEHomeVisitRow[]> {
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const colRef = collection(db, 'ie_home_visit_data');

        const constraints = buildConstraints(district, date);
        const snap = await getDocs(query(colRef, ...constraints));
        return snap.docs.map((d) => toRow(d.id, d.data()));
    },
};
