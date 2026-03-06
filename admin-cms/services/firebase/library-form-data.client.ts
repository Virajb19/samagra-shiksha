/**
 * Library Form Data — Client-Side Firestore Service
 *
 * Cursor-based pagination using the client SDK.
 * Used by useInfiniteQuery in the Library Form Data page.
 *
 * Collection: `library_form_data`
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

export interface LibraryFormDataRow {
    id: string;
    school: string;
    district: string;
    udise: string;
    submitted_by_name: string;
    is_library_available: string;
    is_child_friendly: string;
    has_proper_furniture: string;
    has_management_committee: string;
    library_teacher_name: string;
    has_reading_corner: string;
    number_of_reading_corners: string;
    number_of_computers: string;
    has_readers_club: string;
    has_weekly_library_period: string;
    library_periods_per_week: string;
    received_books_from_samagra: string;
    number_of_books_received: string;
    innovative_initiative: string;
    suggestions_feedback: string;
    student_photos: string[];
    logbook_photos: string[];
    created_at: string;
}

export interface LibraryFormDataPage {
    rows: LibraryFormDataRow[];
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

function toRow(docId: string, d: DocumentData): LibraryFormDataRow {
    return {
        id: docId,
        school: d.school_name ?? '',
        district: d.district ?? '',
        udise: d.udise ?? '',
        submitted_by_name: d.submitted_by_name ?? '',
        is_library_available: d.is_library_available ?? '',
        is_child_friendly: d.is_child_friendly ?? '',
        has_proper_furniture: d.has_proper_furniture ?? '',
        has_management_committee: d.has_management_committee ?? '',
        library_teacher_name: d.library_teacher_name ?? '',
        has_reading_corner: d.has_reading_corner ?? '',
        number_of_reading_corners: d.number_of_reading_corners ?? '',
        number_of_computers: d.number_of_computers ?? '',
        has_readers_club: d.has_readers_club ?? '',
        has_weekly_library_period: d.has_weekly_library_period ?? '',
        library_periods_per_week: d.library_periods_per_week ?? '',
        received_books_from_samagra: d.received_books_from_samagra ?? '',
        number_of_books_received: d.number_of_books_received ?? '',
        innovative_initiative: d.innovative_initiative ?? '',
        suggestions_feedback: d.suggestions_feedback ?? '',
        student_photos: d.student_photos ?? [],
        logbook_photos: d.logbook_photos ?? [],
        created_at: toIso(d.created_at),
    };
}

// ────────────────────── Cursor Cache ──────────────────────

const PAGE_SIZE = 20;

const cursorCache = new Map<string, Map<number, DocumentSnapshot>>();

function getCursorCacheKey(district?: string, date?: string): string {
    return JSON.stringify({ district: district ?? null, date: date ?? null });
}

/** Clear cursor cache — call when filters change */
export function clearLibraryFormDataCursorCache() {
    cursorCache.clear();
}

// ────────────────────── Client-Side API ──────────────────────

/**
 * Fetch a page of Library form data using Firestore client SDK with cursor-cached pagination.
 *
 * @param page     - 1-based page number (default 1)
 * @param district - Optional district filter
 * @param date     - Optional date filter (YYYY-MM-DD string)
 */
export async function fetchLibraryFormDataPage(
    page: number = 1,
    district?: string,
    date?: string,
): Promise<LibraryFormDataPage> {
    await devDelay('read', 'fetching Library form data');
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const colRef = collection(db, 'library_form_data');

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

    const countQuery = query(colRef, ...constraints);
    const countSnap = await getCountFromServer(countQuery);
    const totalCount = countSnap.data().count;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
 * Fetch ALL Library form data rows (no pagination) for XLSX export.
 */
export async function fetchAllLibraryFormData(
    district?: string,
    date?: string,
): Promise<LibraryFormDataRow[]> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const colRef = collection(db, 'library_form_data');

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
