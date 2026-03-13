/**
 * Events — Firestore Data Access Layer (Client-Side)
 *
 * Provides read, delete operations for the `events` collection.
 * Follows the same patterns as circular.firestore.ts and notice.firestore.ts.
 *
 * Collection: `events`
 */

"use client";

import {
    collection,
    doc,
    query,
    orderBy,
    limit as queryLimit,
    getDocs,
    getDoc,
    getCountFromServer,
    deleteDoc,
    where,
    DocumentData,
    Timestamp,
    QueryConstraint,
    startAfter,
} from "firebase/firestore";
import { getFirebaseFirestore, getFirebaseAuth } from "@/lib/firebase";
import { auditLogsFirestore } from "./audit-logs.firestore";
import { devDelay } from "@/lib/dev-delay";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

// ── Types ────────────────────────────────────────────────────────────────────

export type SchoolEventType =
    | 'MEETING'
    | 'EXAM'
    | 'HOLIDAY'
    | 'SEMINAR'
    | 'WORKSHOP'
    | 'SPORTS'
    | 'CULTURAL'
    | 'OTHER';

export interface EventFilterParams {
    from_date?: string;
    to_date?: string;
    district_id?: string;
    event_type?: SchoolEventType;
    activity_type?: string;
    search?: string;
}

export interface EventWithStats {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_end_date: string | null;
    event_time: string | null;
    location: string | null;
    event_type: SchoolEventType;
    activity_type: string | null;
    flyer_url: string | null;
    male_participants: number | null;
    female_participants: number | null;
    is_active: boolean;
    created_at: string;
    creator: { id: string; name: string } | null;
    school: { id: string; name: string } | null;
    district: { id: string; name: string } | null;
}

