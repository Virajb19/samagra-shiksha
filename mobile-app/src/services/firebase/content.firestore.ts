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
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';

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

/**
 * Fetch user-scoped notices with cursor-based pagination.
 *
 * 1. Uses recipientMap (noticeId → RecipientInfo) from getUserRecipientMap.
 * 2. Queries 'notices' ordered by created_at desc with limit + startAfter.
 * 3. Filters to only notices the user is a recipient of.
 * 4. Merges recipient data (recipient_id, status, reject_reason) into each notice.
 */
export async function getUserNoticesPaginated(
    userId: string,
    recipientMap: Map<string, RecipientInfo>,
    pageSize: number = NOTICES_PAGE_SIZE,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<PaginatedNoticesResult> {
    if (recipientMap.size === 0) {
        return { notices: [], lastDoc: null, hasMore: false };
    }

    const result: any[] = [];
    let cursor: QueryDocumentSnapshot<DocumentData> | null = lastDocSnapshot ?? null;
    let hasMore = true;
    // Over-fetch factor: we fetch more from Firestore since not all will match
    const fetchSize = pageSize * 3;

    const noticesRef = collection(db, 'notices');

    while (result.length < pageSize && hasMore) {
        const q = cursor
            ? query(
                  noticesRef,
                  orderBy('created_at', 'desc'),
                  startAfter(cursor),
                  limit(fetchSize),
              )
            : query(
                  noticesRef,
                  orderBy('created_at', 'desc'),
                  limit(fetchSize),
              );

        const snap = await getDocs(q);

        if (snap.empty) {
            hasMore = false;
            break;
        }

        for (const d of snap.docs) {
            const recipient = recipientMap.get(d.id);
            if (recipient) {
                result.push({
                    id: d.id,
                    ...serializeTimestamps(d.data()),
                    recipient_id: recipient.recipientId,
                    recipient_status: recipient.status,
                    reject_reason: recipient.reject_reason,
                });
            }
        }

        cursor = snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData>;

        // If we got fewer docs than fetchSize, there are no more in Firestore
        if (snap.docs.length < fetchSize) {
            hasMore = false;
        }
    }

    return {
        notices: result.slice(0, pageSize),
        lastDoc: cursor,
        hasMore: hasMore || result.length > pageSize,
    };
}

/**
 * Fetch all notice_recipient data for a user.
 * Returns a Map of noticeId → RecipientInfo.
 * This is called once and cached by React Query.
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

/** Fetch invitation notices targeted to a specific user. */
export async function getUserInvitations(userId: string): Promise<InvitationNotice[]> {
    // 1. Get all notice_recipients for this user
    const recipientsSnap = await getDocs(
        query(collection(db, 'notice_recipients'), where('user_id', '==', userId))
    );

    if (recipientsSnap.empty) return [];

    // 2. Collect notice_ids
    const recipientMap = new Map<string, { recipientId: string; status: string; reject_reason: string | null }>();
    for (const d of recipientsSnap.docs) {
        const data = d.data();
        recipientMap.set(data.notice_id, {
            recipientId: d.id,
            status: data.status ?? 'PENDING',
            reject_reason: data.reject_reason ?? null,
        });
    }

    // 3. Fetch the actual notices (Firestore 'in' max 30)
    const noticeIds = Array.from(recipientMap.keys());
    const results: InvitationNotice[] = [];

    const chunks: string[][] = [];
    for (let i = 0; i < noticeIds.length; i += 30) {
        chunks.push(noticeIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        const noticesSnap = await getDocs(
            query(
                collection(db, 'notices'),
                where('__name__', 'in', chunk),
                where('type', '==', 'INVITATION'),
            )
        );
        for (const d of noticesSnap.docs) {
            const data = d.data();
            const recipient = recipientMap.get(d.id);
            if (!recipient) continue;
            results.push({
                id: d.id,
                recipient_id: recipient.recipientId,
                title: data.title ?? '',
                content: data.content ?? '',
                venue: data.venue ?? null,
                event_time: data.event_time ?? null,
                event_date: data.event_date?.toDate?.() ? data.event_date.toDate().toISOString() : data.event_date ?? null,
                file_url: data.file_url ?? null,
                file_name: data.file_name ?? null,
                status: recipient.status as InvitationNotice['status'],
                reject_reason: recipient.reject_reason,
                created_at: data.created_at?.toDate?.() ? data.created_at.toDate().toISOString() : data.created_at ?? null,
            });
        }
    }

    // Sort by created_at desc
    results.sort((a, b) => {
        const aTs = new Date(a.created_at ?? 0).getTime();
        const bTs = new Date(b.created_at ?? 0).getTime();
        return bTs - aTs;
    });

    return results;
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
