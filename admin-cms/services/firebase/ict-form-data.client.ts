/**
 * ICT Form Data — Client-Side Firestore Service
 *
 * Cursor-based pagination using the client SDK.
 * Used by useInfiniteQuery in the ICTFormData component.
 *
 * Collection: `ict_form_data`
 */

'use client';

import {
    collection,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    startAfter,
    getDocs,
    getCountFromServer,
    Timestamp,
    type DocumentSnapshot,
    type DocumentData,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';
import { waitForAuthReady } from '@/services/firebase/auth.firestore';
import { devDelay } from '@/lib/dev-delay';

// ────────────────────── Types ──────────────────────

export interface ICTFormDataRow {
    id: string;
    school: string;
    district: string;
    udise: string;
    submitted_by_name: string;
    have_smart_tvs: string;
    have_ups: string;
    have_pendrives: string;
    ict_materials_working: string;
    smart_tvs_wall_mounted: string;
    smart_tvs_location: string;
    photos_of_materials: string[];
    smart_class_in_routine: string;
    school_routine: string;
    weekly_smart_class: string;
    has_logbook: string;
    logbook: string;
    students_benefited: string;
    noticed_impact: string;
    is_smart_class_benefiting: string;
    how_program_helped: string;
    observations: string;
    created_at: string;
}

export interface ICTFormDataPage {
    rows: ICTFormDataRow[];
    totalCount: number;
    totalPages: number;
    page: number;
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

function toRow(docId: string, d: DocumentData): ICTFormDataRow {
    return {
        id: docId,
        school: d.school_name ?? '',
        district: d.district ?? '',
        udise: d.udise ?? '',
        submitted_by_name: d.submitted_by_name ?? '',
        have_smart_tvs: d.have_smart_tvs ?? '',
        have_ups: d.have_ups ?? '',
        have_pendrives: d.have_pendrives ?? '',
        ict_materials_working: d.ict_materials_working ?? '',
        smart_tvs_wall_mounted: d.smart_tvs_wall_mounted ?? '',
        smart_tvs_location: d.smart_tvs_location ?? '',
        photos_of_materials: d.photos_of_materials ?? [],
        smart_class_in_routine: d.smart_class_in_routine ?? '',
        school_routine: d.school_routine ?? '',
        weekly_smart_class: d.weekly_smart_class ?? '',
        has_logbook: d.has_logbook ?? '',
        logbook: d.logbook ?? '',
        students_benefited: d.students_benefited ?? '',
        noticed_impact: d.noticed_impact ?? '',
        is_smart_class_benefiting: d.is_smart_class_benefiting ?? '',
        how_program_helped: d.how_program_helped ?? '',
        observations: d.observations ?? '',
        created_at: toIso(d.created_at),
    };
}

// ────────────────────── Cursor Cache ──────────────────────

const PAGE_SIZE = 20;

// Key: serialized filter params (without page), Value: Map<pageNumber, lastDocSnapshot>
const cursorCache = new Map<string, Map<number, DocumentSnapshot>>();

function getCursorCacheKey(district?: string, date?: string): string {
    return JSON.stringify({ district: district ?? null, date: date ?? null });
}

/** Clear cursor cache — call when filters change */
export function clearICTFormDataCursorCache() {
    cursorCache.clear();
}

// ────────────────────── Client-Side API ──────────────────────

/**
 * Fetch a page of ICT form data using Firestore client SDK with cursor-cached pagination.
 *
 * @param page     - 1-based page number (default 1)
 * @param district - Optional district filter
 * @param date     - Optional date filter (YYYY-MM-DD string)
 */
export async function fetchICTFormDataPage(
    page: number = 1,
    district?: string,
    date?: string,
): Promise<ICTFormDataPage> {
    await devDelay('read', 'fetching ICT form data');
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const colRef = collection(db, 'ict_form_data');

    const constraints: Parameters<typeof query>[1][] = [];

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

    // Get total count
    const countQuery = query(colRef, ...constraints);
    const countSnap = await getCountFromServer(countQuery);
    const totalCount = countSnap.data().count;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // ── Cursor cache setup ──
    const cacheKey = getCursorCacheKey(district, date);
    if (!cursorCache.has(cacheKey)) {
        cursorCache.set(cacheKey, new Map());
    }
    const pagesCursors = cursorCache.get(cacheKey)!;

    let pageQuery;

    if (page === 1) {
        pageQuery = query(colRef, ...constraints, firestoreLimit(PAGE_SIZE));
    } else {
        const prevPageCursor = pagesCursors.get(page - 1);

        if (prevPageCursor) {
            pageQuery = query(colRef, ...constraints, startAfter(prevPageCursor), firestoreLimit(PAGE_SIZE));
        } else {
            let nearestPage = 0;
            let nearestCursor: DocumentSnapshot | null = null;

            for (const [pg, cursor] of pagesCursors.entries()) {
                if (pg < page && pg > nearestPage) {
                    nearestPage = pg;
                    nearestCursor = cursor;
                }
            }

            const pagesToSkip = page - nearestPage - 1;
            const docsToSkip = pagesToSkip * PAGE_SIZE;

            if (docsToSkip > 0) {
                const skipQuery = nearestCursor
                    ? query(colRef, ...constraints, startAfter(nearestCursor), firestoreLimit(docsToSkip))
                    : query(colRef, ...constraints, firestoreLimit(docsToSkip));
                const skipSnap = await getDocs(skipQuery);

                for (let i = 0; i < skipSnap.docs.length; i++) {
                    if ((i + 1) % PAGE_SIZE === 0) {
                        const intermediatePageNum = nearestPage + Math.floor(i / PAGE_SIZE) + 1;
                        pagesCursors.set(intermediatePageNum, skipSnap.docs[i]);
                    }
                }

                const lastSkippedDoc = skipSnap.docs[skipSnap.docs.length - 1];
                if (lastSkippedDoc) {
                    pagesCursors.set(page - 1, lastSkippedDoc);
                    pageQuery = query(colRef, ...constraints, startAfter(lastSkippedDoc), firestoreLimit(PAGE_SIZE));
                } else {
                    return { rows: [], totalCount, totalPages, page };
                }
            } else {
                pageQuery = nearestCursor
                    ? query(colRef, ...constraints, startAfter(nearestCursor), firestoreLimit(PAGE_SIZE))
                    : query(colRef, ...constraints, firestoreLimit(PAGE_SIZE));
            }
        }
    }

    const pageSnap = await getDocs(pageQuery);

    if (pageSnap.docs.length > 0) {
        pagesCursors.set(page, pageSnap.docs[pageSnap.docs.length - 1]);
    }

    const rows = pageSnap.docs.map((d) => toRow(d.id, d.data()));

    return { rows, totalCount, totalPages, page };
}

/**
 * Fetch ALL ICT form data rows (no pagination) for XLSX export.
 */
export async function fetchAllICTFormData(
    district?: string,
    date?: string,
): Promise<ICTFormDataRow[]> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const colRef = collection(db, 'ict_form_data');

    const constraints: Parameters<typeof query>[1][] = [];
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

    const snap = await getDocs(query(colRef, ...constraints));
    return snap.docs.map((d) => toRow(d.id, d.data()));
}
