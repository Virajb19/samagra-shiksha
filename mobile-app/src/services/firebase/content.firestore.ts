/**
 * Content Firestore Service
 *
 * Notices, events, and circulars.
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    orderBy,
    where,
    limit,
    startAfter,
    Timestamp,
    serverTimestamp,
    type QueryDocumentSnapshot,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { getFirebaseDb, getFirebaseStorage } from '../../lib/firebase';
import { devDelay } from '../../lib/dev-delay';
import { createAuditLog } from './audit-logs.firestore';

const db = getFirebaseDb();

/** Convert Firestore Timestamps to ISO strings in a document */
function serializeTimestamps(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
            result[key] = value.toDate().toISOString();
        } else {
            result[key] = value;
        }
    }
    return result;
}

// ── Notices ──

const NOTICES_PAGE_SIZE = 10;

export interface RecipientInfo {
    recipientId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    reject_reason: string | null;
}

export interface PaginatedNoticesResult {
    notices: any[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
}

export type NoticeTypeFilter = 'GENERAL' | 'INVITATION' | 'PUSH_NOTIFICATION';

/**
 * Fetch user-scoped notices with cursor-based pagination.
 *
 * Queries `notice_recipients` directly using denormalized fields:
 * - where(user_id == userId), orderBy(created_at desc), limit, startAfter
 * - All notice data (title, venue, event_date, etc.) is on the recipient doc.
 * - No need for a separate recipient map or notices collection lookup.
 *
 * Supports server-side filters via Firestore where clauses.
 * Title search uses server-side prefix match on denormalized `notice_title`.
 * Falls back to legacy `title` field prefix query when older rows do not have `notice_title`.
 * When filters are active the query key should change so React Query refetches from page 1.
 */
export async function getUserNoticesPaginated(
    userId: string,
    _recipientMap: Map<string, RecipientInfo>,
    pageSize: number = NOTICES_PAGE_SIZE,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData> | null,
    filters?: { titleSearch?: string; typeFilter?: NoticeTypeFilter | null; dateFrom?: Date | null; dateTo?: Date | null },
): Promise<PaginatedNoticesResult> {
    const recipientsRef = collection(db, 'notice_recipients');
    const titlePrefix = filters?.titleSearch?.trim() ?? '';

    const constraints: QueryConstraint[] = [
        where('user_id', '==', userId),
    ];

    // Server-side type filter
    if (filters?.typeFilter) {
        constraints.push(where('notice_type', '==', filters.typeFilter));
    }

    // Server-side date range filter on created_at
    if (filters?.dateFrom) {
        const fromStart = new Date(filters.dateFrom);
        fromStart.setHours(0, 0, 0, 0);
        constraints.push(where('created_at', '>=', Timestamp.fromDate(fromStart)));
    }
    if (filters?.dateTo) {
        const toEnd = new Date(filters.dateTo);
        toEnd.setHours(23, 59, 59, 999);
        constraints.push(where('created_at', '<=', Timestamp.fromDate(toEnd)));
    }

    if (titlePrefix) {
        constraints.push(where('notice_title', '>=', titlePrefix));
        constraints.push(where('notice_title', '<=', `${titlePrefix}\uf8ff`));
        constraints.push(orderBy('notice_title', 'asc'));
    }

    constraints.push(orderBy('created_at', 'desc'));

    if (lastDocSnapshot) {
        constraints.push(startAfter(lastDocSnapshot));
    }

    constraints.push(limit(pageSize + 1));

    const snap = await getDocs(query(recipientsRef, ...constraints));

    let allDocs = snap.docs;
    const hasMore = allDocs.length > pageSize;
    if (hasMore) allDocs = allDocs.slice(0, pageSize);

    const notices = allDocs.map((d) => {
        const data = d.data();
        return {
            id: data.notice_id,
            ...serializeTimestamps(data),
            title: data.notice_title ?? data.title ?? '',
            content: data.notice_content ?? data.content ?? '',
            type: data.notice_type ?? data.type ?? 'GENERAL',
            recipient_id: d.id,
            recipient_status: data.status ?? 'PENDING',
            reject_reason: data.reject_reason ?? null,
            _docRef: d, // keep doc ref for cursor
        };
    });

    // Last doc for cursor comes from the last doc we actually kept
    const lastDoc = allDocs.length > 0
        ? allDocs[allDocs.length - 1] as QueryDocumentSnapshot<DocumentData>
        : null;

    // Strip internal _docRef before returning
    const cleanNotices = notices.map(({ _docRef, ...rest }) => rest);

    return { notices: cleanNotices, lastDoc, hasMore };
}

/**
 * Fetch all notice_recipient data for a user.
 * Returns a Map of noticeId → RecipientInfo.
 *
 * @deprecated With denormalized notice_recipients, getUserNoticesPaginated
 * no longer needs this map. Kept for backward compatibility.
 */
export async function getUserRecipientMap(userId: string): Promise<Map<string, RecipientInfo>> {
    const snap = await getDocs(
        query(collection(db, 'notice_recipients'), where('user_id', '==', userId))
    );
    const map = new Map<string, RecipientInfo>();
    for (const d of snap.docs) {
        const data = d.data();
        map.set(data.notice_id, {
            recipientId: d.id,
            status: (data.status ?? 'PENDING') as RecipientInfo['status'],
            reject_reason: data.reject_reason ?? null,
        });
    }
    return map;
}

// ── Events ──

const EVENTS_PAGE_SIZE = 10;

export interface EventFilterParams {
    startDate?: string;
    endDate?: string;
    districtId?: string;
    search?: string;
}

export interface PaginatedEventsResult {
    events: any[];
    nextCursor: string | null;
    hasMore: boolean;
}

/**
 * Fetch events with cursor-based server-side pagination and filters.
 *
 * Filters (all server-side via Firestore where clauses):
 * - districtId: equality filter on district_id
 * - startDate / endDate: range filters on event_date
 * - search: exact match on title (Firestore doesn't support substring search)
 *
 * Ordered by created_at desc by default.
 */
export async function getEventsPaginated(
    pageSize: number = EVENTS_PAGE_SIZE,
    cursor?: string | null,
    filters?: EventFilterParams,
): Promise<PaginatedEventsResult> {
    await devDelay('read', 'content.getEventsPaginated');

    const eventsRef = collection(db, 'events');

    // ── Server-side search: exact match on title ──
    if (filters?.search?.trim()) {
        const s = filters.search.trim();
        const snap = await getDocs(query(eventsRef, where('title', '==', s), orderBy('created_at', 'desc')));
        const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return { events, nextCursor: null, hasMore: false };
    }

    const constraints: QueryConstraint[] = [];

    // Equality filter first (before range + orderBy)
    if (filters?.districtId) {
        constraints.push(where('district_id', '==', filters.districtId));
    }

    // Date range filters on event_date
    if (filters?.startDate) {
        constraints.push(where('event_date', '>=', Timestamp.fromDate(new Date(filters.startDate))));
    }
    if (filters?.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('event_date', '<=', Timestamp.fromDate(endOfDay)));
    }

