/**
 * ICT Form Data — Server-Side Firestore Service (firebase-admin)
 *
 * Fetches ICT form submissions from the `ict_form_data` collection
 * using the Admin SDK with cursor-based pagination.
 *
 * Collection: `ict_form_data`
 */

import { devDelay } from '@/lib/dev-delay';
import { getAdminFirestore } from '@/lib/firebase-admin';

// ────────────────────── Types ──────────────────────

export interface ICTFormDataRow {
    id: string;
    school: string;
    district: string;
    udise: string;
    submitted_by_name: string;
    // Page 1
    have_smart_tvs: string;
    have_ups: string;
    have_pendrives: string;
    ict_materials_working: string;
    smart_tvs_wall_mounted: string;
    smart_tvs_location: string;
    photos_of_materials: string[];
    // Page 2
    smart_class_in_routine: string;
    school_routine: string;
    weekly_smart_class: string;
    has_logbook: string;
    logbook: string;
    // Page 3
    students_benefited: string;
    noticed_impact: string;
    is_smart_class_benefiting: string;
    how_program_helped: string;
    observations: string;
    // Metadata
    created_at: string;
}

export interface PaginatedICTFormData {
    rows: ICTFormDataRow[];
    /** Cursor (doc ID) to pass for the next page, null if no more pages */
    nextCursor: string | null;
    /** Cursor (doc ID) for the previous page (the first doc of current page) */
    currentCursor: string | null;
    /** Total count matching the filters (for display) */
    totalCount: number;
    /** Items per page */
    pageSize: number;
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

function toRow(docId: string, d: FirebaseFirestore.DocumentData): ICTFormDataRow {
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

// ────────────────────── Internal Helpers ──────────────────────

const DEFAULT_PAGE_SIZE = 10;

function buildBaseQuery(
    db: FirebaseFirestore.Firestore,
    district?: string,
): FirebaseFirestore.Query {
    let q: FirebaseFirestore.Query = db.collection('ict_form_data');

    if (district && district !== 'all') {
        q = q.where('district', '==', district);
    }

    q = q.orderBy('created_at', 'desc');
    return q;
}

async function getFilteredCount(
    db: FirebaseFirestore.Firestore,
    district?: string,
): Promise<number> {
    const snap = await buildBaseQuery(db, district).count().get();
    return snap.data().count;
}

// ────────────────────── Service Object ──────────────────────

export const ictFormDataAdmin = {
    /**
     * Fetch ICT form data from Firestore (server-side) with cursor-based pagination.
     */
    async getData(
        cursor?: string | null,
        pageSize: number = DEFAULT_PAGE_SIZE,
        district?: string,
        date?: string,
    ): Promise<PaginatedICTFormData> {
        await devDelay('read', 'reading ICT table data');
        const db = getAdminFirestore();

        // Get total count (for display)
        const totalCount = await getFilteredCount(db, district);

        // Build paginated query
        let q = buildBaseQuery(db, district);

        // If a cursor is provided, start after that document
        if (cursor) {
            const cursorDoc = await db.collection('ict_form_data').doc(cursor).get();
            if (cursorDoc.exists) {
                q = q.startAfter(cursorDoc);
            }
        }

        // Fetch one extra doc to determine if there's a next page
        q = q.limit(pageSize + 1);

        const snap = await q.get();
        const allDocs = snap.docs;
        const hasNextPage = allDocs.length > pageSize;
        const pageDocs = hasNextPage ? allDocs.slice(0, pageSize) : allDocs;

        let rows = pageDocs.map((doc) => toRow(doc.id, doc.data()));

        // Date filtering in JS (Firestore Timestamps don't support prefix matching)
        if (date) {
            rows = rows.filter((row) => row.created_at.startsWith(date));
        }

        return {
            rows,
            nextCursor: hasNextPage ? pageDocs[pageDocs.length - 1]?.id ?? null : null,
            currentCursor: pageDocs[0]?.id ?? null,
            totalCount,
            pageSize,
        };
    },
};
