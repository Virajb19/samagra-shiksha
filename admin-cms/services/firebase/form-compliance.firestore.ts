/**
 * Form Compliance — Firestore Data Access Layer (Client-Side)
 *
 * Queries the denormalized `missing_form_submissions` collection that is
 * populated by the Cloud Function. This enables:
 *   • Server-side cursor-based pagination (startAfter + limit)
 *   • Server-side filtering (where clauses)
 *   • Server-side search (exact match on user_name)
 *   • Efficient total count via getCountFromServer
 *
 * Replaces the old approach of 21+ Firestore queries per page load.
 */

"use client";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  type QueryConstraint,
  type DocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";
import { devDelay } from "@/lib/dev-delay";

// ────────────────────── Types ──────────────────────

export type FormType =
  | "ICT"
  | "Library"
  | "Science Lab"
  | "Self Defence"
  | "Vocational Education"
  | "KGBV"
  | "NSCBAV"
  | "IE School Visit"
  | "IE Home Visit";

export type ComplianceStatus = "Not Submitted" | "Overdue";

export interface ComplianceRecord {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  school_name: string;
  school_id: string;
  district_name: string;
  district_id: string;
  form_type: FormType;
  form_window: string;
  days_remaining: number;
  status: ComplianceStatus;
}

export interface ComplianceResponse {
  data: ComplianceRecord[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ComplianceFilters {
  district_id?: string;
  school_id?: string;
  form_type?: FormType;
  status?: ComplianceStatus;
  role?: string;
  search?: string;
}

// ────────────────────── Cursor Cache ──────────────────────

const cursorCache = new Map<string, DocumentSnapshot>();

function getCursorCacheKey(filters: ComplianceFilters, cursor: string): string {
  return JSON.stringify({ ...filters, cursor });
}

// ────────────────────── Helpers ──────────────────────

function buildConstraints(filters: ComplianceFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (filters.search?.trim()) {
    constraints.push(where("user_name", "==", filters.search.trim()));
  }
  if (filters.district_id) {
    constraints.push(where("district_id", "==", filters.district_id));
  }
  if (filters.school_id) {
    constraints.push(where("school_id", "==", filters.school_id));
  }
  if (filters.form_type) {
    constraints.push(where("form_type", "==", filters.form_type));
  }
  if (filters.status) {
    constraints.push(where("status", "==", filters.status));
  }
  if (filters.role) {
    constraints.push(where("role", "==", filters.role));
  }

  return constraints;
}

function docToRecord(doc: DocumentSnapshot): ComplianceRecord {
  const d = doc.data()!;
  return {
    id: (d.id as string) || doc.id,
    user_id: (d.user_id as string) || "",
    user_name: (d.user_name as string) || "Unknown",
    role: (d.role as string) || "",
    school_name: (d.school_name as string) || "—",
    school_id: (d.school_id as string) || "",
    district_name: (d.district_name as string) || "—",
    district_id: (d.district_id as string) || "",
    form_type: (d.form_type as FormType) || "ICT",
    form_window: (d.form_window as string) || "",
    days_remaining: (d.days_remaining as number) ?? 0,
    status: (d.status as ComplianceStatus) || "Not Submitted",
  };
}

// ────────────────────── Public API ──────────────────────

export function clearComplianceCache() {
  cursorCache.clear();
}

export const formComplianceFirestore = {
  /**
   * Fetch missing form submissions with server-side pagination.
   *
   * Uses the denormalized `missing_form_submissions` collection populated
   * by the Cloud Function.
   */
  async getAll(
    pageSize = 30,
    cursor?: string | null,
    filters: ComplianceFilters = {},
  ): Promise<ComplianceResponse> {
    await waitForAuthReady();
    await devDelay("read", "formCompliance.getAll");

    const db = getFirebaseFirestore();
    const col = collection(db, "missing_form_submissions");
    const constraints = buildConstraints(filters);

    // ── Total count (parallel with page query) ──
    const countQuery = query(col, ...constraints);
    const countPromise = getCountFromServer(countQuery);

    // ── Page query ──
    const pageConstraints: QueryConstraint[] = [
      ...constraints,
      orderBy("created_at", "desc"),
      limit(pageSize + 1), // fetch one extra to detect hasMore
    ];

    // Apply cursor if provided
    if (cursor) {
      const cacheKey = getCursorCacheKey(filters, cursor);
      const cachedDoc = cursorCache.get(cacheKey);
      if (cachedDoc) {
        pageConstraints.push(startAfter(cachedDoc));
      }
    }

    const pageQuery = query(col, ...pageConstraints);

    // Run both queries in parallel
    const [countSnap, pageSnap] = await Promise.all([
      countPromise,
      getDocs(pageQuery),
    ]);

    const total = countSnap.data().count;
    const docs = pageSnap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

    // Cache the last doc for cursor pagination
    let nextCursor: string | null = null;
    if (hasMore && pageDocs.length > 0) {
      const lastDoc = pageDocs[pageDocs.length - 1];
      nextCursor = lastDoc.id;
      const cacheKey = getCursorCacheKey(filters, nextCursor);
      cursorCache.set(cacheKey, lastDoc);
    }

    const data = pageDocs.map(docToRecord);

    return { data, total, hasMore, nextCursor };
  },

  /**
   * Fetch ALL records for CSV/XLSX export (no pagination).
   */
  async fetchAll(filters: ComplianceFilters = {}): Promise<ComplianceRecord[]> {
    await waitForAuthReady();
    await devDelay("read", "formCompliance.fetchAll");

    const db = getFirebaseFirestore();
    const col = collection(db, "missing_form_submissions");
    const constraints = buildConstraints(filters);

    const q = query(col, ...constraints, orderBy("created_at", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map(docToRecord);
  },
};
