/**
 * Audit Logs — Firestore Data Access Layer (Client-Side)
 *
 * Provides all CRUD operations for the `audit_logs` Firestore collection.
 * Used by React Query hooks in `audit-logs.service.ts` and any component
 * that needs to read or write audit log entries.
 *
 * Collection: `audit_logs`
 * Fields:
 *   - id:          string   — Auto-generated document ID
 *   - user_id:     string   — ID of the user who performed the action
 *   - action:      string   — Action type (e.g. USER_LOGIN, TASK_CREATED)
 *   - entity_type: string   — Entity type affected (e.g. User, Task, Faculty)
 *   - entity_id:   string   — ID of the affected entity
 *   - ip_address:  string   — IP address of the requester
 *   - created_at:  Timestamp — Server timestamp when the log was created
 */

"use client";

import {
    collection,
    query,
    orderBy,
    limit as queryLimit,
    getDocs,
    getCountFromServer,
    addDoc,
    serverTimestamp,
    startAfter,
    QueryDocumentSnapshot,
    QueryConstraint,
    DocumentData,
    Timestamp,
    where,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { devDelay } from "@/lib/dev-delay";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

// ────────────────────── Types ──────────────────────

export interface AuditLogEntry {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    ip_address: string | null;
    created_at: string;
}

export interface AuditLogsResponse {
    data: AuditLogEntry[];
    total: number;
    hasMore: boolean;
}

export interface CursorAuditLogsResponse {
    data: AuditLogEntry[];
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
}

export interface CreateAuditLogInput {
    user_id?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    ip_address?: string | null;
}

// ────────────────────── Helpers ──────────────────────

/** Safely convert a Firestore Timestamp (or any date-like value) to ISO string */
function toIso(value: unknown): string {
    if (!value) return new Date().toISOString();

    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();

    // Firestore Timestamp object
    if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof (value as { toDate: () => Date }).toDate === "function"
    ) {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }

    // Raw seconds/nanoseconds object
    if (typeof value === "object" && value !== null && "seconds" in value) {
        return new Date(((value as { seconds: number }).seconds ?? 0) * 1000).toISOString();
    }

    return new Date().toISOString();
}

/** Transform a Firestore document into an AuditLogEntry */
function toAuditLog(docId: string, data: DocumentData): AuditLogEntry {
    return {
        id: docId,
        action: data.action ?? "",
        entity_type: data.entity_type ?? "",
        entity_id: data.entity_id ?? null,
        user_id: data.user_id ?? null,
        ip_address: data.ip_address ?? null,
        created_at: toIso(data.created_at),
    };
}

// ────────────────────── Firestore API ──────────────────────

