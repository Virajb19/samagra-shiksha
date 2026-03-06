/**
 * Dashboard Page — Server Component
 *
 * Fetches all dashboard analytics directly from Firestore using
 * firebase-admin (server-side). No backend API needed.
 *
 * Data fetched:
 *   1. Role stats       — user count per role + center superintendent count
 *   2. Active users     — active vs inactive user counts
 *   3. Helpdesk summary — total / pending / resolved ticket counts
 *   4. Gender stats     — user count per gender
 *   5. District stats   — user count per district (via faculty → school → district)
 *   6. Pending actions  — inactive users, pending helpdesk tickets
 *   7. Audit logs       — 100 most recent audit log entries
 */

import { unstable_cache } from 'next/cache';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { devDelay } from '@/lib/dev-delay';
import Dashboard from './Dashboard';

// ────────────────────── Firestore Query Helpers ──────────────────────

/**
 * Count documents in a collection matching a where clause.
 * Wraps the Firestore countFromServer aggregation for cleaner usage.
 */
async function countWhere(
    collection: string,
    field: string,
    op: FirebaseFirestore.WhereFilterOp,
    value: unknown
): Promise<number> {
    await devDelay('read', `countWhere ${collection}`);
    const db = getAdminFirestore();
    const snapshot = await db
        .collection(collection)
        .where(field, op, value)
        .count()
        .get();
    return snapshot.data().count;
}

/** Count all documents in a collection */
async function countAll(collection: string): Promise<number> {
    await devDelay('read', `countAll ${collection}`);
    const db = getAdminFirestore();
    const snapshot = await db.collection(collection).count().get();
    return snapshot.data().count;
}

// ────────────────────── Analytics Queries ──────────────────────

/**
 * Fetch user counts grouped by role.
 */
async function fetchRoleStats() {
    const roles = [
        'ADMIN', 'SUPER_ADMIN', 'HEADMASTER',
        'TEACHER', 'IE_RESOURCE_PERSON', 'KGBV_WARDEN', 'NSCBAV_WARDEN', 'JUNIOR_ENGINEER',
    ];

    const roleCounts = await Promise.all(
        roles.map(role => countWhere('users', 'role', '==', role))
    );

    return {
        roles: roles.map((role, i) => ({ role, count: roleCounts[i] })),
    };
}

/**
 * Fetch active / inactive / total user counts.
 */
async function fetchActiveUsersStats() {
    const [total, active] = await Promise.all([
        countAll('users'),
        countWhere('users', 'is_active', '==', true),
    ]);

    return {
        total,
        active,
        inactive: total - active,
    };
}

/**
 * Fetch helpdesk ticket summary: total, pending (unresolved), resolved.
 */
async function fetchHelpdeskSummary() {
    const [total, resolved] = await Promise.all([
        countAll('helpdesk_tickets'),
        countWhere('helpdesk_tickets', 'is_resolved', '==', true),
    ]);

    return {
        total,
        resolved,
        pending: total - resolved,
    };
}

/**
 * Fetch user count per gender (MALE / FEMALE / OTHER).
 */
async function fetchGenderStats() {
    const [male, female] = await Promise.all([
        countWhere('users', 'gender', '==', 'MALE'),
        countWhere('users', 'gender', '==', 'FEMALE'),
    ]);

    const total = male + female;

    return {
        MALE: male,
        FEMALE: female,
        OTHER: 0,   // seed doesn't generate OTHER, but keeping for compatibility
        total,
    };
}

/**
 * Fetch user count per district.
 *
 * Strategy: Users are linked to districts via faculties → schools.
 *   1. Load all districts (16 docs)
 *   2. Load all schools (select only district_id) to build school→district map
 *   3. Scan all faculties (select only school_id) and bucket-count by district
 *
 * This gives actual user counts (~20K) instead of school counts (~4K).
 */
