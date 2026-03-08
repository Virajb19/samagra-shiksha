/**
 * Vocational Education Form Data — Client-Side Firestore Service
 *
 * Cursor-based pagination using the client SDK.
 * Used by useQuery in the Vocational Education form data page.
 *
 * Collection: `vocational_education_form_data`
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

export interface VocationalFormDataRow {
    id: string;
    school: string;
    district: string;
    udise: string;
    submitted_by_name: string;
    trade: string;
    class_9_boys: string;
    class_9_girls: string;
    class_10_boys: string;
    class_10_girls: string;
    class_11_boys: string;
    class_11_girls: string;
    class_12_boys: string;
    class_12_girls: string;
    is_lab_setup: string;
    lab_photo: string;
    lab_not_setup_reason: string;
    is_guest_lecture_done: string;
    guest_lecture_photo: string;
    guest_lecture_not_done_reason: string;
    is_industrial_visit_done: string;
    industrial_visit_photo: string;
    industrial_visit_not_done_reason: string;
    is_internship_done: string;
    internship_report: string;
    internship_not_done_reason: string;
    best_practices: string;
    best_practice_photos: string[];
    success_stories: string;
    success_story_photos: string[];
    created_at: string;
}

export interface VocationalFormDataPage {
    rows: VocationalFormDataRow[];
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

function toRow(docId: string, d: DocumentData): VocationalFormDataRow {
    return {
        id: docId,
        school: d.school_name ?? '',
        district: d.district ?? '',
        udise: d.udise ?? '',
        submitted_by_name: d.submitted_by_name ?? '',
        trade: d.trade ?? '',
        class_9_boys: d.class_9?.boys ?? '0',
        class_9_girls: d.class_9?.girls ?? '0',
        class_10_boys: d.class_10?.boys ?? '0',
        class_10_girls: d.class_10?.girls ?? '0',
        class_11_boys: d.class_11?.boys ?? '0',
        class_11_girls: d.class_11?.girls ?? '0',
        class_12_boys: d.class_12?.boys ?? '0',
        class_12_girls: d.class_12?.girls ?? '0',
        is_lab_setup: d.is_lab_setup ?? '',
        lab_photo: d.lab_photo ?? '',
        lab_not_setup_reason: d.lab_not_setup_reason ?? '',
        is_guest_lecture_done: d.is_guest_lecture_done ?? '',
        guest_lecture_photo: d.guest_lecture_photo ?? '',
        guest_lecture_not_done_reason: d.guest_lecture_not_done_reason ?? '',
        is_industrial_visit_done: d.is_industrial_visit_done ?? '',
        industrial_visit_photo: d.industrial_visit_photo ?? '',
        industrial_visit_not_done_reason: d.industrial_visit_not_done_reason ?? '',
        is_internship_done: d.is_internship_done ?? '',
        internship_report: d.internship_report ?? '',
        internship_not_done_reason: d.internship_not_done_reason ?? '',
        best_practices: d.best_practices ?? '',
        best_practice_photos: d.best_practice_photos ?? [],
        success_stories: d.success_stories ?? '',
        success_story_photos: d.success_story_photos ?? [],
        created_at: toIso(d.created_at),
    };
}

// ────────────────────── Cursor Cache ──────────────────────

const PAGE_SIZE = 20;

const cursorCache = new Map<string, Map<number, DocumentSnapshot>>();

function getCursorCacheKey(district?: string, date?: string): string {
    return JSON.stringify({ district: district ?? null, date: date ?? null });
}

// ────────────────────── Service Object ──────────────────────

export const vocationalFormDataFirestore = {
    /** Clear cursor cache — call when filters change */
    clearCursorCache() {
        cursorCache.clear();
    },

    /**
     * Fetch a page of Vocational Education form data with cursor-cached pagination.
     */
    async fetchPage(
        page: number = 1,
        district?: string,
        date?: string,
    ): Promise<VocationalFormDataPage> {
        await devDelay('read', 'fetching vocational education form data');
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const colRef = collection(db, 'vocational_education_form_data');

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

        // Cursor cache setup
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
    },

    /**
     * Fetch ALL vocational education form data rows (no pagination) for XLSX export.
     */
    async fetchAll(
        district?: string,
        date?: string,
    ): Promise<VocationalFormDataRow[]> {
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const colRef = collection(db, 'vocational_education_form_data');

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
    },
};