export interface EventsResponse {
    data: EventWithStats[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Safely convert a Firestore Timestamp (or any date-like value) to ISO string */
function toIso(value: unknown): string {
    if (!value) return new Date().toISOString();
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof (value as { toDate: () => Date }).toDate === "function"
    ) {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (typeof value === "object" && value !== null && "seconds" in value) {
        return new Date(((value as { seconds: number }).seconds ?? 0) * 1000).toISOString();
    }
    return new Date().toISOString();
}

/** Transform a Firestore document into an EventWithStats */
function toEvent(docId: string, data: DocumentData): EventWithStats {
    return {
        id: docId,
        title: data.title ?? "",
        description: data.description ?? null,
        event_date: toIso(data.event_date),
        event_end_date: data.event_end_date ? toIso(data.event_end_date) : null,
        event_time: data.event_time ?? null,
        location: data.location ?? null,
        event_type: data.event_type ?? "OTHER",
        activity_type: data.activity_type ?? null,
        flyer_url: data.flyer_url ?? null,
        male_participants: data.male_participants ?? null,
        female_participants: data.female_participants ?? null,
        is_active: data.is_active ?? true,
        created_at: toIso(data.created_at),
        creator: null,
        school: null,
        district: null,
    };
}

/** Resolve a set of IDs to names from a Firestore collection */
async function resolveNames(
    collectionName: string,
    ids: Set<string>
): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (ids.size === 0) return map;
    const db = getFirebaseFirestore();
    const promises = Array.from(ids).map(async (id) => {
        try {
            const snap = await getDoc(doc(db, collectionName, id));
            if (snap.exists()) {
                map.set(id, snap.data().name ?? "Unknown");
            }
        } catch {
            // skip unresolvable IDs
        }
    });
    await Promise.all(promises);
    return map;
}

/**
 * Resolve creator, school, and district names for a batch of events.
 * Uses deduplication to minimize Firestore reads.
 */
async function resolveEventRelations(
    events: EventWithStats[],
    rawDocs: DocumentData[]
): Promise<void> {
    const creatorIds = new Set<string>();
    const schoolIds = new Set<string>();
    const districtIds = new Set<string>();

    for (const raw of rawDocs) {
        if (raw.created_by) creatorIds.add(raw.created_by);
        if (raw.school_id) schoolIds.add(raw.school_id);
        if (raw.district_id) districtIds.add(raw.district_id);
    }

    const [creatorMap, schoolMap, districtMap] = await Promise.all([
        resolveNames("users", creatorIds),
        resolveNames("schools", schoolIds),
        resolveNames("districts", districtIds),
    ]);

    for (let i = 0; i < events.length; i++) {
        const raw = rawDocs[i];
        if (raw.created_by && creatorMap.has(raw.created_by)) {
            events[i].creator = { id: raw.created_by, name: creatorMap.get(raw.created_by)! };
        }
        if (raw.school_id && schoolMap.has(raw.school_id)) {
            events[i].school = { id: raw.school_id, name: schoolMap.get(raw.school_id)! };
        }
        if (raw.district_id && districtMap.has(raw.district_id)) {
            events[i].district = { id: raw.district_id, name: districtMap.get(raw.district_id)! };
        }
    }
}

// ── Firestore API ──────────────────────────────────────────────────

export const eventsFirestore = {
    /**
     * Fetch events with cursor-based pagination.
     * Ordered by created_at desc by default.
     *
     * ALL filters are server-side Firestore queries:
     * - event_type: equality filter
     * - district_id: equality filter
     * - from_date / to_date: range filter on event_date
     * - search: exact match on title or location
     *
     * @param filters  Optional filters
     * @param limit    Page size (default 20)
     * @param cursor   JSON string `{ts}` of the last document (null for first page)
     */
    async getAll(
        filters?: EventFilterParams,
        limit = 20,
        cursor?: string | null
    ): Promise<EventsResponse> {
        await waitForAuthReady();
        await devDelay("read", "events.getAll");
        const db = getFirebaseFirestore();
        const eventsCol = collection(db, "events");

        // ── Server-side search: exact match on title or location ──
        if (filters?.search?.trim()) {
            const s = filters.search.trim();

            const [titleSnap, locationSnap] = await Promise.all([
                getDocs(query(eventsCol, where("title", "==", s))),
                getDocs(query(eventsCol, where("location", "==", s))),
            ]);

            // Merge & deduplicate
            const seen = new Set<string>();
            const data: EventWithStats[] = [];
            const rawDocs: DocumentData[] = [];
            for (const snap of [titleSnap, locationSnap]) {
                for (const d of snap.docs) {
                    if (!seen.has(d.id)) {
                        seen.add(d.id);
                        data.push(toEvent(d.id, d.data()));
                        rawDocs.push(d.data());
                    }
                }
            }

            data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            await resolveEventRelations(data, rawDocs);
            return { data, total: data.length, hasMore: false, nextCursor: null };
        }

        // ── No search: cursor-based pagination with server-side filters ──

        // Build constraints — all server-side
        const constraints: QueryConstraint[] = [];

        // Equality filters FIRST (before range + orderBy)
        if (filters?.event_type) {
            constraints.push(where("event_type", "==", filters.event_type));
        }

        if (filters?.activity_type) {
            constraints.push(where("activity_type", "==", filters.activity_type));
        }

        if (filters?.district_id) {
            constraints.push(where("district_id", "==", filters.district_id));
        }

        // Date range — range filters on event_date
        if (filters?.from_date) {
            constraints.push(
                where("event_date", ">=", Timestamp.fromDate(new Date(filters.from_date)))
            );
        }
        if (filters?.to_date) {
            const endOfDay = new Date(filters.to_date);
            endOfDay.setHours(23, 59, 59, 999);
            constraints.push(
                where("event_date", "<=", Timestamp.fromDate(endOfDay))
            );
        }

        const hasDateRangeFilter = !!(filters?.from_date || filters?.to_date);
        const sortField = hasDateRangeFilter ? "event_date" : "created_at";

        // Firestore requires ordering by the range field when date range filters are present.
        constraints.push(orderBy(sortField, "desc"));

        // Total count (use same filters for accurate count)
        const countQ = query(eventsCol, ...constraints);
        const countSnap = await getCountFromServer(countQ);
        const total = countSnap.data().count;

        // Cursor
        if (cursor) {
            try {
                const { ts } = JSON.parse(cursor);
                constraints.push(startAfter(Timestamp.fromDate(new Date(ts))));
            } catch {
                // ignore bad cursor
            }
        }

        // Fetch one extra to detect hasMore
        constraints.push(queryLimit(limit + 1));

        console.log("[eventsFirestore] Running query with", constraints.length, "constraints");
        const q = query(eventsCol, ...constraints);
        const snapshot = await getDocs(q);
        console.log("[eventsFirestore] Got", snapshot.docs.length, "docs");

        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

        const data = docs.map((d) => toEvent(d.id, d.data()));
        const rawDocs = docs.map((d) => d.data());

        // Resolve creator/school/district names
        await resolveEventRelations(data, rawDocs);

        const lastDoc = docs[docs.length - 1];
        const nextCursor = hasMore && lastDoc
            ? JSON.stringify({ ts: toIso(lastDoc.data()[sortField]) })
            : null;

        return { data, total, hasMore, nextCursor };
    },

    /**
     * Get a single event by ID.
     */
    async getById(id: string): Promise<EventWithStats> {
        await waitForAuthReady();
        await devDelay("read", "events.getById");
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, "events", id));
        if (!snap.exists()) throw new Error("Event not found");

        const event = toEvent(snap.id, snap.data());
        await resolveEventRelations([event], [snap.data()]);

        return event;
    },

    /**
     * Delete an event.
     */
    async delete(id: string): Promise<{ success: boolean; message: string }> {
        await waitForAuthReady();
        await devDelay("write", "events.delete");
        const db = getFirebaseFirestore();
        const eventRef = doc(db, "events", id);
        const snap = await getDoc(eventRef);
        if (!snap.exists()) throw new Error("Event not found");

        await deleteDoc(eventRef);

        // Audit log
        const auth = getFirebaseAuth();
        await auditLogsFirestore.create({
            user_id: auth.currentUser?.uid ?? null,
            action: "EVENT_DELETED",
            entity_type: "Event",
            entity_id: id,
        });

        return { success: true, message: "Event deleted successfully" };
    },
};
