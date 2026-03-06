"use client";

import { z } from "zod";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  QueryConstraint,
  documentId,
  DocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";
import { FacultyType, Gender, User, UserRole } from "@/types";
import { PaginatedUsersResponse, UserFilterParams } from "@/services/contracts";
import {
  FacultyDocSchema,
  SchoolDocSchema,
  UserDocSchema,
} from "@/lib/firebase-zod-schema";

const UserReadSchema = UserDocSchema.omit({ password: true }).extend({
  created_at: UserDocSchema.shape.created_at.optional(),
});

const FacultyReadSchema = FacultyDocSchema.partial({
  id: true,
  faculty_type: true,
  designation: true,
  years_of_experience: true,
  is_profile_locked: true,
  created_at: true,
  updated_at: true,
});

const SchoolReadSchema = SchoolDocSchema.partial({
  registration_code: true,
  district_id: true,
  created_at: true,
});

function toIso(value: unknown): string {
  if (!value) return new Date(0).toISOString();
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

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    return new Date(((value as { seconds: number }).seconds ?? 0) * 1000).toISOString();
  }

  return new Date(0).toISOString();
}

function toUser(docId: string, data: z.output<typeof UserReadSchema>): User {
  return {
    id: docId,
    name: data.name,
    email: data.email ?? undefined,
    phone: data.phone,
    role: data.role as UserRole,
    gender: (data.gender ?? undefined) as Gender | undefined,
    profile_image_url: data.profile_image_url ?? undefined,
    is_active: data.is_active,
    created_at: toIso(data.created_at),
    coordinator_subject: data.coordinator_subject ?? undefined,
    coordinator_class_group: data.coordinator_class_group ?? undefined,

    // Role-specific fields
    district_id: data.district_id ?? undefined,
    responsibilities: data.responsibilities ?? undefined,
    kgbv_type: (data.kgbv_type ?? undefined) as User["kgbv_type"],
    residential_location: data.residential_location ?? undefined,
    ebrc: data.ebrc ?? undefined,
    qualification: data.qualification ?? undefined,
    rci_number: data.rci_number ?? undefined,
    years_of_experience: data.years_of_experience ?? undefined,
    date_of_joining: data.date_of_joining ? toIso(data.date_of_joining) : undefined,
    aadhaar_number: data.aadhaar_number ?? undefined,
    has_completed_profile: data.has_completed_profile ?? false,
  };
}

function applySupportedFilters(filters?: UserFilterParams): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (!filters) {
    return [orderBy("is_active", "desc"), orderBy("created_at", "desc")];
  }

  if (filters.roles?.length) {
    constraints.push(where("role", "in", filters.roles.slice(0, 10)));
  } else if (filters.role) {
    constraints.push(where("role", "==", filters.role));
  }

  if (filters.is_active !== undefined) {
    constraints.push(where("is_active", "==", filters.is_active));
  }

  if (filters.exclude_roles?.length) {
    constraints.push(where("role", "not-in", filters.exclude_roles.slice(0, 10)));
  }

  // Sort active users first, then by created_at desc
  if (filters.is_active === undefined) {
    constraints.push(orderBy("is_active", "desc"));
  }
  constraints.push(orderBy("created_at", filters.sort_order === "asc" ? "asc" : "desc"));
  return constraints;
}

/**
 * Role priority for client-side sort:
 * Lower number = shown first. HEADMASTER = 0 (top).
 */
const ROLE_SORT_PRIORITY: Record<string, number> = {
  HEADMASTER: 0,
  TEACHER: 1,
  IE_RESOURCE_PERSON: 2,
  KGBV_WARDEN: 3,
  NSCBAV_WARDEN: 4,
  JUNIOR_ENGINEER: 5,
};

function getRolePriority(role: string): number {
  return ROLE_SORT_PRIORITY[role] ?? 99;
}

/**
 * Sort users: headmasters first, then active status, then created_at desc.
 * Only applied when showing "all" roles (no specific role filter).
 */
