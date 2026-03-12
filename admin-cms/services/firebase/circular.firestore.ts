/**
 * Circulars — Firestore Data Access Layer (Client-Side)
 *
 * Provides all CRUD operations for the `circulars`
 * Firestore collection. Handles file upload to Firebase Storage,
 * circular number generation, and multi-school targeting.
 *
 * Collection: `circulars`
 * School targeting: `school_ids` array on circular docs
 *
 * @see Backend Reference: backend/src/circulars/circulars.service.ts
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
    addDoc,
    updateDoc,
    serverTimestamp,
    where,
    DocumentData,
    Timestamp,
    QueryConstraint,
    startAfter,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseFirestore, getFirebaseStorage } from "@/lib/firebase";
import { auditLogsFirestore } from "./audit-logs.firestore";
import { devDelay } from "@/lib/dev-delay";
import type { Circular, CreateCircularDto } from "@/types";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

// ────────────────────── Types ──────────────────────

export interface CircularsResponse {
    data: Circular[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
}

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

/** Transform a Firestore document into a Circular */
function toCircular(docId: string, data: DocumentData): Circular {
    return {
        id: docId,
        circular_no: data.circular_no ?? "",
        title: data.title ?? "",
        description: data.description ?? undefined,
        file_url: data.file_url ?? undefined,
        issued_by: data.issued_by ?? "",
        issued_date: toIso(data.issued_date),
        effective_date: data.effective_date ? toIso(data.effective_date) : undefined,
        is_active: data.is_active ?? true,
        visibility_level: data.visibility_level ?? "GLOBAL",
        district_id: data.district_id ?? undefined,
        school_id: data.school_id ?? undefined,
        school_ids: data.school_ids ?? [],
        target_roles: data.target_roles ?? [],
        target_subject: data.target_subject ?? undefined,
        created_by: data.created_by ?? undefined,
        created_at: toIso(data.created_at),
        updated_at: toIso(data.updated_at),
        // Denormalized names (populated separately if needed)
        district: data.district_name ? { name: data.district_name } : undefined,
        school: data.school_name ? { name: data.school_name } : undefined,
        creator: data.creator_name ? { name: data.creator_name } : undefined,
    };
}

