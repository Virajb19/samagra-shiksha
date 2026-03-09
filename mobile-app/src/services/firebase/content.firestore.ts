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
 * Supports server-side type filter via Firestore where clause.
 * Title search is applied client-side after fetch (Firestore doesn't support substring search).
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

    constraints.push(orderBy('created_at', 'desc'));

    if (lastDocSnapshot) {
        constraints.push(startAfter(lastDocSnapshot));
    }

    // Fetch extra when title search is active to compensate for client-side filtering
    const fetchSize = filters?.titleSearch ? pageSize * 3 : pageSize;
    constraints.push(limit(fetchSize + 1));

    const snap = await getDocs(query(recipientsRef, ...constraints));

    let allDocs = snap.docs;
    let hasMore = allDocs.length > fetchSize;
    if (hasMore) allDocs = allDocs.slice(0, fetchSize);

    let notices = allDocs.map((d) => {
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

    // Client-side title search (Firestore doesn't support substring match with orderBy on another field)
    if (filters?.titleSearch) {
        const q = filters.titleSearch.toLowerCase();
        notices = notices.filter((n) => n.title.toLowerCase().includes(q));
    }

    // Trim to page size after filtering
    if (notices.length > pageSize) {
        notices = notices.slice(0, pageSize);
        hasMore = true;
    }

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
}

/** Reject an invitation with a reason. */
export async function rejectInvitation(recipientId: string, reason: string): Promise<void> {
    const ref = doc(db, 'notice_recipients', recipientId);
    await updateDoc(ref, {
        status: 'REJECTED',
        reject_reason: reason.slice(0, 500),
        responded_at: serverTimestamp(),
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