export const auditLogsFirestore = {
    /**
     * Fetch audit logs with offset-based pagination.
     * Ordered by `created_at` descending (newest first).
     *
     * @param limit  Max number of logs to return (default: 100)
     * @param offset Number of logs to skip (default: 0)
     */
    async getAll(limit = 100, offset = 0): Promise<AuditLogsResponse> {
        await waitForAuthReady();
        await devDelay('read', 'auditLogs.getAll');
        const db = getFirebaseFirestore();
        const logsCollection = collection(db, "audit_logs");

        // Get total count for pagination metadata
        const countSnap = await getCountFromServer(logsCollection);
        const total = countSnap.data().count;

        // Fetch the requested page
        // Note: Firestore doesn't natively support offset, so we fetch offset + limit
        // and discard the first `offset` results. For large offsets, cursor-based
        // pagination (startAfter) should be used instead.
        const q = query(
            logsCollection,
            orderBy("created_at", "desc"),
            queryLimit(offset + limit)
        );

        const snapshot = await getDocs(q);
        const allDocs = snapshot.docs.slice(offset);
        const data = allDocs.map((doc) => toAuditLog(doc.id, doc.data()));

        return {
            data,
            total,
            hasMore: offset + limit < total,
        };
    },

    /**
     * Fetch the N most recent audit logs.
     * Optimized for feeds and widgets — no offset, no total count.
     *
     * @param count Number of recent logs to fetch (default: 10)
     */
    async getRecent(count = 10): Promise<AuditLogEntry[]> {
        await waitForAuthReady();
        await devDelay('read', 'auditLogs.getRecent');
        const db = getFirebaseFirestore();
        const q = query(
            collection(db, "audit_logs"),
            orderBy("created_at", "desc"),
            queryLimit(count)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => toAuditLog(doc.id, doc.data()));
    },

    /**
     * Fetch audit logs using cursor-based pagination (DocumentSnapshot cursor).
     * More efficient than offset-based for large datasets.
     */
    async getCursorPage(
        pageSize = 50,
        lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
    ): Promise<{ data: AuditLogEntry[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
        await waitForAuthReady();
        await devDelay('read', 'auditLogs.getCursorPage');
        const db = getFirebaseFirestore();
        const constraints: QueryConstraint[] = [orderBy("created_at", "desc"), queryLimit(pageSize + 1)];

        if (lastDoc) {
            constraints.splice(1, 0, startAfter(lastDoc));
        }

        const q = query(collection(db, "audit_logs"), ...constraints);
        const snapshot = await getDocs(q);

        const hasMore = snapshot.docs.length > pageSize;
        const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

        return {
            data: docs.map((doc) => toAuditLog(doc.id, doc.data())),
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
            hasMore,
        };
    },

    /**
     * Fetch audit logs with serializable cursor-based pagination.
     * Uses compound cursor (timestamp + docId) for React Query compatibility.
     *
     * @param pageSize  Number of logs per page (default 50)
     * @param cursor    JSON string `{ts, id}` from previous page (undefined for first page)
     */
    async getAllCursor(
        pageSize = 50,
        cursor?: string
    ): Promise<CursorAuditLogsResponse> {
        await waitForAuthReady();
        await devDelay('read', 'auditLogs.getAllCursor');
        const db = getFirebaseFirestore();
        const logsCol = collection(db, "audit_logs");

        // Total count
        const countSnap = await getCountFromServer(logsCol);
        const total = countSnap.data().count;

        const constraints: QueryConstraint[] = [orderBy("created_at", "desc")];

        if (cursor) {
            try {
                const { ts, id } = JSON.parse(cursor);
                constraints.push(startAfter(Timestamp.fromDate(new Date(ts)), id));
            } catch {
                constraints.push(startAfter(Timestamp.fromDate(new Date(cursor))));
            }
        }

        constraints.push(queryLimit(pageSize + 1));

        const q = query(logsCol, ...constraints);
        const snapshot = await getDocs(q);

        const hasMore = snapshot.docs.length > pageSize;
        const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
        const data = docs.map((d) => toAuditLog(d.id, d.data()));

        const lastDoc = docs[docs.length - 1];
        const nextCursor = lastDoc
            ? JSON.stringify({ ts: toIso(lastDoc.data().created_at), id: lastDoc.id })
            : null;

        return { data, total, nextCursor, hasMore };
    },

    /**
     * Fetch audit logs filtered by action type.
     *
     * @param action Action type to filter by (e.g. 'USER_LOGIN')
     * @param limit  Max number of results
     */
    async getByAction(action: string, limit = 50): Promise<AuditLogEntry[]> {
        await waitForAuthReady();
        await devDelay('read', 'auditLogs.getByAction');
        const db = getFirebaseFirestore();
        const q = query(
            collection(db, "audit_logs"),
            where("action", "==", action),
            orderBy("created_at", "desc"),
            queryLimit(limit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => toAuditLog(doc.id, doc.data()));
    },

    /**
     * Create a new audit log entry.
     *
     * @param input Audit log data (action, entity_type, etc.)
     * @returns The created audit log entry
     */
    async create(input: CreateAuditLogInput): Promise<AuditLogEntry> {
        await waitForAuthReady();
        await devDelay('write', 'auditLogs.create');
        const db = getFirebaseFirestore();
        const docRef = await addDoc(collection(db, "audit_logs"), {
            ...input,
            user_id: input.user_id ?? null,
            entity_id: input.entity_id ?? null,
            ip_address: input.ip_address ?? null,
            created_at: serverTimestamp(),
        });

        return {
            id: docRef.id,
            action: input.action,
            entity_type: input.entity_type,
            entity_id: input.entity_id ?? null,
            user_id: input.user_id ?? null,
            ip_address: input.ip_address ?? null,
            created_at: new Date().toISOString(),
        };
    },

    /**
     * Get total count of audit logs.
     */
    async getCount(): Promise<number> {
        await waitForAuthReady();
        await devDelay('read', 'auditLogs.getCount');
        const db = getFirebaseFirestore();
        const snap = await getCountFromServer(collection(db, "audit_logs"));
        return snap.data().count;
    },
};
