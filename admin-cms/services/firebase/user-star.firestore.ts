/**
 * User Stars — Firestore Data Access Layer (Client-Side)
 *
 * Handles admin bookmarking/starring of users via the `user_stars`
 * Firestore collection.
 *
 * Collection: `user_stars`
 *   Fields: id, admin_id, starred_user_id, created_at
 *
 * @see Backend Reference: backend/src/user-stars/user-stars.service.ts
 */

"use client";

import {
    collection,
    doc,
    query,
    getDocs,
    getDoc,
    addDoc,
    deleteDoc,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { getFirebaseFirestore, getFirebaseAuth } from "@/lib/firebase";
import { auditLogsFirestore } from "./audit-logs.firestore";
import { devDelay } from "@/lib/dev-delay";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

// ────────────────────── Firestore API ──────────────────────

export const userStarsFireStore = {
    /**
     * Toggle star status for a user.
     * If already starred → remove it. Otherwise → add it.
     */
    async toggleStar(
        userId: string
    ): Promise<{ starred: boolean }> {
        await waitForAuthReady();
        await devDelay("write", "userStars.toggleStar");
        const db = getFirebaseFirestore();

        // Get admin ID from Firebase Auth
        const auth = getFirebaseAuth();
        const adminId = auth.currentUser?.uid;
        if (!adminId) throw new Error("Not authenticated");

        const starsCol = collection(db, "user_stars");
        const q = query(
            starsCol,
            where("admin_id", "==", adminId),
            where("starred_user_id", "==", userId)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
            // Already starred → unstar
            await deleteDoc(snap.docs[0].ref);

            // Audit log
            await auditLogsFirestore.create({
                user_id: adminId,
                action: "USER_UNSTARRED",
                entity_type: "User",
                entity_id: userId,
            });

            return { starred: false };
        } else {
            // Not starred → star
            await addDoc(starsCol, {
                admin_id: adminId,
                starred_user_id: userId,
                created_at: serverTimestamp(),
            });

            // Audit log
            await auditLogsFirestore.create({
                user_id: adminId,
                action: "USER_STARRED",
                entity_type: "User",
                entity_id: userId,
            });

            return { starred: true };
        }
    },

    /**
     * Get starred user IDs for the current admin.
     * Returns a flat array of user ID strings.
     */
    async getStarredIds(): Promise<string[]> {
        await waitForAuthReady();
        await devDelay("read", "userStars.getStarredIds");
        const db = getFirebaseFirestore();

        const auth = getFirebaseAuth();
        const adminId = auth.currentUser?.uid;
        if (!adminId) return [];

        const q = query(
            collection(db, "user_stars"),
            where("admin_id", "==", adminId)
        );
        const snap = await getDocs(q);

        return snap.docs.map((d) => d.data().starred_user_id as string);
    },

    /**
     * Get all starred users with their details for the current admin.
     */
    async getStarredUsers(): Promise<
        Array<{
            id: string;
            name: string;
            phone: string;
            email: string | null;
            role: string;
            is_active: boolean;
            school_name?: string;
        }>
    > {
        await waitForAuthReady();
        await devDelay("read", "userStars.getStarredUsers");
        const db = getFirebaseFirestore();

        const auth = getFirebaseAuth();
        const adminId = auth.currentUser?.uid;
        if (!adminId) return [];

        const q = query(
            collection(db, "user_stars"),
            where("admin_id", "==", adminId)
        );
        const snap = await getDocs(q);

        const users = await Promise.all(
            snap.docs.map(async (starDoc) => {
                const starredUserId = starDoc.data().starred_user_id as string;
                const userSnap = await getDoc(doc(db, "users", starredUserId));
                const userData = userSnap.exists() ? userSnap.data() : {};
                return {
                    id: starredUserId,
                    name: userData?.name ?? "Unknown",
                    phone: userData?.phone ?? "",
                    email: userData?.email ?? null,
                    role: userData?.role ?? "",
                    is_active: userData?.is_active ?? false,
                    school_name: userData?.school_name ?? undefined,
                };
            })
        );

        return users;
    },
};