    const hasDateRangeFilter = !!(filters?.startDate || filters?.endDate);
    const sortField = hasDateRangeFilter ? 'event_date' : 'created_at';

    // Firestore requires ordering by the range field when date range filters are present.
    constraints.push(orderBy(sortField, 'desc'));

    // Cursor
    if (cursor) {
        const cursorSnap = await getDoc(doc(db, 'events', cursor));
        if (cursorSnap.exists()) {
            constraints.push(startAfter(cursorSnap));
        }
    }

    // Fetch one extra to detect hasMore
    constraints.push(limit(pageSize + 1));

    const snap = await getDocs(query(eventsRef, ...constraints));

    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

    const events = docs.map((d) => ({ id: d.id, ...d.data() }));
    const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

    return { events, nextCursor: hasMore ? nextCursor : null, hasMore };
}

/** Fetch a single event by ID. Resolves creator name from users collection. */
export async function getEventById(eventId: string): Promise<any | null> {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists()) return null;
    const data: any = { id: snap.id, ...snap.data() };

    if (data.creator_name) {
        return data;
    }

    if (data.created_by) {
        try {
            // Primary: users doc id equals created_by
            const userSnap = await getDoc(doc(db, 'users', data.created_by));
            if (userSnap.exists()) {
                data.creator_name = userSnap.data().name || 'Unknown';
                return data;
            }

            // Fallback: some environments keep auth uid in a field and use a different doc id.
            const byIdField = await getDocs(
                query(collection(db, 'users'), where('id', '==', data.created_by), limit(1))
            );
            if (!byIdField.empty) {
                data.creator_name = byIdField.docs[0].data().name || 'Unknown';
                return data;
            }

            const byUidField = await getDocs(
                query(collection(db, 'users'), where('uid', '==', data.created_by), limit(1))
            );
            if (!byUidField.empty) {
                data.creator_name = byUidField.docs[0].data().name || 'Unknown';
                return data;
            }
        } catch {
            // Skip if user doc not found
        }
    }

    data.creator_name = data.created_by_name || 'Unknown';

    return data;
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
    creator_name?: string;
}): Promise<any> {
    const ref = doc(collection(db, 'events'));
    const sanitizedData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );
    const record = {
        id: ref.id,
        ...sanitizedData,
        event_date: Timestamp.fromDate(new Date(data.event_date)),
        event_end_date: data.event_end_date ? Timestamp.fromDate(new Date(data.event_end_date)) : null,
        is_active: true,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
    };
    await setDoc(ref, record);

    await createAuditLog({
        user_id: data.created_by,
        action: 'EVENT_CREATED',
        entity_type: 'Event',
        entity_id: ref.id,
    });

    return record;
}

