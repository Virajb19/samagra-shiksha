"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  where,
  QueryConstraint,
  limit as queryLimit,
  startAfter,
  getCountFromServer,
  updateDoc,
} from "firebase/firestore";
import type { ProjectSchool, Project, ProjectSchoolCategory, ProjectActivity, PABYear } from "@/types";
import { getFirebaseFirestore } from "@/lib/firebase";
import {
  ProjectSchoolDocSchema,
  ProjectDocSchema,
} from "@/lib/firebase-zod-schema";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";
import { devDelay } from "@/lib/dev-delay";

// ── Helpers ──

function toIso(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
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
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date(0).toISOString();
}

function toProjectSchool(docId: string, data: unknown): ProjectSchool | null {
  const parsed = ProjectSchoolDocSchema.safeParse({ id: docId, ...((data as object) ?? {}) });
  if (!parsed.success) return null;
  return {
    id: parsed.data.id,
    name: parsed.data.name,
    category: parsed.data.category as ProjectSchoolCategory,
    district_id: parsed.data.district_id,
    district_name: parsed.data.district_name,
    udise_code: parsed.data.udise_code,
    ebrc: parsed.data.ebrc,
    created_at: toIso(parsed.data.created_at),
    updated_at: toIso(parsed.data.updated_at),
  };
}

function toProject(docId: string, data: unknown): Project | null {
  const parsed = ProjectDocSchema.safeParse({ id: docId, ...((data as object) ?? {}) });
  if (!parsed.success) return null;
  return {
    id: parsed.data.id,
    project_school_id: parsed.data.project_school_id,
    school_name: parsed.data.school_name,
    district_name: parsed.data.district_name,
    udise_code: parsed.data.udise_code,
    pab_year: parsed.data.pab_year as PABYear,
    category: parsed.data.category as ProjectSchoolCategory,
    activity: parsed.data.activity as ProjectActivity,
    contractor: parsed.data.contractor ?? undefined,
    status: (parsed.data.status as Project["status"]) ?? "Not Started",
    physical: parsed.data.physical ?? 0,
    approved: parsed.data.approved ?? 0,
    civil_cost: parsed.data.civil_cost ?? 0,
    contingency: parsed.data.contingency ?? 0,
    april: parsed.data.april ?? 0,
    may: parsed.data.may ?? 0,
    june: parsed.data.june ?? 0,
    july: parsed.data.july ?? 0,
    august: parsed.data.august ?? 0,
    september: parsed.data.september ?? 0,
    october: parsed.data.october ?? 0,
    november: parsed.data.november ?? 0,
    december: parsed.data.december ?? 0,
    january: parsed.data.january ?? 0,
    february: parsed.data.february ?? 0,
    march: parsed.data.march ?? 0,
    balance: parsed.data.balance ?? 0,
    remarks: parsed.data.remarks ?? "",
    progress: parsed.data.progress ?? 0,
    photos: parsed.data.photos ?? [],
    created_at: toIso(parsed.data.created_at),
    updated_at: toIso(parsed.data.updated_at),
  };
}

// ── Response Types ──