function sortUsersWithHeadmastersFirst(users: User[]): User[] {
  return [...users].sort((a, b) => {
    const roleDiff = getRolePriority(a.role) - getRolePriority(b.role);
    if (roleDiff !== 0) return roleDiff;
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function getFacultiesByUserIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, z.output<typeof FacultyReadSchema>>();

  const db = getFirebaseFirestore();
  const results = new Map<string, z.output<typeof FacultyReadSchema>>();

  // Use batch size 30 (Firestore v12+ supports up to 30 for "in" queries)
  // Run all batches in parallel for speed
  const batchPromises = [];
  for (let index = 0; index < userIds.length; index += 30) {
    const batch = userIds.slice(index, index + 30);
    batchPromises.push(
      getDocs(query(collection(db, "faculties"), where("user_id", "in", batch)))
    );
  }
  const batchResults = await Promise.all(batchPromises);
  batchResults.forEach((snap) => {
    snap.forEach((doc) => {
      const parsed = FacultyReadSchema.safeParse(doc.data());
      if (parsed.success) {
        results.set(parsed.data.user_id, parsed.data);
      }
    });
  });

  return results;
}

async function getSchoolsByIds(schoolIds: string[]) {
  if (!schoolIds.length) return new Map<string, z.output<typeof SchoolReadSchema>>();

  const db = getFirebaseFirestore();
  const results = new Map<string, z.output<typeof SchoolReadSchema>>();

  // Use batch size 30 and run in parallel
  const batchPromises = [];
  for (let index = 0; index < schoolIds.length; index += 30) {
    const batch = schoolIds.slice(index, index + 30);
    batchPromises.push(
      getDocs(query(collection(db, "schools"), where(documentId(), "in", batch)))
    );
  }
  const batchResults = await Promise.all(batchPromises);
  batchResults.forEach((snap) => {
    snap.forEach((doc) => {
      const parsed = SchoolReadSchema.safeParse({ id: doc.id, ...doc.data() });
      if (parsed.success) {
        results.set(doc.id, parsed.data);
      }
    });
  });

  return results;
}

function applySearch(users: User[], search?: string): User[] {
  if (!search?.trim()) return users;

  const normalized = search.trim().toLowerCase();
  return users.filter((user) => {
    return (
      user.name.toLowerCase().includes(normalized) ||
      user.email?.toLowerCase().includes(normalized) ||
      user.phone.toLowerCase().includes(normalized)
    );
  });
}

function paginate<T>(rows: T[], page = 1, limit = 25) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    pageRows: rows.slice(start, end),
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / safeLimit)),
    page: safePage,
    limit: safeLimit,
  };
}

export function supportsFirebaseUsersQuery(filters?: UserFilterParams): boolean {
  return true;
}

// ── Cursor cache for efficient page navigation ──
// Key: serialized filter params (without page), Value: Map<pageNumber, lastDocSnapshot>
const cursorCache = new Map<string, Map<number, DocumentSnapshot>>();

function getCursorCacheKey(filters?: UserFilterParams): string {
  if (!filters) return "__all__";
  const { page, limit, ...rest } = filters;
  return JSON.stringify(rest);
}

/** Clear cursor cache — call when filters change */
export function clearUsersCursorCache() {
  cursorCache.clear();
}

