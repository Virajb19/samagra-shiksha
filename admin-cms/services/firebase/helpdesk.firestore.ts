/**
 * Helpdesk — Firestore Data Access Layer (Client-Side)
 *
 * Provides all CRUD operations for the `helpdesk_tickets` Firestore collection.
 * Uses cursor-based pagination ordered by `created_at` desc.
 *
 * Collection: `helpdesk_tickets`
 *
 * @see Backend Reference: backend/src/helpdesk/helpdesk.service.ts
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
    updateDoc,
    deleteDoc,
    serverTimestamp,
    where,
    DocumentData,
    Timestamp,
    QueryConstraint,
    startAfter,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { devDelay } from "@/lib/dev-delay";
import { HelpdeskTicket } from "@/types";
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

/** Transform a Firestore document into a HelpdeskTicket */
function toTicket(docId: string, data: DocumentData): HelpdeskTicket {
    return {
        id: docId,
        user_id: data.user_id ?? "",
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        message: data.message ?? "",
        is_resolved: data.is_resolved ?? false,
        created_at: toIso(data.created_at),
        user: data.user_name
            ? {
                name: data.user_name,
                phone: data.user_phone ?? data.phone ?? "",
                email: data.user_email ?? undefined,
                role: data.user_role ?? "USER",
            }
            : undefined,
    };
}

// ────────────────────── Response Type ──────────────────────

export interface HelpdeskResponse {
    data: HelpdeskTicket[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
}

// ────────────────────── Firestore API ──────────────────────

export const helpdeskFirestore = {
    /**
     * Fetch helpdesk tickets with cursor-based pagination.
     * Ordered by created_at desc.
     *
     * When search is provided, runs server-side exact-match queries on
     * `full_name` and `phone` (Firestore has no partial/full-text search).
     * The admin is expected to enter the full name or phone number.
     *
     * @param limit   Page size (default 20)
     * @param cursor  JSON string `{ts, id}` of the last document (null for first page)
     * @param status  'pending' | 'resolved' | undefined (all)
     * @param search  Server-side exact-match search on full_name or phone
     */
    async getAll(
        limit = 20,
        cursor?: string | null,
        status?: string,
        search?: string
    ): Promise<HelpdeskResponse> {
        await waitForAuthReady();
        await devDelay("read", "helpdesk.getAll");
        const db = getFirebaseFirestore();
        const ticketsCol = collection(db, "helpdesk_tickets");

        // ── Server-side search: exact match on full_name or phone ──
        if (search?.trim()) {
            const s = search.trim();
            const statusConstraints: QueryConstraint[] = [];
            if (status === "pending") statusConstraints.push(where("is_resolved", "==", false));
            else if (status === "resolved") statusConstraints.push(where("is_resolved", "==", true));

            // Run parallel queries for each searchable field
            const [nameSnap, phoneSnap] = await Promise.all([
                getDocs(query(ticketsCol, where("full_name", "==", s), ...statusConstraints, orderBy("created_at", "desc"))),
                getDocs(query(ticketsCol, where("phone", "==", s), ...statusConstraints, orderBy("created_at", "desc"))),
            ]);

            // Merge & deduplicate
            const seen = new Set<string>();
            const data: HelpdeskTicket[] = [];
            for (const snap of [nameSnap, phoneSnap]) {
                for (const d of snap.docs) {
                    if (!seen.has(d.id)) {
                        seen.add(d.id);
                        data.push(toTicket(d.id, d.data()));
                    }
                }
            }

            return { data, total: data.length, hasMore: false, nextCursor: null };
        }

        // ── No search: cursor-based pagination ──

        // Total count (with status filter)
        const countConstraints: QueryConstraint[] = [];
        if (status === "pending") countConstraints.push(where("is_resolved", "==", false));
        else if (status === "resolved") countConstraints.push(where("is_resolved", "==", true));

        const countQ = countConstraints.length > 0
            ? query(ticketsCol, ...countConstraints)
            : ticketsCol;
        const countSnap = await getCountFromServer(countQ);
        const total = countSnap.data().count;

        // Build data query
        const constraints: QueryConstraint[] = [];
        if (status === "pending") constraints.push(where("is_resolved", "==", false));
        else if (status === "resolved") constraints.push(where("is_resolved", "==", true));

        constraints.push(orderBy("created_at", "desc"));

        // Compound cursor (timestamp + docId) to handle duplicate timestamps
        if (cursor) {
            try {
                const { ts, id } = JSON.parse(cursor);
                constraints.push(startAfter(Timestamp.fromDate(new Date(ts)), id));
            } catch {
                constraints.push(startAfter(Timestamp.fromDate(new Date(cursor))));
            }
        }

        constraints.push(queryLimit(limit + 1));

        const q = query(ticketsCol, ...constraints);
        const snapshot = await getDocs(q);

        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
        const data = docs.map((d) => toTicket(d.id, d.data()));

        const lastDoc = docs[docs.length - 1];
        const nextCursor = lastDoc
            ? JSON.stringify({ ts: toIso(lastDoc.data().created_at), id: lastDoc.id })
            : null;

        return { data, total, hasMore, nextCursor };
    },

    /**
     * Delete a helpdesk ticket.
     */
    async delete(ticketId: string): Promise<{ message: string }> {
        await waitForAuthReady();
        await devDelay("write", "helpdesk.delete");
        const db = getFirebaseFirestore();
        const ticketRef = doc(db, "helpdesk_tickets", ticketId);
        const snap = await getDoc(ticketRef);
        if (!snap.exists()) throw new Error("Ticket not found");

        await deleteDoc(ticketRef);
        return { message: "Ticket deleted successfully" };
    },

    /**
     * Mark a ticket as resolved.
     */
    async resolve(ticketId: string): Promise<HelpdeskTicket> {
        await waitForAuthReady();
        await devDelay("write", "helpdesk.resolve");
        const db = getFirebaseFirestore();
        const ticketRef = doc(db, "helpdesk_tickets", ticketId);
        const snap = await getDoc(ticketRef);
        if (!snap.exists()) throw new Error("Ticket not found");

        await updateDoc(ticketRef, {
            is_resolved: true,
            updated_at: serverTimestamp(),
        });

        const updated = await getDoc(ticketRef);
        return toTicket(ticketId, updated.data()!);
    },

    /**
     * Toggle ticket status between resolved and pending.
     */
    async toggleStatus(ticketId: string): Promise<HelpdeskTicket> {
        await waitForAuthReady();
        await devDelay("write", "helpdesk.toggleStatus");
        const db = getFirebaseFirestore();
        const ticketRef = doc(db, "helpdesk_tickets", ticketId);
        const snap = await getDoc(ticketRef);
        if (!snap.exists()) throw new Error("Ticket not found");

        const currentResolved = snap.data().is_resolved ?? false;
        await updateDoc(ticketRef, {
            is_resolved: !currentResolved,
            updated_at: serverTimestamp(),
        });

        const updated = await getDoc(ticketRef);
        return toTicket(ticketId, updated.data()!);
    },
};