/** Upload a file to Firebase Storage under `circulars/` and return the storage path */
async function uploadCircularFile(file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `circulars/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    return storagePath;
}

/** Generate the next circular number: CIRC/YYYY/0001 */
async function generateCircularNo(): Promise<string> {
    const db = getFirebaseFirestore();
    const year = new Date().getFullYear();
    const prefix = `CIRC/${year}/`;

    // Count existing circulars for this year
    const q = query(
        collection(db, "circulars"),
        where("circular_no", ">=", prefix),
        where("circular_no", "<=", prefix + "\uf8ff")
    );
    const snap = await getCountFromServer(q);
    const next = snap.data().count + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
}

/** Look up a district name by ID */
async function getDistrictName(districtId: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "districts", districtId));
    return snap.exists() ? (snap.data().name ?? null) : null;
}

/** Look up a school name by ID */
async function getSchoolName(schoolId: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "schools", schoolId));
    return snap.exists() ? (snap.data().name ?? null) : null;
}

/** Look up a user name by ID */
async function getUserName(userId: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().name ?? null) : null;
}

/** Resolve a file_url (storage path or legacy URL) to a download URL */
export async function resolveFileUrl(fileUrl: string): Promise<string> {
    await waitForAuthReady();
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        return fileUrl;
    }
    const storage = getFirebaseStorage();
    return getDownloadURL(ref(storage, fileUrl));
}

// ────────────────────── Firestore API ──────────────────────

export const circularFirestore = {
    /**
     * Fetch active circulars with cursor-based pagination.
     * Ordered by issued_date desc, then created_at desc.
     *
     * When search is provided, runs server-side exact-match queries on
     * `title` and `circular_no`. The admin enters the exact value.
     *
     * @param limit   Page size (default 20)
     * @param cursor  JSON string `{ts, ts2, id}` of the last document (null for first page)
     * @param search  Server-side exact-match search on title or circular_no
     */
    async getAll(
        limit = 20,
        cursor: string | null = null,
        search?: string
    ): Promise<CircularsResponse> {
        await waitForAuthReady();
        await devDelay("read", "circulars.getAll");
        const db = getFirebaseFirestore();
        const circularsCol = collection(db, "circulars");

        // ── Server-side search: exact match on title or circular_no ──
        if (search?.trim()) {
            const s = search.trim();
            const baseConstraints: QueryConstraint[] = [where("is_active", "==", true)];

            const [titleSnap, circularNoSnap] = await Promise.all([
                getDocs(query(circularsCol, ...baseConstraints, where("title", "==", s), orderBy("issued_date", "desc"))),
                getDocs(query(circularsCol, ...baseConstraints, where("circular_no", "==", s), orderBy("issued_date", "desc"))),
            ]);

            // Merge & deduplicate
            const seen = new Set<string>();
            const data: import("@/types").Circular[] = [];
            for (const snap of [titleSnap, circularNoSnap]) {
                for (const d of snap.docs) {
                    if (!seen.has(d.id)) {
                        seen.add(d.id);
                        data.push(toCircular(d.id, d.data()));
                    }
                }
            }

            return { data, total: data.length, hasMore: false, nextCursor: null };
        }

        // ── No search: cursor-based pagination ──

        // Total count of active circulars
        const countQ = query(circularsCol, where("is_active", "==", true));
        const countSnap = await getCountFromServer(countQ);
        const total = countSnap.data().count;

        // Build query with cursor-based pagination
        const constraints: QueryConstraint[] = [
            where("is_active", "==", true),
            orderBy("issued_date", "desc"),
            orderBy("created_at", "desc"),
        ];

        // Cursor must match the exact number/order of orderBy clauses.
        // We order by issued_date desc, created_at desc, so use exactly 2 values.
        if (cursor) {
            try {
                const parsed = JSON.parse(cursor) as { ts?: string; ts2?: string };
                if (parsed.ts && parsed.ts2) {
                    constraints.push(startAfter(
                        Timestamp.fromDate(new Date(parsed.ts)),
                        Timestamp.fromDate(new Date(parsed.ts2))
                    ));
                } else if (parsed.ts) {
                    constraints.push(startAfter(Timestamp.fromDate(new Date(parsed.ts))));
                }
            } catch {
                constraints.push(startAfter(Timestamp.fromDate(new Date(cursor))));
            }
        }

        // Fetch one extra to detect hasMore
        constraints.push(queryLimit(limit + 1));

        const q = query(circularsCol, ...constraints);
        const snapshot = await getDocs(q);

        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
        const data = docs.map((d) => toCircular(d.id, d.data()));

        const lastDoc = docs[docs.length - 1];
        const nextCursor = lastDoc
            ? JSON.stringify({
                ts: toIso(lastDoc.data().issued_date),
                ts2: toIso(lastDoc.data().created_at),
            })
            : null;

        return { data, total, hasMore, nextCursor };
    },


    /**
     * Get a single circular by ID.
     */
    async getById(circularId: string): Promise<Circular | null> {
        await waitForAuthReady();
        await devDelay("read", "circulars.getById");
        const db = getFirebaseFirestore();
        const snap = await getDoc(doc(db, "circulars", circularId));
        if (!snap.exists()) return null;
        return toCircular(snap.id, snap.data());
    },

    /**
     * Create a new circular, optionally uploading a file to Firebase Storage.
        * Supports multiple school targeting via `school_ids` array.
     */
    async create(
        userId: string,
        dto: CreateCircularDto,
        file?: File
    ): Promise<Circular> {
        await waitForAuthReady();
        await devDelay("write", "circulars.create");
        const db = getFirebaseFirestore();

        // 1. Upload file to Firebase Storage if provided
        let fileUrl: string | null = null;
        if (file) {
            console.log("[circularFirestore] Uploading file to Firebase Storage:", file.name);
            fileUrl = await uploadCircularFile(file);
            console.log("[circularFirestore] File uploaded:", fileUrl);
        }

        // 2. Generate circular number
        const circularNo = await generateCircularNo();

        // 3. Determine school IDs
        const schoolIds: string[] = dto.school_ids ?? [];
        const singleSchoolId = schoolIds.length === 1 ? schoolIds[0] : null;

        // 4. Compute visibility level and target roles
        let visibilityLevel: 'GLOBAL' | 'DISTRICT' | 'SCHOOL';
        let targetRoles: string[];

        if (!dto.district_id) {
            // No district → GLOBAL (all users, all roles)
            visibilityLevel = 'GLOBAL';
            targetRoles = [];
        } else if (schoolIds.length === 0) {
            // District selected but no schools → DISTRICT (all users in that district)
            visibilityLevel = 'DISTRICT';
            targetRoles = [];
        } else {
            // District + schools → SCHOOL level
            visibilityLevel = 'SCHOOL';
            if (dto.recipient_type === 'TEACHER') {
                targetRoles = ['TEACHER'];
            } else if (dto.recipient_type === 'HEADMASTER') {
                targetRoles = ['HEADMASTER'];
            } else {
                // ALL → both teachers and headmasters of selected schools
                targetRoles = ['TEACHER', 'HEADMASTER'];
            }
        }

        // 5. Resolve names for denormalization (step renumbered after visibility computation)
        const [districtName, schoolName, creatorName] = await Promise.all([
            dto.district_id ? getDistrictName(dto.district_id) : null,
            singleSchoolId ? getSchoolName(singleSchoolId) : null,
            getUserName(userId),
        ]);

        // 6. Build circular document
        const circularData: Record<string, unknown> = {
            circular_no: circularNo,
            title: dto.title,
            description: dto.description || null,
            file_url: fileUrl,
            issued_by: dto.issued_by,
            issued_date: Timestamp.fromDate(new Date(dto.issued_date)),
            effective_date: dto.effective_date
                ? Timestamp.fromDate(new Date(dto.effective_date))
                : null,
            is_active: true,
            visibility_level: visibilityLevel,
            district_id: dto.district_id || null,
            school_id: singleSchoolId,
            school_ids: schoolIds,
            target_roles: targetRoles,
            target_subject: dto.target_subject || null,
            created_by: userId,
            // Denormalized names for display
            district_name: districtName,
            school_name: schoolName,
            creator_name: creatorName,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "circulars"), circularData);

        // 7. Log audit entry
        await auditLogsFirestore.create({
            user_id: userId,
            action: "CIRCULAR_CREATED",
            entity_type: "Circular",
            entity_id: docRef.id,
        });

        return {
            id: docRef.id,
            circular_no: circularNo,
            title: dto.title,
            description: dto.description,
            file_url: fileUrl ?? undefined,
            issued_by: dto.issued_by,
            issued_date: dto.issued_date,
            effective_date: dto.effective_date,
            is_active: true,
            visibility_level: visibilityLevel,
            district_id: dto.district_id,
            school_id: singleSchoolId ?? undefined,
            school_ids: schoolIds,
            target_roles: targetRoles,
            target_subject: dto.target_subject,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            district: districtName ? { name: districtName } : undefined,
            school: schoolName ? { name: schoolName } : undefined,
            creator: creatorName ? { name: creatorName } : undefined,
        };
    },

    /**
     * Soft-delete a circular (set is_active = false).
     */
    async delete(
        adminId: string,
        circularId: string,
        reason?: string
    ): Promise<{ message: string; circular_id: string; reason: string | null }> {
        await waitForAuthReady();
        await devDelay("write", "circulars.delete");
        const db = getFirebaseFirestore();
        const circularRef = doc(db, "circulars", circularId);
        const snap = await getDoc(circularRef);

        if (!snap.exists()) throw new Error("Circular not found");
        if (!snap.data().is_active) throw new Error("Circular already deleted");

        await updateDoc(circularRef, { is_active: false, updated_at: serverTimestamp() });

        // Audit log
        await auditLogsFirestore.create({
            user_id: adminId,
            action: "CIRCULAR_DELETED",
            entity_type: "Circular",
            entity_id: circularId,
        });

        return {
            message: "Circular deleted successfully",
            circular_id: circularId,
            reason: reason || null,
        };
    },

    /**
     * Resolve a circular's file_url to a downloadable URL.
     * Handles both Firebase Storage paths and legacy full URLs.
     */
    resolveFileUrl,
};