export async function getUsersFromFirestore(filters?: UserFilterParams): Promise<PaginatedUsersResponse> {
  await waitForAuthReady();

  const db = getFirebaseFirestore();
  const usersCollection = collection(db, "users");
  const pageSize = filters?.limit ?? 25;
  const currentPage = filters?.page ?? 1;
  const hasSearch = !!filters?.search?.trim();

  // ── Roles that store district_id directly on the user doc (no faculty record) ──
  const DIRECT_DISTRICT_ROLES = new Set([
    "JUNIOR_ENGINEER", "KGBV_WARDEN", "NSCBAV_WARDEN", "IE_RESOURCE_PERSON",
  ]);

  // Determine if the current role filter uses direct district_id on user doc
  const filterRole = filters?.role;
  const filterRoles = filters?.roles;
  const isDirectDistrictRole = filterRole
    ? DIRECT_DISTRICT_ROLES.has(filterRole)
    : filterRoles?.length
      ? filterRoles.every((r) => DIRECT_DISTRICT_ROLES.has(r))
      : false;

  // ── District/school filter ──
  // For "direct district" roles (JE, KGBV, NSCBAV, IE): add where("district_id") to Firestore query
  // For faculty-based roles (HM, TEACHER): resolve user IDs via faculty → school → district join
  // For "all" with district filter: do both paths and union results
  let userIdWhitelist: Set<string> | null = null;
  let directDistrictConstraint: QueryConstraint | null = null;

  if (filters?.district_id || filters?.school_id) {
    if (filters.school_id) {
      // School filter always goes through faculty (only HM/TEACHER have schools)
      const facSnap = await getDocs(
        query(collection(db, "faculties"), where("school_id", "==", filters.school_id))
      );
      userIdWhitelist = new Set(facSnap.docs.map((d) => d.data().user_id as string));

      if (userIdWhitelist.size === 0) {
        return { data: [], total: 0, totalPages: 1, page: currentPage, limit: pageSize };
      }
    } else if (filters.district_id) {
      if (isDirectDistrictRole) {
        // Direct district roles: add district_id as a Firestore WHERE constraint (fast, no join)
        directDistrictConstraint = where("district_id", "==", filters.district_id);
      } else if (!filterRole && !filterRoles?.length) {
        // "All" role + district filter: need both paths
        // Path 1: Faculty-based users (HM/TEACHER via school)
        const schoolSnap = await getDocs(
          query(collection(db, "schools"), where("district_id", "==", filters.district_id))
        );
        const schoolIds = schoolSnap.docs.map((d) => d.id);
        const allUserIds = new Set<string>();

        // Run all faculty batches in parallel (batch size 30)
        const facBatchPromises = [];
        for (let i = 0; i < schoolIds.length; i += 30) {
          const batch = schoolIds.slice(i, i + 30);
          facBatchPromises.push(
            getDocs(query(collection(db, "faculties"), where("school_id", "in", batch)))
          );
        }
        const facBatchResults = await Promise.all(facBatchPromises);
        facBatchResults.forEach((facSnap) => {
          facSnap.forEach((d) => {
            const uid = d.data().user_id;
            if (uid) allUserIds.add(uid as string);
          });
        });

        // Path 2: Direct district users (JE, KGBV, NSCBAV, IE)
        const directSnap = await getDocs(
          query(usersCollection, where("district_id", "==", filters.district_id))
        );
        directSnap.forEach((d) => allUserIds.add(d.id));

        userIdWhitelist = allUserIds;
        if (userIdWhitelist.size === 0) {
          return { data: [], total: 0, totalPages: 1, page: currentPage, limit: pageSize };
        }
      } else {
        // Faculty-based roles (HM, TEACHER, composite) with district filter
        const schoolSnap = await getDocs(
          query(collection(db, "schools"), where("district_id", "==", filters.district_id))
        );
        const schoolIds = schoolSnap.docs.map((d) => d.id);
        if (schoolIds.length === 0) {
          return { data: [], total: 0, totalPages: 1, page: currentPage, limit: pageSize };
        }
        const allUserIds = new Set<string>();

        // Run all faculty batches in parallel (batch size 30)
        const facBatchPromises = [];
        for (let i = 0; i < schoolIds.length; i += 30) {
          const batch = schoolIds.slice(i, i + 30);
          facBatchPromises.push(
            getDocs(query(collection(db, "faculties"), where("school_id", "in", batch)))
          );
        }
        const facBatchResults = await Promise.all(facBatchPromises);
        facBatchResults.forEach((facSnap) => {
          facSnap.forEach((d) => {
            const uid = d.data().user_id;
            if (uid) allUserIds.add(uid as string);
          });
        });

        userIdWhitelist = allUserIds;
        if (userIdWhitelist.size === 0) {
          return { data: [], total: 0, totalPages: 1, page: currentPage, limit: pageSize };
        }
      }
    }
  }

  // ── Build base Firestore constraints (excluding district/school — handled above) ──
  const usersConstraints = applySupportedFilters(filters);

  // Inject direct district constraint for roles that store district_id on user doc
  if (directDistrictConstraint) {
    usersConstraints.unshift(directDistrictConstraint);
  }

  // ── If we have a whitelist from district/school filter, use batched "in" queries ──
  if (userIdWhitelist) {
    const whitelistArr = Array.from(userIdWhitelist);

    // Build lightweight constraints — skip orderBy since we sort in-memory after merging batches.
    // Combining documentId() "in" with orderBy forces Firestore to scan a composite index, which is slow.
    const lightConstraints: QueryConstraint[] = [];
    if (filters?.roles?.length) {
      lightConstraints.push(where("role", "in", filters.roles.slice(0, 10)));
    } else if (filters?.role) {
      lightConstraints.push(where("role", "==", filters.role));
    }
    if (filters?.is_active !== undefined) {
      lightConstraints.push(where("is_active", "==", filters.is_active));
    }

    const batchPromises: Promise<User[]>[] = [];
    for (let i = 0; i < whitelistArr.length; i += 30) {
      const batch = whitelistArr.slice(i, i + 30);
      batchPromises.push(
        getDocs(
          query(usersCollection, where(documentId(), "in", batch), ...lightConstraints)
        ).then((snap) => {
          const users: User[] = [];
          snap.forEach((docSnap) => {
            const parsed = UserReadSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
            if (parsed.success) {
              users.push(toUser(docSnap.id, parsed.data));
            }
          });
          return users;
        })
      );
    }
    const allUsers = (await Promise.all(batchPromises)).flat();

    // Sort: headmasters first (when no specific role filter), then active, then created_at desc
    const isAllRoles = !filters?.role && !filters?.roles?.length;
    const sortedUsers = isAllRoles
      ? sortUsersWithHeadmastersFirst(allUsers)
      : allUsers.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    // Client-side search + pagination for whitelist queries
    const searched = hasSearch ? applySearch(sortedUsers, filters?.search) : sortedUsers;
    const { pageRows, total, totalPages } = paginate(searched, currentPage, pageSize);
    const enriched = await enrichUsersWithFacultyAndSchool(pageRows);

    return { data: enriched, total, totalPages, page: currentPage, limit: pageSize };
  }

  // ── Standard query: cursor-based pagination with cached cursors ──
  if (hasSearch) {
    // Search: must fetch all to filter client-side (Firestore has no full-text search)
    const usersSnapshot = await getDocs(query(usersCollection, ...usersConstraints));
    const parsedUsers = usersSnapshot.docs
      .map((docSnap) => {
        const parsed = UserReadSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
        if (!parsed.success) return null;
        return toUser(docSnap.id, parsed.data);
      })
      .filter((user): user is User => user !== null);

    const isAllRolesSearch = !filters?.role && !filters?.roles?.length;
    const sortedParsed = isAllRolesSearch ? sortUsersWithHeadmastersFirst(parsedUsers) : parsedUsers;
    const searchedUsers = applySearch(sortedParsed, filters?.search);
    const { pageRows, total, totalPages } = paginate(searchedUsers, currentPage, pageSize);
    const enriched = await enrichUsersWithFacultyAndSchool(pageRows);

    return { data: enriched, total, totalPages, page: currentPage, limit: pageSize };
  }

  // ── Cursor-based pagination (no search) — efficient, only pageSize reads per page ──
  const cacheKey = getCursorCacheKey(filters);
  if (!cursorCache.has(cacheKey)) {
    cursorCache.set(cacheKey, new Map());
  }
  const pagesCursors = cursorCache.get(cacheKey)!;

  // Get total count (cheap — does not read docs)
  const countSnapshot = await getCountFromServer(query(usersCollection, ...usersConstraints));
  const totalFromServer = countSnapshot.data().count;
  const totalPages = Math.max(1, Math.ceil(totalFromServer / pageSize));

  let pageQuery;

  if (currentPage === 1) {
    // First page — no cursor needed
    pageQuery = query(usersCollection, ...usersConstraints, firestoreLimit(pageSize));
  } else {
    // Check cursor cache for previous page
    const prevPageCursor = pagesCursors.get(currentPage - 1);

    if (prevPageCursor) {
      // Use cached cursor — just pageSize reads
      pageQuery = query(usersCollection, ...usersConstraints, startAfter(prevPageCursor), firestoreLimit(pageSize));
    } else {
      // No cached cursor — find the nearest cached page and walk forward
      let nearestPage = 0;
      let nearestCursor: DocumentSnapshot | null = null;

      for (const [pg, cursor] of pagesCursors.entries()) {
        if (pg < currentPage && pg > nearestPage) {
          nearestPage = pg;
          nearestCursor = cursor;
        }
      }

      // Walk forward from nearest cached cursor to the target page
      const pagesToSkip = currentPage - nearestPage - 1;
      const docsToSkip = pagesToSkip * pageSize;

      if (docsToSkip > 0) {
        let skipQuery;
        if (nearestCursor) {
          skipQuery = query(usersCollection, ...usersConstraints, startAfter(nearestCursor), firestoreLimit(docsToSkip));
        } else {
          skipQuery = query(usersCollection, ...usersConstraints, firestoreLimit(docsToSkip));
        }
        const skipSnap = await getDocs(skipQuery);

        // Cache cursors for intermediate pages
        for (let i = 0; i < skipSnap.docs.length; i++) {
          const intermediatePageNum = nearestPage + Math.floor(i / pageSize) + 1;
          if ((i + 1) % pageSize === 0) {
            pagesCursors.set(intermediatePageNum, skipSnap.docs[i]);
          }
        }

        const lastSkippedDoc = skipSnap.docs[skipSnap.docs.length - 1];
        if (lastSkippedDoc) {
          pagesCursors.set(currentPage - 1, lastSkippedDoc);
          pageQuery = query(usersCollection, ...usersConstraints, startAfter(lastSkippedDoc), firestoreLimit(pageSize));
        } else {
          // Not enough docs — empty page
          return { data: [], total: totalFromServer, totalPages, page: currentPage, limit: pageSize };
        }
      } else {
        // nearestCursor IS the previous page cursor
        if (nearestCursor) {
          pageQuery = query(usersCollection, ...usersConstraints, startAfter(nearestCursor), firestoreLimit(pageSize));
        } else {
          pageQuery = query(usersCollection, ...usersConstraints, firestoreLimit(pageSize));
        }
      }
    }
  }

  const pageSnap = await getDocs(pageQuery);

  // Cache the last doc of this page as cursor for next page
  if (pageSnap.docs.length > 0) {
    pagesCursors.set(currentPage, pageSnap.docs[pageSnap.docs.length - 1]);
  }

  const parsedUsers = pageSnap.docs
    .map((docSnap) => {
      const parsed = UserReadSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
      if (!parsed.success) return null;
      return toUser(docSnap.id, parsed.data);
    })
    .filter((user): user is User => user !== null);

  // Sort headmasters first when showing all roles
  const isAllRolesCursor = !filters?.role && !filters?.roles?.length;
  const orderedUsers = isAllRolesCursor ? sortUsersWithHeadmastersFirst(parsedUsers) : parsedUsers;

  const enriched = await enrichUsersWithFacultyAndSchool(orderedUsers);

  return {
    data: enriched,
    total: totalFromServer,
    totalPages,
    page: currentPage,
    limit: pageSize,
  };
}

