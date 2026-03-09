/**
 * Notices — Firestore Data Access Layer (Client-Side)
 *
 * Provides all CRUD operations for the `notices` and `notice_recipients`
 * Firestore collections. Handles file upload to Firebase Storage.
 *
 * Collection: `notices`
 * Sub-collection (M2M): `notice_recipients` (notice_id ↔ user_id)
 *
 */

"use client";

import {
    collection,
    doc,
    documentId,
    query,
    orderBy,
    limit as queryLimit,
    getDocs,
    getDoc,
    getCountFromServer,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    where,
    DocumentData,
    Timestamp,
    writeBatch,
    QueryConstraint,
    startAfter,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase";
import { devDelay } from "@/lib/dev-delay";
import type { Notice, NoticeType, NoticesFilters } from "@/services/notices.service";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

// ────────────────────── Helpers ──────────────────────

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

/** Transform a Firestore document into a Notice */
function toNotice(docId: string, data: DocumentData): Notice {
    return {
        id: docId,
        title: data.title ?? "",
        content: data.content ?? "",
        type: data.type ?? "GENERAL",
        subject: data.subject ?? null,
        venue: data.venue ?? null,
        event_time: data.event_time ?? null,
        event_date: data.event_date ? toIso(data.event_date) : null,
        published_at: data.published_at ? toIso(data.published_at) : null,
        expires_at: data.expires_at ? toIso(data.expires_at) : null,
        is_active: data.is_active ?? true,
        is_targeted: data.is_targeted ?? false,
        school_id: data.school_id ?? null,
        created_by: data.created_by ?? null,
        file_url: data.file_url ?? null,
        file_name: data.file_name ?? null,
        created_at: toIso(data.created_at),
        updated_at: toIso(data.updated_at),
        // Denormalized names
        school: data.school_name
            ? { id: data.school_id ?? "", name: data.school_name }
            : null,
        creator: data.creator_name
            ? { id: data.created_by ?? "", name: data.creator_name, email: data.creator_email ?? "" }
            : null,
        _count: data._count ?? undefined,
    };
}

// ────────────────────── File Helpers ──────────────────────

/**
 * Upload a file to Firebase Storage under `notices/`.
 * Returns the storage path (fileKey) and original file name.
 */
export async function uploadFile(file: File): Promise<{ fileKey: string; fileName: string }> {
    await waitForAuthReady();
    const storage = getFirebaseStorage();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `notices/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);

    return { fileKey: storagePath, fileName: file.name };
}

/**
 * Get a public download URL for a file stored in Firebase Storage.
 * If the key is already a full URL (legacy data), returns it as-is.
 */
export async function getFileURL(fileKey: string): Promise<string> {
    await waitForAuthReady();
    if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
        return fileKey;
    }
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, fileKey);
    return getDownloadURL(storageRef);
}

// ────────────────────── Lookup Helpers ──────────────────────

async function getUserName(userId: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().name ?? null) : null;
}

async function getUserEmail(userId: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().email ?? null) : null;
}

async function getSchoolName(schoolId: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "schools", schoolId));
    return snap.exists() ? (snap.data().name ?? null) : null;
}

// ────────────────────── Firestore API ──────────────────────

export const noticeFirestore = {
    /**
     * Fetch notices with cursor-based pagination.
     * Ordered by created_at desc.
     *
     * When search is provided, runs server-side exact-match query on `title`.
     * The admin is expected to enter the full notice title.
     *
     * @param filters Optional filters (type, search)
     * @param limit   Page size (default 50)
     * @param cursor  JSON string `{ts, id}` of the last document (null for first page)
     */
    async getAll(
        filters?: NoticesFilters,
        limit = 50,
        cursor?: string | null
    ): Promise<{ data: Notice[]; total: number; hasMore: boolean; nextCursor: string | null }> {
        await waitForAuthReady();
        await devDelay("read", "notices.getAll");
        const db = getFirebaseFirestore();
        const noticesCol = collection(db, "notices");

        // ── Server-side search: exact match on title ──
        if (filters?.search?.trim()) {
            const s = filters.search.trim();
            const searchConstraints: QueryConstraint[] = [
                where("is_active", "==", true),
            ];
            if (filters?.type) searchConstraints.push(where("type", "==", filters.type));

            const titleSnap = await getDocs(
                query(noticesCol, ...searchConstraints, where("title", "==", s), orderBy("created_at", "desc"))
            );

            const data = titleSnap.docs.map((d) => toNotice(d.id, d.data()));
            return { data, total: data.length, hasMore: false, nextCursor: null };
        }

        // ── No search: cursor-based pagination ──

        // Total count of active notices (with type filter for accurate count)
        const countConstraints: QueryConstraint[] = [where("is_active", "==", true)];
        if (filters?.type) countConstraints.push(where("type", "==", filters.type));
        const countQ = query(noticesCol, ...countConstraints);
        const countSnap = await getCountFromServer(countQ);
        const total = countSnap.data().count;

        // Build query
        const constraints: QueryConstraint[] = [
            where("is_active", "==", true),
            orderBy("created_at", "desc"),
        ];

        // Type filter
        if (filters?.type) {
            constraints.unshift(where("type", "==", filters.type));
        }

        // Compound cursor (timestamp + docId)
        if (cursor) {
            try {
                const { ts, id } = JSON.parse(cursor);
                constraints.push(startAfter(Timestamp.fromDate(new Date(ts)), id));
            } catch {
                constraints.push(startAfter(Timestamp.fromDate(new Date(cursor))));
            }
        }

        // Fetch one extra to detect hasMore
        constraints.push(queryLimit(limit + 1));

        const q = query(noticesCol, ...constraints);
        const snapshot = await getDocs(q);

        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
        const data = docs.map((d) => toNotice(d.id, d.data()));

        const lastDoc = docs[docs.length - 1];
        const nextCursor = lastDoc
            ? JSON.stringify({ ts: toIso(lastDoc.data().created_at), id: lastDoc.id })
            : null;

        return { data, total, hasMore, nextCursor };
    },

    /**
     * Get all notices using cursor-based pagination (matches the old getAllCursor API).
     */
    async getAllCursor(
        filters?: NoticesFilters,
        limit = 50,
        cursor?: string
    ): Promise<{ data: Notice[]; total: number; nextCursor: string | null; hasMore: boolean }> {
        await waitForAuthReady();
        return this.getAll(filters, limit, cursor ?? null);
    },

    /**
     * Get a single notice by ID, including its recipients.
     */
    async getById(id: string): Promise<Notice> {
        await waitForAuthReady();
        await devDelay("read", "notices.getById");
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, "notices", id));
        if (!snap.exists()) throw new Error("Notice not found");

        const notice = toNotice(snap.id, snap.data());

        // Load recipients
        const recipientsQ = query(
            collection(db, "notice_recipients"),
            where("notice_id", "==", id)
        );
        const recipientsSnap = await getDocs(recipientsQ);

        if (recipientsSnap.docs.length > 0) {
            const recipients = await Promise.all(
                recipientsSnap.docs.map(async (rDoc) => {
                    const rData = rDoc.data();
                    const userId = rData.user_id;
                    const userSnap = await getDoc(doc(db, "users", userId));
                    const userData = userSnap.exists() ? userSnap.data() : {};
                    return {
                        user: {
                            id: userId,
                            name: userData?.name ?? "Unknown",
                            email: userData?.email ?? null,
                            phone: userData?.phone ?? "",
                            role: userData?.role ?? "",
                        },
                        is_read: rData.is_read ?? false,
                        read_at: rData.read_at ? toIso(rData.read_at) : null,
                        status: rData.status ?? "PENDING",
                        reject_reason: rData.reject_reason ?? null,
                        responded_at: rData.responded_at ? toIso(rData.responded_at) : null,
                    };
                })
            );
            notice.recipients = recipients;
            notice._count = { recipients: recipients.length };
        }

        return notice;
    },

    /**
     * Create a new notice.
     */
    async create(
        userId: string,
        payload: {
            title: string;
            content: string;
            type?: string;
            subject?: string;
            venue?: string;
            event_time?: string;
            event_date?: string;
            expires_at?: string;
            school_id?: string;
            file_url?: string;
            file_name?: string;
        }
    ): Promise<Notice> {
        await waitForAuthReady();
        await devDelay("write", "notices.create");
        const db = getFirebaseFirestore();

        // Resolve denormalized names
        const [creatorName, creatorEmail, schoolName] = await Promise.all([
            getUserName(userId),
            getUserEmail(userId),
            payload.school_id ? getSchoolName(payload.school_id) : null,
        ]);

        const noticeData: Record<string, unknown> = {
            title: payload.title,
            content: payload.content,
            type: payload.type ?? "GENERAL",
            subject: payload.subject ?? null,
            venue: payload.venue ?? null,
            event_time: payload.event_time ?? null,
            event_date: payload.event_date
                ? Timestamp.fromDate(new Date(payload.event_date))
                : null,
            expires_at: payload.expires_at
                ? Timestamp.fromDate(new Date(payload.expires_at))
                : null,
            is_active: true,
            is_targeted: false,
            school_id: payload.school_id ?? null,
            created_by: userId,
            file_url: payload.file_url ?? null,
            file_name: payload.file_name ?? null,
            // Denormalized
            creator_name: creatorName,
            creator_email: creatorEmail,
            school_name: schoolName,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "notices"), noticeData);

        // Audit log
        await addDoc(collection(db, "audit_logs"), {
            user_id: userId,
            action: "NOTICE_CREATED",
            entity_type: "Notice",
            entity_id: docRef.id,
            ip_address: null,
            created_at: serverTimestamp(),
        });

        return toNotice(docRef.id, {
            ...noticeData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    },

    /**
     * Update an existing notice.
     */
    async update(
        id: string,
        payload: {
            title?: string;
            content?: string;
            type?: string;
            subject?: string;
            venue?: string;
            event_time?: string;
            event_date?: string;
            expires_at?: string;
            is_active?: boolean;
            school_id?: string;
            file_url?: string;
            file_name?: string;
        }
    ): Promise<Notice> {
        await waitForAuthReady();
        await devDelay("write", "notices.update");
        const db = getFirebaseFirestore();
        const noticeRef = doc(db, "notices", id);
        const snap = await getDoc(noticeRef);
        if (!snap.exists()) throw new Error("Notice not found");

        const updateData: Record<string, unknown> = {
            ...payload,
            updated_at: serverTimestamp(),
        };

        // Convert date fields to Timestamps
        if (payload.event_date) {
            updateData.event_date = Timestamp.fromDate(new Date(payload.event_date));
        }
        if (payload.expires_at) {
            updateData.expires_at = Timestamp.fromDate(new Date(payload.expires_at));
        }

        // Update school name if school_id changed
        if (payload.school_id) {
            updateData.school_name = await getSchoolName(payload.school_id);
        }

        await updateDoc(noticeRef, updateData);

        const updated = await getDoc(noticeRef);
        return toNotice(id, updated.data()!);
    },

    /**
     * Delete a notice and its recipients.
     */
    async delete(id: string): Promise<{ success: boolean; message: string }> {
        await waitForAuthReady();
        await devDelay("write", "notices.delete");
        const db = getFirebaseFirestore();
        const noticeRef = doc(db, "notices", id);
        const snap = await getDoc(noticeRef);
        if (!snap.exists()) throw new Error("Notice not found");

        // Delete associated recipients
        const recipientsQ = query(
            collection(db, "notice_recipients"),
            where("notice_id", "==", id)
        );
        const recipientsSnap = await getDocs(recipientsQ);

        if (recipientsSnap.docs.length > 0) {
            const batch = writeBatch(db);
            recipientsSnap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }

        await deleteDoc(noticeRef);

        return { success: true, message: "Notice deleted successfully" };
    },

    /**
     * Toggle the active status of a notice.
     */
    async toggleActive(id: string): Promise<Notice> {
        await waitForAuthReady();
        await devDelay("write", "notices.toggleActive");
        const db = getFirebaseFirestore();
        const noticeRef = doc(db, "notices", id);
        const snap = await getDoc(noticeRef);
        if (!snap.exists()) throw new Error("Notice not found");

        const currentActive = snap.data().is_active ?? true;
        await updateDoc(noticeRef, {
            is_active: !currentActive,
            updated_at: serverTimestamp(),
        });

        const updated = await getDoc(noticeRef);
        return toNotice(id, updated.data()!);
    },

    /**
     * Send a notice to specific users.
     * Creates a targeted notice + notice_recipients docs.
     */
    async sendNotice(
        userId: string,
        payload: {
            user_ids: string[];
            title: string;
            message: string;
            type?: string;
            subject?: string;
            venue?: string;
            event_time?: string;
            event_date?: string;
            file_url?: string;
            file_name?: string;
            file_size?: number;
        }
    ): Promise<{ success: boolean; message: string }> {
        await waitForAuthReady();
        await devDelay("write", "notices.sendNotice");
        const db = getFirebaseFirestore();

        // Resolve denormalized names
        const [creatorName, creatorEmail] = await Promise.all([
            getUserName(userId),
            getUserEmail(userId),
        ]);

        const noticeData: Record<string, unknown> = {
            title: payload.title,
            content: payload.message,
            type: payload.type ?? "GENERAL",
            subject: payload.subject ?? null,
            venue: payload.venue ?? null,
            event_time: payload.event_time ?? null,
            event_date: payload.event_date
                ? Timestamp.fromDate(new Date(payload.event_date))
                : null,
            is_active: true,
            is_targeted: true,
            created_by: userId,
            file_url: payload.file_url ?? null,
            file_name: payload.file_name ?? null,
            // Denormalized
            creator_name: creatorName,
            creator_email: creatorEmail,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        };

        const noticeRef = await addDoc(collection(db, "notices"), noticeData);

        // Resolve user names for denormalization
        const userNames = new Map<string, string>();
        await Promise.all(
            payload.user_ids.map(async (uid) => {
                const name = await getUserName(uid);
                userNames.set(uid, name ?? "Unknown");
            })
        );

        // Create recipient docs with denormalized notice + user fields
        const batch = writeBatch(db);
        for (const uid of payload.user_ids) {
            const recipientRef = doc(collection(db, "notice_recipients"));
            batch.set(recipientRef, {
                notice_id: noticeRef.id,
                user_id: uid,
                is_read: false,
                read_at: null,
                status: "PENDING",
                reject_reason: null,
                responded_at: null,
                // Denormalized fields
                user_name: userNames.get(uid) ?? "Unknown",
                notice_title: payload.title,
                notice_content: payload.message,
                notice_type: payload.type ?? "GENERAL",
                venue: payload.venue ?? null,
                event_time: payload.event_time ?? null,
                event_date: payload.event_date
                    ? Timestamp.fromDate(new Date(payload.event_date))
                    : null,
                file_url: payload.file_url ?? null,
                file_name: payload.file_name ?? null,
                created_at: serverTimestamp(),
            });
        }
        await batch.commit();

        // Audit log
        await addDoc(collection(db, "audit_logs"), {
            user_id: userId,
            action: "NOTICE_SENT",
            entity_type: "Notice",
            entity_id: noticeRef.id,
            ip_address: null,
            created_at: serverTimestamp(),
        });

        return {
            success: true,
            message: `Notice sent to ${payload.user_ids.length} user${payload.user_ids.length === 1 ? "" : "s"} successfully`,
        };
    },

    /**
     * Get all unique INVITATION notice titles (for the filter dropdown).
     * Lightweight query — only fetches active invitation notices.
     */
    async getInvitationNoticeTitles(): Promise<string[]> {
        await waitForAuthReady();
        const db = getFirebaseFirestore();
        const noticesQ = query(
            collection(db, "notices"),
            where("type", "==", "INVITATION"),
            where("is_active", "==", true),
            orderBy("created_at", "desc")
        );
        const snap = await getDocs(noticesQ);
        const titles: string[] = [];
        for (const d of snap.docs) {
            const t = d.data().title ?? "";
            if (t && !titles.includes(t)) titles.push(t);
        }
        return titles;
    },

    /**
     * Get invitation notices with their recipients (flattened: one row per recipient).
     *
     * **True server-side cursor pagination** on `notice_recipients`:
     * - Queries `notice_recipients` directly using denormalized fields.
     * - Filters by `notice_type == INVITATION` on the recipients collection.
     * - Applies server-side `where("status", …)` when a status filter is set.
     * - Search filters by denormalized `notice_title`.
     * - No need to fetch notices or users — all data is on the recipient doc.
     */
    async getInvitations(
        filters?: { search?: string; status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' },
        limit = 50,
        cursor?: string | null
    ): Promise<{
        data: Array<{
            notice_id: string;
            recipient_id: string;
            user_id: string;
            user_name: string;
            title: string;
            venue: string | null;
            event_time: string | null;
            event_date: string | null;
            file_url: string | null;
            file_name: string | null;
            status: string;
            reject_reason: string | null;
            responded_at: string | null;
            created_at: string;
        }>;
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
    }> {
        await waitForAuthReady();
        await devDelay("read", "notices.getInvitations");
        const db = getFirebaseFirestore();
        const recipientsCol = collection(db, "notice_recipients");

        // ── Build constraints: always scope to INVITATION type (denormalized) ──
        const baseConstraints: QueryConstraint[] = [
            where("notice_type", "==", "INVITATION"),
        ];

        // Status filter
        if (filters?.status) {
            baseConstraints.push(where("status", "==", filters.status));
        }

        // Search by denormalized notice_title (exact match)
        if (filters?.search?.trim()) {
            baseConstraints.push(where("notice_title", "==", filters.search.trim()));
        }

        // ── Total count ──
        const countQ = query(recipientsCol, ...baseConstraints);
        const countSnap = await getCountFromServer(countQ);
        const total = countSnap.data().count;

        if (total === 0) {
            return { data: [], total: 0, hasMore: false, nextCursor: null };
        }

        // ── Cursor ──
        const cursorConstraints: QueryConstraint[] = [];
        if (cursor) {
            try {
                const { ts, id } = JSON.parse(cursor);
                cursorConstraints.push(startAfter(Timestamp.fromDate(new Date(ts)), id));
            } catch {
                // ignore bad cursor
            }
        }

        // ── Fetch the page — single clean query on notice_recipients ──
        const pageQ = query(
            recipientsCol,
            ...baseConstraints,
            orderBy("created_at", "desc"),
            orderBy(documentId()),
            ...cursorConstraints,
            queryLimit(limit + 1)
        );
        const snap = await getDocs(pageQ);

        const hasMore = snap.docs.length > limit;
        const pageDocs = hasMore ? snap.docs.slice(0, limit) : snap.docs;

        // ── Build rows directly from denormalized fields ──
        const data = pageDocs.map((d) => {
            const r = d.data();
            return {
                notice_id: r.notice_id,
                recipient_id: d.id,
                user_id: r.user_id,
                user_name: r.user_name ?? "Unknown",
                title: r.notice_title ?? "",
                venue: r.venue ?? null,
                event_time: r.event_time ?? null,
                event_date: r.event_date ? toIso(r.event_date) : null,
                file_url: r.file_url ?? null,
                file_name: r.file_name ?? null,
                status: r.status ?? "PENDING",
                reject_reason: r.reject_reason ?? null,
                responded_at: r.responded_at ? toIso(r.responded_at) : null,
                created_at: toIso(r.created_at),
            };
        });

        // ── Compute next cursor ──
        const lastDoc = pageDocs[pageDocs.length - 1];
        const nextCursor = hasMore && lastDoc
            ? JSON.stringify({ ts: toIso(lastDoc.data().created_at), id: lastDoc.id })
            : null;

        return { data, total, hasMore, nextCursor };
    },

    /**
     * Delete a specific invitation recipient (remove from notice_recipients).
     */
    async deleteInvitationRecipient(recipientId: string): Promise<{ success: boolean; message: string }> {
        await waitForAuthReady();
        await devDelay("write", "notices.deleteInvitationRecipient");
        const db = getFirebaseFirestore();
        await deleteDoc(doc(db, "notice_recipients", recipientId));
        return { success: true, message: "Invitation recipient removed" };
    },
};
