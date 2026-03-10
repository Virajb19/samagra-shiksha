"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  QueryConstraint,
  writeBatch,
  limit as queryLimit,
} from "firebase/firestore";
import { District, School, Subject } from "@/types";
import { getFirebaseFirestore, getFirebaseAuth } from "@/lib/firebase";
import { auditLogsFirestore } from "./audit-logs.firestore";
import {
  DistrictDocSchema,
  SchoolDocSchema,
  SubjectDocSchema,
} from "@/lib/firebase-zod-schema";
import {
  CreateSchoolInput,
  PaginatedSchoolsResponse,
  SubjectBulkResult,
  UpdateSchoolInput,
  UpdateSubjectInput,
} from "@/services/contracts";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";

function toIso(value: unknown): string {
  if (!value) return new Date(0).toISOString();

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

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
    "seconds" in value &&
    "nanoseconds" in value
  ) {
    const maybeSeconds = (value as { seconds: number }).seconds;
    return new Date(maybeSeconds * 1000).toISOString();
  }

  return new Date(0).toISOString();
}

function toDistrict(docId: string, data: unknown): District | null {
  const parsed = DistrictDocSchema.safeParse({ id: docId, ...((data as object) ?? {}) });
  if (!parsed.success) return null;

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    state: parsed.data.state,
    created_at: toIso(parsed.data.created_at),
  };
}

function toSchool(docId: string, data: unknown): School | null {
  const parsed = SchoolDocSchema.safeParse({ id: docId, ...((data as object) ?? {}) });
  if (!parsed.success) return null;

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    registration_code: parsed.data.registration_code,
    district_id: parsed.data.district_id,
    created_at: toIso(parsed.data.created_at),
  };
}

function toSubject(docId: string, data: unknown): Subject | null {
  const parsed = SubjectDocSchema.safeParse({ id: docId, ...((data as object) ?? {}) });
  if (!parsed.success) return null;

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    class_level: parsed.data.class_level,
    is_active: parsed.data.is_active,
    created_at: toIso(parsed.data.created_at),
    updated_at: toIso(parsed.data.updated_at),
  };
}

function applySearchByName<T extends { name: string }>(rows: T[], search?: string): T[] {
  if (!search?.trim()) return rows;

  const normalized = search.trim().toLowerCase();
  return rows.filter((row) => row.name.toLowerCase().includes(normalized));
}

export const masterDataFirestore = {
  /**
   * Fetches all districts sorted by district name.
   * Equivalent to: GET /admin/master-data/districts
   */
  async getDistricts(): Promise<District[]> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const districtsQuery = query(collection(db, "districts"), orderBy("name", "asc"));
    const snapshot = await getDocs(districtsQuery);

    return snapshot.docs
      .map((docSnapshot) => toDistrict(docSnapshot.id, docSnapshot.data()))
      .filter((row): row is District => row !== null);
  },

  /**
   * Fetches schools, optionally filtered by district.
   * Equivalent to: GET /admin/master-data/schools?districtId=...
   */
  async getSchools(districtId?: string): Promise<School[]> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("name", "asc")];

    if (districtId) {
      constraints.unshift(where("district_id", "==", districtId));
    }

    const schoolsQuery = query(collection(db, "schools"), ...constraints);
    const snapshot = await getDocs(schoolsQuery);

    return snapshot.docs
      .map((docSnapshot) => toSchool(docSnapshot.id, docSnapshot.data()))
      .filter((row): row is School => row !== null);
  },

  /**
   * Returns paginated schools with optional district and search filtering.
   * Equivalent to: GET /admin/master-data/schools/paginated
   */
  async getSchoolsPaginated(params: {
    limit?: number;
    offset?: number;
    districtId?: string;
    search?: string;
  }): Promise<PaginatedSchoolsResponse> {
    await waitForAuthReady();
    const pageLimit = Math.max(1, params.limit ?? 50);
    const pageOffset = Math.max(0, params.offset ?? 0);

    const schools = await this.getSchools(params.districtId);
    const searched = applySearchByName(schools, params.search);
    const pageRows = searched.slice(pageOffset, pageOffset + pageLimit);

    return {
      data: pageRows,
      total: searched.length,
      hasMore: pageOffset + pageLimit < searched.length,
    };
  },

  /**
   * Returns distinct class levels from active subjects.
   * Equivalent to: GET /admin/master-data/classes
   */
  async getClasses(): Promise<number[]> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const subjectsQuery = query(collection(db, "subjects"), where("is_active", "==", true), queryLimit(500));
    const snapshot = await getDocs(subjectsQuery);

    const levels = new Set<number>();
    snapshot.forEach((docSnapshot) => {
      const subject = toSubject(docSnapshot.id, docSnapshot.data());
      if (subject) {
        levels.add(subject.class_level);
      }
    });

    return Array.from(levels).sort((left, right) => left - right);
  },

  /**
   * Returns distinct subject names, optionally filtered by class level.
   * Equivalent to: GET /admin/master-data/subjects?classLevel=...
   */
  async getSubjects(classLevel?: number): Promise<string[]> {
    await waitForAuthReady();
    const subjects = await this.getSubjectsDetailed(classLevel);
    return Array.from(new Set(subjects.filter((subject) => subject.is_active).map((subject) => subject.name))).sort((left, right) => left.localeCompare(right));
  },

  /**
   * Returns full subject documents, optionally filtered by class level.
   * Equivalent to: GET /admin/master-data/subjects/detailed?classLevel=...
   */
  async getSubjectsDetailed(classLevel?: number): Promise<Subject[]> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [orderBy("name", "asc")];

    if (classLevel !== undefined) {
      constraints.unshift(where("class_level", "==", classLevel));
    }

    const subjectsQuery = query(collection(db, "subjects"), ...constraints);
    const snapshot = await getDocs(subjectsQuery);

    return snapshot.docs
      .map((docSnapshot) => toSubject(docSnapshot.id, docSnapshot.data()))
      .filter((row): row is Subject => row !== null);
  },
};