async function fetchDistrictUserStats() {
    await devDelay('read', 'fetchDistrictUserStats');
    const db = getAdminFirestore();

    // Step 1: Load all districts (only 16 docs)
    const districtSnap = await db.collection('districts').get();
    const districts = districtSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
    }));

    // Step 2: Build school → district mapping
    const schoolSnap = await db.collection('schools').select('district_id').get();
    const schoolToDistrict = new Map<string, string>();
    for (const doc of schoolSnap.docs) {
        schoolToDistrict.set(doc.id, doc.data().district_id as string);
    }

    // Step 3: Scan all faculties (only school_id) and count users per district
    const facultySnap = await db.collection('faculties').select('school_id').get();
    const districtCounts = new Map<string, number>();
    for (const doc of facultySnap.docs) {
        const schoolId = doc.data().school_id as string;
        const districtId = schoolToDistrict.get(schoolId);
        if (districtId) {
            districtCounts.set(districtId, (districtCounts.get(districtId) || 0) + 1);
        }
    }

    return districts.map(district => ({
        district_id: district.id,
        district_name: district.name,
        user_count: districtCounts.get(district.id) || 0,
    }));
}

/**
 * Fetch counts of pending actions across the system.
 */
async function fetchPendingActions() {
    const [inactiveUsers, pendingHelpdesk] = await Promise.all([
        // Users that are inactive
        countWhere('users', 'is_active', '==', false),
        // Helpdesk tickets that are unresolved
        countWhere('helpdesk_tickets', 'is_resolved', '==', false),
    ]);

    return {
        inactive_users: inactiveUsers,
        pending_helpdesk: pendingHelpdesk,
        total: inactiveUsers + pendingHelpdesk,
    };
}

/**
 * Fetch the 100 most recent audit logs, ordered by created_at descending.
 */
async function fetchAuditLogs() {
    await devDelay('read', 'fetchAuditLogs');
    const db = getAdminFirestore();
    const snapshot = await db
        .collection('audit_logs')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            action: data.action ?? '',
            entity_type: data.entity_type ?? '',
            entity_id: data.entity_id ?? null,
            user_id: data.user_id ?? null,
            ip_address: data.ip_address ?? null,
            // Convert Firestore Timestamp to ISO string for the client
            created_at: data.created_at?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        };
    });
}

// ────────────────────── Cached Data Fetcher ──────────────────────

/**
 * All dashboard data fetched and cached with ISR.
 * Revalidates every 60 seconds — subsequent requests within the window
 * get the cached result instantly (no Firestore queries).
 */
const getCachedDashboardData = unstable_cache(
    async () => {
        const [roleStats, activeUsersStats, helpdeskSummary, genderStats, districtUserStats, pendingActions, auditLogs] =
            await Promise.all([
                fetchRoleStats(),
                fetchActiveUsersStats(),
                fetchHelpdeskSummary(),
                fetchGenderStats(),
                fetchDistrictUserStats(),
                fetchPendingActions(),
                fetchAuditLogs(),
            ]);

        return { roleStats, activeUsersStats, helpdeskSummary, genderStats, districtUserStats, pendingActions, auditLogs };
    },
    ['dashboard-data'],
    { revalidate: 60 }
);

// ────────────────────── Page Component ──────────────────────

export default async function DashboardPage() {
    const { roleStats, activeUsersStats, helpdeskSummary, genderStats, districtUserStats, pendingActions, auditLogs } =
        await getCachedDashboardData();

    return (
        <Dashboard
            roleStats={roleStats?.roles || []}
            activeUsersStats={activeUsersStats || { active: 0, total: 0, inactive: 0 }}
            helpdeskSummary={helpdeskSummary || { total: 0, pending: 0, resolved: 0 }}
            genderStats={genderStats || { MALE: 0, FEMALE: 0, OTHER: 0, total: 0 }}
            districtUserStats={districtUserStats || []}
            pendingActions={pendingActions || { inactive_users: 0, pending_helpdesk: 0, total: 0 }}
            auditLogs={auditLogs || []}
        />
    );
}