/** Enrich users with faculty + school + district data */
async function enrichUsersWithFacultyAndSchool(pageRows: User[]): Promise<User[]> {
  const db = getFirebaseFirestore();

  // Only query faculties for roles that actually have faculty records
  const FACULTY_ROLES = new Set(["TEACHER", "HEADMASTER"]);
  const facultyCandidateIds = pageRows
    .filter((u) => FACULTY_ROLES.has(u.role))
    .map((u) => u.id);

  const facultiesByUserId = await getFacultiesByUserIds(facultyCandidateIds);
  const schoolIds = Array.from(new Set(Array.from(facultiesByUserId.values()).map((faculty) => faculty.school_id)));
  const schoolsById = await getSchoolsByIds(schoolIds);

  // Resolve district names for schools
  const districtIds = Array.from(new Set(
    Array.from(schoolsById.values())
      .map((s) => s.district_id)
      .filter((id): id is string => !!id)
  ));
  const districtsById = new Map<string, { id: string; name: string }>();
  const districtBatchPromises = [];
  for (let i = 0; i < districtIds.length; i += 30) {
    const batch = districtIds.slice(i, i + 30);
    districtBatchPromises.push(
      getDocs(query(collection(db, "districts"), where(documentId(), "in", batch)))
    );
  }
  const districtBatchResults = await Promise.all(districtBatchPromises);
  districtBatchResults.forEach((snap) => {
    snap.forEach((d) => {
      districtsById.set(d.id, { id: d.id, name: (d.data().name as string) || "" });
    });
  });

  return pageRows.map((user) => {
    const faculty = facultiesByUserId.get(user.id);
    if (!faculty) return user;

    const school = schoolsById.get(faculty.school_id);
    const district = school?.district_id ? districtsById.get(school.district_id) : undefined;
    return {
      ...user,
      faculty: {
        id: faculty.id ?? "",
        user_id: faculty.user_id,
        school_id: faculty.school_id,
        faculty_type: faculty.faculty_type ?? FacultyType.TEACHING,
        designation: faculty.designation ?? "",
        years_of_experience: faculty.years_of_experience ?? 0,
        is_profile_locked: faculty.is_profile_locked ?? false,
        created_at: toIso(faculty.created_at),
        updated_at: toIso(faculty.updated_at),
        school: school
          ? {
            id: school.id,
            name: school.name,
            registration_code: school.registration_code ?? "",
            district_id: school.district_id ?? "",
            district: district ?? undefined,
            created_at: toIso(school.created_at),
          }
          : undefined,
      },
    } as User;
  });
}
