/**
 * Dashboard Analytics — Firestore Data Access Layer (Client-Side)
 *
 * Provides all aggregation queries needed by the admin dashboard.
 * Each method maps to one card / chart on the dashboard page.
 *
 * Used by React Query hooks in `dashboard.service.ts` and by the
 * server component `page.tsx` (via firebase-admin equivalents).
 *
 * Collections queried:
 *   - users                    — role, gender, active/inactive counts
 *   - helpdesk_tickets         — ticket resolution stats
 *   - districts / schools      — district-level user distribution
 */

"use client";

import {
    collection,
    query,
    where,
    getDocs,
    getCountFromServer,
    orderBy,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

// ────────────────────── Types ──────────────────────

export interface RoleStat {
    role: string;
    count: number;
}

export interface RoleStatsResponse {
    roles: RoleStat[];
}

export interface ActiveUsersStats {
    total: number;
    active: number;
    inactive: number;
}

export interface HelpdeskSummary {
    total: number;
    resolved: number;
    pending: number;
}

export interface GenderStats {
    MALE: number;
    FEMALE: number;
    OTHER: number;
    total: number;
}

export interface DistrictUserStat {
    district_id: string;
    district_name: string;
    user_count: number;
}

export interface PendingActions {
    inactive_users: number;
    pending_helpdesk: number;
    total: number;
}

// ────────────────────── Helpers ──────────────────────

/** Count documents in a collection matching a single where clause */
async function countWhere(
    collectionName: string,
    field: string,
    op: import("firebase/firestore").WhereFilterOp,
    value: unknown
): Promise<number> {
    const db = getFirebaseFirestore();
    const q = query(collection(db, collectionName), where(field, op, value));
    const snap = await getCountFromServer(q);
    return snap.data().count;
}

/** Count all documents in a collection */
async function countAll(collectionName: string): Promise<number> {
    const db = getFirebaseFirestore();
    const snap = await getCountFromServer(collection(db, collectionName));
    return snap.data().count;
}

// ────────────────────── Firestore API ──────────────────────

export const dashboardAnalyticsApi = {
    /**
     * Count users grouped by role + center superintendent breakdown.
     * Dashboard card: "Role Distribution"
     */
    async getRoleStats(): Promise<RoleStatsResponse> {
        await waitForAuthReady();
        const roles = [
            "ADMIN", "SUPER_ADMIN", "HEADMASTER",
            "TEACHER",
        ];

        const roleCounts = await Promise.all(roles.map((role) => countWhere("users", "role", "==", role)));

        return {
            roles: roles.map((role, i) => ({ role, count: roleCounts[i] })),
        };
    },

    /**
     * Count active vs inactive users.
     * Dashboard card: "Active Users"
     */
    async getActiveUsersStats(): Promise<ActiveUsersStats> {
        await waitForAuthReady();
        const [total, active] = await Promise.all([
            countAll("users"),
            countWhere("users", "is_active", "==", true),
        ]);

        return { total, active, inactive: total - active };
    },

    /**
     * Count helpdesk tickets by resolution status.
     * Dashboard card: "Helpdesk Summary"
     */
    async getHelpdeskSummary(): Promise<HelpdeskSummary> {
        await waitForAuthReady();
        const [total, resolved] = await Promise.all([
            countAll("helpdesk_tickets"),
            countWhere("helpdesk_tickets", "is_resolved", "==", true),
        ]);

        return { total, resolved, pending: total - resolved };
    },

    /**
     * Count users by gender.
     * Dashboard chart: "Gender Distribution"
     */
    async getGenderStats(): Promise<GenderStats> {
        await waitForAuthReady();
        const [male, female] = await Promise.all([
            countWhere("users", "gender", "==", "MALE"),
            countWhere("users", "gender", "==", "FEMALE"),
        ]);

        return { MALE: male, FEMALE: female, OTHER: 0, total: male + female };
    },

    /**
     * Count schools per district as a proxy for user distribution.
     * Dashboard chart: "District Distribution"
     *
     * Note: Users don't have a direct `district_id` field, so we count
     * schools per district. For exact user counts, a faculty → school → district
     * join would be needed, but school count is a fast approximation.
     */
    async getDistrictUserStats(): Promise<DistrictUserStat[]> {
        await waitForAuthReady();
        const db = getFirebaseFirestore();

        // Load all districts (small — ~16 docs for Nagaland) and all schools in parallel
        // Single query instead of N countWhere calls (one per district)
        const [districtSnap, schoolSnap] = await Promise.all([
            getDocs(query(collection(db, "districts"), orderBy("name", "asc"))),
            getDocs(collection(db, "schools")),
        ]);

        // Group school count by district_id client-side
        const schoolCountByDistrict = new Map<string, number>();
        schoolSnap.docs.forEach((doc) => {
            const districtId = doc.data().district_id as string;
            if (districtId) {
                schoolCountByDistrict.set(districtId, (schoolCountByDistrict.get(districtId) || 0) + 1);
            }
        });

        return districtSnap.docs.map((doc) => ({
            district_id: doc.id,
            district_name: doc.data().name as string,
            user_count: schoolCountByDistrict.get(doc.id) || 0,
        }));
    },

    /**
     * Count pending actions across the system.
     * Dashboard widget: "Pending Actions"
     */
    async getPendingActions(): Promise<PendingActions> {
        await waitForAuthReady();
        const [inactiveUsers, pendingHelpdesk] =
            await Promise.all([
                countWhere("users", "is_active", "==", false),
                countWhere("helpdesk_tickets", "is_resolved", "==", false),
            ]);

        return {
            inactive_users: inactiveUsers,
            pending_helpdesk: pendingHelpdesk,
            total: inactiveUsers + pendingHelpdesk,
        };
    },
};