// Backward-compatible alias for existing imports
export const firebaseMasterDataApi = masterDataFirestore;
// Legacy alias
export const masterDataApi = masterDataFirestore;

export const firebaseAdminManageApi = {
  async createSchool(data: CreateSchoolInput): Promise<School> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const documentRef = await addDoc(collection(db, "schools"), {
      ...data,
      created_at: serverTimestamp(),
    });

    // Audit log
    const auth = getFirebaseAuth();
    await auditLogsFirestore.create({
      user_id: auth.currentUser?.uid ?? null,
      action: "SCHOOL_CREATED",
      entity_type: "School",
      entity_id: documentRef.id,
    });

    return {
      id: documentRef.id,
      name: data.name,
      registration_code: data.registration_code,
      district_id: data.district_id,
      created_at: new Date().toISOString(),
    };
  },

  async updateSchool(id: string, data: UpdateSchoolInput): Promise<School> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const schoolRef = doc(db, "schools", id);

    await setDoc(schoolRef, data, { merge: true });

    // Audit log
    const auth = getFirebaseAuth();
    await auditLogsFirestore.create({
      user_id: auth.currentUser?.uid ?? null,
      action: "SCHOOL_UPDATED",
      entity_type: "School",
      entity_id: id,
    });

    const schools = await firebaseMasterDataApi.getSchools();
    const updated = schools.find((school) => school.id === id);

    if (!updated) {
      throw new Error("Updated school not found");
    }

    return updated;
  },

  async deleteSchool(id: string): Promise<void> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, "schools", id));

    // Audit log
    const auth = getFirebaseAuth();
    await auditLogsFirestore.create({
      user_id: auth.currentUser?.uid ?? null,
      action: "SCHOOL_DELETED",
      entity_type: "School",
      entity_id: id,
    });
  },

  async createSubject(data: { name: string; class_level: number }): Promise<Subject> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const documentRef = await addDoc(collection(db, "subjects"), {
      ...data,
      is_active: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // Audit log
    const auth = getFirebaseAuth();
    await auditLogsFirestore.create({
      user_id: auth.currentUser?.uid ?? null,
      action: "SUBJECT_CREATED",
      entity_type: "Subject",
      entity_id: documentRef.id,
    });

    return {
      id: documentRef.id,
      name: data.name,
      class_level: data.class_level,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async createSubjectBulk(data: { name: string; class_levels: number[] }): Promise<SubjectBulkResult> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const created: Subject[] = [];
    const errors: string[] = [];

    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    data.class_levels.forEach((classLevel) => {
      if (classLevel < 1 || classLevel > 12) {
        errors.push(`Invalid class level: ${classLevel}`);
        return;
      }

      const subjectRef = doc(collection(db, "subjects"));
      batch.set(subjectRef, {
        name: data.name,
        class_level: classLevel,
        is_active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      created.push({
        id: subjectRef.id,
        name: data.name,
        class_level: classLevel,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      });
    });

    if (created.length > 0) {
      await batch.commit();

      // Audit log
      const auth = getFirebaseAuth();
      for (const subject of created) {
        await auditLogsFirestore.create({
          user_id: auth.currentUser?.uid ?? null,
          action: "SUBJECT_CREATED",
          entity_type: "Subject",
          entity_id: subject.id,
        });
      }
    }

    return { created, errors };
  },

  async updateSubject(id: string, data: UpdateSubjectInput): Promise<Subject> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    const subjectRef = doc(db, "subjects", id);

    await setDoc(subjectRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true });

    // Audit log
    const auth = getFirebaseAuth();
    await auditLogsFirestore.create({
      user_id: auth.currentUser?.uid ?? null,
      action: "SUBJECT_UPDATED",
      entity_type: "Subject",
      entity_id: id,
    });

    const subjects = await firebaseMasterDataApi.getSubjectsDetailed();
    const updated = subjects.find((subject) => subject.id === id);

    if (!updated) {
      throw new Error("Updated subject not found");
    }

    return updated;
  },

  async deleteSubject(id: string): Promise<void> {
    await waitForAuthReady();
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, "subjects", id));

    // Audit log
    const auth = getFirebaseAuth();
    await auditLogsFirestore.create({
      user_id: auth.currentUser?.uid ?? null,
      action: "SUBJECT_DELETED",
      entity_type: "Subject",
      entity_id: id,
    });
  },
};