// ── Circulars ──

const CIRCULARS_PAGE_SIZE = 10;

export interface PaginatedCircularsResult {
    circulars: any[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface CircularFilterParams {
    searchPrefix?: string;
}

/**
 * Fetch circulars visible to a specific user based on visibility rules:
 *
 * 1. GLOBAL circulars → visible to all users
 * 2. DISTRICT circulars → visible to all users in that district
 * 3. SCHOOL circulars → visible to TEACHER/HEADMASTER of those schools
 *    (further filtered by target_roles if set)
 *
 * Runs parallel Firestore queries and merges results, sorted by created_at desc.
 */
export async function getCircularsPaginated(
    userRole: string,
    userDistrictId: string | null,
    userSchoolId: string | null,
    pageSize: number = CIRCULARS_PAGE_SIZE,
    cursor?: string | null,
    filters?: CircularFilterParams,
): Promise<PaginatedCircularsResult> {
    await devDelay('read', 'content.getCircularsPaginated');

    const circularsRef = collection(db, 'circulars');

    const normalizedPrefix = filters?.searchPrefix?.trim() ?? '';

    // Build parallel queries based on user's role and location
    const queryPromises: Promise<any[]>[] = [];

    // 1. GLOBAL circulars — everyone sees these
    queryPromises.push(
        getDocs(query(
            circularsRef,
            where('is_active', '==', true),
            where('visibility_level', '==', 'GLOBAL'),
            ...(normalizedPrefix
                ? [where('title', '>=', normalizedPrefix), where('title', '<=', `${normalizedPrefix}\uf8ff`), orderBy('title')]
                : [orderBy('created_at', 'desc')]),
            limit(100),
        )).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 2. DISTRICT circulars — if user has a district
    if (userDistrictId) {
        queryPromises.push(
            getDocs(query(
                circularsRef,
                where('is_active', '==', true),
                where('visibility_level', '==', 'DISTRICT'),
                where('district_id', '==', userDistrictId),
                ...(normalizedPrefix
                    ? [where('title', '>=', normalizedPrefix), where('title', '<=', `${normalizedPrefix}\uf8ff`), orderBy('title')]
                    : [orderBy('created_at', 'desc')]),
                limit(100),
            )).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }

    // 3. SCHOOL circulars — only for TEACHER/HEADMASTER with a school
    const upperRole = userRole.toUpperCase().replace(/-/g, '_');
    if (userSchoolId && (upperRole === 'TEACHER' || upperRole === 'HEADMASTER')) {
        queryPromises.push(
            getDocs(query(
                circularsRef,
                where('is_active', '==', true),
                where('school_ids', 'array-contains', userSchoolId),
                ...(normalizedPrefix
                    ? [where('title', '>=', normalizedPrefix), where('title', '<=', `${normalizedPrefix}\uf8ff`), orderBy('title')]
                    : [orderBy('created_at', 'desc')]),
                limit(100),
            )).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
    }

    // Run all queries in parallel
    const results = await Promise.all(queryPromises);

    // Merge & deduplicate
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const docs of results) {
        for (const doc of docs) {
            if (seen.has(doc.id)) continue;
            seen.add(doc.id);

            // Client-side target_roles filter for SCHOOL-level circulars
            if (doc.visibility_level === 'SCHOOL') {
                const roles: string[] = doc.target_roles ?? [];
                if (roles.length > 0 && !roles.includes(upperRole)) continue;
            }

            merged.push(doc);
        }
    }

    // Sort by created_at desc
    merged.sort((a, b) => {
        const aTime = a.created_at?.toDate?.() ?? (a.created_at?.seconds ? new Date(a.created_at.seconds * 1000) : new Date(a.created_at));
        const bTime = b.created_at?.toDate?.() ?? (b.created_at?.seconds ? new Date(b.created_at.seconds * 1000) : new Date(b.created_at));
        return bTime.getTime() - aTime.getTime();
    });

    // Apply cursor-based pagination (cursor = last circular ID)
    let startIndex = 0;
    if (cursor) {
        const cursorIndex = merged.findIndex(d => d.id === cursor);
        if (cursorIndex >= 0) {
            startIndex = cursorIndex + 1;
        }
    }

    const paged = merged.slice(startIndex);
    const hasMore = paged.length > pageSize;
    const circulars = paged.slice(0, pageSize);
    const nextCursor = circulars.length > 0 ? circulars[circulars.length - 1].id : null;

    return {
        circulars,
        nextCursor: hasMore ? nextCursor : null,
        hasMore,
    };
}

/**
 * Fetch circulars visible to a user based on their role and location.
 * Non-paginated version.
 */
export async function getCirculars(
    userRole: string,
    userDistrictId: string | null,
    userSchoolId: string | null,
): Promise<any[]> {
    const result = await getCircularsPaginated(userRole, userDistrictId, userSchoolId, 200);
    return result.circulars;
}

// ── User-targeted Invitation Notices ──

export interface InvitationNotice {
    id: string;
    recipient_id: string;
    title: string;
    content: string;
    venue: string | null;
    event_time: string | null;
    event_date: any;
    file_url: string | null;
    file_name: string | null;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    reject_reason: string | null;
    created_at: any;
}

/** Fetch invitation notices targeted to a specific user using denormalized data. */
export async function getUserInvitations(userId: string): Promise<InvitationNotice[]> {
    // Query notice_recipients directly — all notice fields are denormalized
    const snap = await getDocs(
        query(
            collection(db, 'notice_recipients'),
            where('user_id', '==', userId),
            where('notice_type', '==', 'INVITATION'),
            orderBy('created_at', 'desc'),
        )
    );

    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: data.notice_id,
            recipient_id: d.id,
            title: data.notice_title ?? '',
            content: data.content ?? '',
            venue: data.venue ?? null,
            event_time: data.event_time ?? null,
            event_date: data.event_date?.toDate?.() ? data.event_date.toDate().toISOString() : data.event_date ?? null,
            file_url: data.file_url ?? null,
            file_name: data.file_name ?? null,
            status: (data.status ?? 'PENDING') as InvitationNotice['status'],
            reject_reason: data.reject_reason ?? null,
            created_at: data.created_at?.toDate?.() ? data.created_at.toDate().toISOString() : data.created_at ?? null,
        };
    });
}

/** Accept an invitation. */
export async function acceptInvitation(recipientId: string): Promise<void> {
    const ref = doc(db, 'notice_recipients', recipientId);
    await updateDoc(ref, {
        status: 'ACCEPTED',
        reject_reason: null,
        responded_at: serverTimestamp(),
    });

    await createAuditLog({
        action: 'INVITATION_ACCEPTED',
        entity_type: 'Notice',
        entity_id: recipientId,
    });
}

/** Reject an invitation with a reason. */
export async function rejectInvitation(recipientId: string, reason: string): Promise<void> {
    const ref = doc(db, 'notice_recipients', recipientId);
    await updateDoc(ref, {
        status: 'REJECTED',
        reject_reason: reason.slice(0, 500),
        responded_at: serverTimestamp(),
    });

    await createAuditLog({
        action: 'INVITATION_REJECTED',
        entity_type: 'Notice',
        entity_id: recipientId,
    });
}

/** Fetch a single notice by ID. */
export async function getNoticeById(noticeId: string): Promise<any | null> {
    const snap = await getDoc(doc(db, 'notices', noticeId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Resolve a file_url (Firebase Storage path or full URL) to a download URL.
 * If it's already a full URL, returns as-is.
 */
export async function getNoticeFileURL(fileKey: string): Promise<string> {
    if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
        return fileKey;
    }
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, fileKey);
    return getDownloadURL(storageRef);
}
