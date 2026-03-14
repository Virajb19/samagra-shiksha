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

  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value
  ) {
    return new Date(((value as { _seconds: number })._seconds ?? 0) * 1000).toISOString();
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

  // District / school filter — all roles now have these denormalized on the user doc
  if (filters.school_id) {
    constraints.push(where("school_id", "==", filters.school_id));
  } else if (filters.district_id) {
    constraints.push(where("district_id", "==", filters.district_id));
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


  // ── All constraints (role, district, school, active, sort) handled by applySupportedFilters ──
  const usersConstraints = applySupportedFilters(filters);

  // ── Server-side search: exact match on name, email, or phone ──
  // Firestore has no partial/fuzzy text search, so we run parallel exact-match
  // queries on each searchable field and merge the results.
  if (hasSearch) {
    const searchTerm = filters!.search!.trim();

    // Build base constraints WITHOUT orderBy (we sort in-memory after merging)
    const searchBaseConstraints: QueryConstraint[] = [];
    if (filters?.roles?.length) {
      searchBaseConstraints.push(where("role", "in", filters.roles.slice(0, 10)));
    } else if (filters?.role) {
      searchBaseConstraints.push(where("role", "==", filters.role));
    }
    if (filters?.school_id) {
      searchBaseConstraints.push(where("school_id", "==", filters.school_id));
    } else if (filters?.district_id) {
      searchBaseConstraints.push(where("district_id", "==", filters.district_id));
    }
    if (filters?.is_active !== undefined) {
      searchBaseConstraints.push(where("is_active", "==", filters.is_active));
    }

    // Run 3 parallel exact-match queries: name, email, phone
    const [nameSnap, emailSnap, phoneSnap] = await Promise.all([
      getDocs(query(usersCollection, ...searchBaseConstraints, where("name", "==", searchTerm))),
      getDocs(query(usersCollection, ...searchBaseConstraints, where("email", "==", searchTerm))),
      getDocs(query(usersCollection, ...searchBaseConstraints, where("phone", "==", searchTerm))),
    ]);

    // Merge and deduplicate by doc ID
    const seen = new Set<string>();
    const parsedUsers: User[] = [];
    for (const snap of [nameSnap, emailSnap, phoneSnap]) {
      for (const docSnap of snap.docs) {
        if (seen.has(docSnap.id)) continue;
        seen.add(docSnap.id);
        const parsed = UserReadSchema.safeParse({ id: docSnap.id, ...docSnap.data() });
        if (parsed.success) {
          parsedUsers.push(toUser(docSnap.id, parsed.data));
        }
      }
    }

    // Sort: active first, then created_at desc
    parsedUsers.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const { pageRows, total, totalPages } = paginate(parsedUsers, currentPage, pageSize);
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