export interface ProjectSchoolsResponse {
  data: ProjectSchool[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ProjectsResponse {
  data: Project[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

// ── Project Schools CRUD ──

export const projectManagementFirestore = {
  // Get all project schools (paginated)
  async getProjectSchools(
    limit = 20,
    cursor: string | null = null,
    districtFilter?: string,
    categoryFilter?: string,
  ): Promise<ProjectSchoolsResponse> {
    await waitForAuthReady();
    await devDelay("read", "projectSchools.getAll");
    const db = getFirebaseFirestore();
    const col = collection(db, "project_schools");

    // Count total
    const countConstraints: QueryConstraint[] = [];
    if (districtFilter && districtFilter !== "all") {
      countConstraints.push(where("district_name", "==", districtFilter));
    }
    if (categoryFilter && categoryFilter !== "all") {
      countConstraints.push(where("category", "==", categoryFilter));
    }
    const countQ = query(col, ...countConstraints);
    const countSnap = await getCountFromServer(countQ);
    const total = countSnap.data().count;

    // Fetch data
    const constraints: QueryConstraint[] = [
      ...countConstraints,
      orderBy("created_at", "desc"),
      queryLimit(limit + 1),
    ];

    if (cursor) {
      const cursorDoc = await getDoc(doc(db, "project_schools", cursor));
      if (cursorDoc.exists()) {
        constraints.push(startAfter(cursorDoc));
      }
    }

    const q = query(col, ...constraints);
    const snap = await getDocs(q);

    const items: ProjectSchool[] = [];
    snap.docs.slice(0, limit).forEach((d) => {
      const school = toProjectSchool(d.id, d.data());
      if (school) items.push(school);
    });

    return {
      data: items,
      total,
      hasMore: snap.docs.length > limit,
      nextCursor: items.length > 0 ? items[items.length - 1].id : null,
    };
  },

  // Get ALL project schools (no pagination, for dropdowns)
  async getAllProjectSchools(): Promise<ProjectSchool[]> {
    await waitForAuthReady();
    await devDelay("read", "projectSchools.getAllForDropdown");
    const db = getFirebaseFirestore();
    const col = collection(db, "project_schools");
    const q = query(col, orderBy("name", "asc"));
    const snap = await getDocs(q);
    const items: ProjectSchool[] = [];
    snap.docs.forEach((d) => {
      const school = toProjectSchool(d.id, d.data());
      if (school) items.push(school);
    });
    return items;
  },

  // Create project school
  async createProjectSchool(input: {
    name: string;
    category: ProjectSchoolCategory;
    district_id: string;
    district_name: string;
    udise_code: string;
    ebrc: string;
  }): Promise<string> {
    await waitForAuthReady();
    await devDelay("write", "projectSchools.create");
    const db = getFirebaseFirestore();
    const col = collection(db, "project_schools");
    const docRef = await addDoc(col, {
      ...input,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    // Update doc with its own ID
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  },

  // Delete project school
  async deleteProjectSchool(schoolId: string): Promise<void> {
    await waitForAuthReady();
    await devDelay("write", "projectSchools.delete");
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, "project_schools", schoolId));
  },

  // ── Projects CRUD ──

  // Get all projects (cursor paginated, server-side filtered)
  async getProjects(
    limit = 20,
    cursor: string | null = null,
    pabYearFilter?: string,
    activityFilter?: string,
    districtFilter?: string,
    categoryFilter?: string,
    statusFilter?: string,
  ): Promise<ProjectsResponse> {
    await waitForAuthReady();
    await devDelay("read", "projects.getAll");
    const db = getFirebaseFirestore();
    const col = collection(db, "projects");

    const countConstraints: QueryConstraint[] = [];
    if (pabYearFilter && pabYearFilter !== "all") {
      countConstraints.push(where("pab_year", "==", pabYearFilter));
    }
    if (activityFilter && activityFilter !== "all") {
      countConstraints.push(where("activity", "==", activityFilter));
    }
    if (districtFilter && districtFilter !== "all") {
      countConstraints.push(where("district_name", "==", districtFilter));
    }
    if (categoryFilter && categoryFilter !== "all") {
      countConstraints.push(where("category", "==", categoryFilter));
    }
    if (statusFilter && statusFilter !== "all") {
      countConstraints.push(where("status", "==", statusFilter));
    }
    const countQ = query(col, ...countConstraints);
    const countSnap = await getCountFromServer(countQ);
    const total = countSnap.data().count;

    const constraints: QueryConstraint[] = [
      ...countConstraints,
      orderBy("created_at", "desc"),
      queryLimit(limit + 1),
    ];

    if (cursor) {
      const cursorDoc = await getDoc(doc(db, "projects", cursor));
      if (cursorDoc.exists()) {
        constraints.push(startAfter(cursorDoc));
      }
    }

    const q = query(col, ...constraints);
    const snap = await getDocs(q);

    const items: Project[] = [];
    snap.docs.slice(0, limit).forEach((d) => {
      const project = toProject(d.id, d.data());
      if (project) items.push(project);
    });

    return {
      data: items,
      total,
      hasMore: snap.docs.length > limit,
      nextCursor: items.length > 0 ? items[items.length - 1].id : null,
    };
  },

  // Create project
  async createProject(input: {
    project_school_id: string;
    school_name: string;
    district_name: string;
    udise_code: string;
    pab_year: PABYear;
    category: ProjectSchoolCategory;
    activity: ProjectActivity;
    contractor?: string;
  }): Promise<string> {
    await waitForAuthReady();
    await devDelay("write", "projects.create");
    const db = getFirebaseFirestore();
    const col = collection(db, "projects");
    const docRef = await addDoc(col, {
      ...input,
      contractor: input.contractor || null,
      status: "Not Started",
      physical: 0,
      approved: 0,
      civil_cost: 0,
      contingency: 0,
      april: 0, may: 0, june: 0, july: 0,
      august: 0, september: 0, october: 0, november: 0,
      december: 0, january: 0, february: 0, march: 0,
      balance: 0,
      remarks: "",
      progress: 0,
      photos: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  },

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    await waitForAuthReady();
    await devDelay("write", "projects.delete");
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, "projects", projectId));
  },

  // Update project (partial update for editable fields)
  async updateProject(projectId: string, updates: Partial<{
    status: string;
    physical: number;
    approved: number;
    civil_cost: number;
    contingency: number;
    april: number; may: number; june: number; july: number;
    august: number; september: number; october: number; november: number;
    december: number; january: number; february: number; march: number;
    balance: number;
    remarks: string;
    contractor: string;
  }>): Promise<void> {
    await waitForAuthReady();
    await devDelay("write", "projects.update");
    const db = getFirebaseFirestore();
    await updateDoc(doc(db, "projects", projectId), {
      ...updates,
      updated_at: serverTimestamp(),
    });
  },

  // Get cumulative data grouped by activity (with financial aggregation)
  async getCumulativeData(
    pabYearFilter?: string,
    districtFilter?: string,
    categoryFilter?: string,
  ): Promise<
    {
      activity: string;
      totalSchools: number;
      totalPhysical: number;
      totalApproved: number;
      totalExpenditure: number;
      balance: number;
      notStartedCount: number;
      inProgressCount: number;
      completedCount: number;
      count: number;
      schools: string[];
    }[]
  > {
    await waitForAuthReady();
    await devDelay("read", "projects.getCumulativeData");
    const db = getFirebaseFirestore();
    const col = collection(db, "projects");
    const constraints: QueryConstraint[] = [];
    if (pabYearFilter && pabYearFilter !== "all") {
      constraints.push(where("pab_year", "==", pabYearFilter));
    }
    if (districtFilter && districtFilter !== "all") {
      constraints.push(where("district_name", "==", districtFilter));
    }
    if (categoryFilter && categoryFilter !== "all") {
      constraints.push(where("category", "==", categoryFilter));
    }
    const q = query(col, ...constraints);
    const snap = await getDocs(q);

    const MONTHS = [
      "april", "may", "june", "july", "august", "september",
      "october", "november", "december", "january", "february", "march",
    ];

    const activityMap = new Map<
      string,
      {
        count: number;
        schools: Set<string>;
        totalPhysical: number;
        totalApproved: number;
        totalExpenditure: number;
        notStartedCount: number;
        inProgressCount: number;
        completedCount: number;
      }
    >();

    snap.docs.forEach((d) => {
      const data = d.data();
      const activity = data.activity as string;
      const schoolName = data.school_name as string;

      if (!activityMap.has(activity)) {
        activityMap.set(activity, {
          count: 0,
          schools: new Set(),
          totalPhysical: 0,
          totalApproved: 0,
          totalExpenditure: 0,
          notStartedCount: 0,
          inProgressCount: 0,
          completedCount: 0,
        });
      }
      const entry = activityMap.get(activity)!;
      entry.count += 1;
      entry.schools.add(schoolName);
      entry.totalPhysical += (data.physical as number) || 0;
      entry.totalApproved += (data.approved as number) || 0;

      let monthlyTotal = 0;
      for (const m of MONTHS) {
        monthlyTotal += (data[m] as number) || 0;
      }
      entry.totalExpenditure += monthlyTotal;

      const status = (data.status as string) || "Not Started";
      if (status === "Completed") entry.completedCount += 1;
      else if (status === "In Progress") entry.inProgressCount += 1;
      else entry.notStartedCount += 1;
    });

    return Array.from(activityMap.entries())
      .map(([activity, entry]) => ({
        activity,
        totalSchools: entry.schools.size,
        totalPhysical: parseFloat(entry.totalPhysical.toFixed(2)),
        totalApproved: parseFloat(entry.totalApproved.toFixed(2)),
        totalExpenditure: parseFloat(entry.totalExpenditure.toFixed(2)),
        balance: parseFloat((entry.totalApproved - entry.totalExpenditure).toFixed(2)),
        notStartedCount: entry.notStartedCount,
        inProgressCount: entry.inProgressCount,
        completedCount: entry.completedCount,
        count: entry.count,
        schools: Array.from(entry.schools),
      }))
      .sort((a, b) => b.count - a.count);
  },
};
