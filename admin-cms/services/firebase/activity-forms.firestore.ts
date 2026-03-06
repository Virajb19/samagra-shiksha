/**
 * Activity Forms — Firestore Data Access Layer (Client-Side)
 *
 * Provides CRUD operations for the `activity_forms` Firestore collection.
 *
 * Collection: `activity_forms`
 */

"use client";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    DocumentData,
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import { devDelay } from "@/lib/dev-delay";
import { ActivityForm } from "@/types";
import { waitForAuthReady } from "@/services/firebase/auth.firestore";
import { toast } from "sonner";

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

/** Transform a Firestore document into an ActivityForm with computed status */
function toActivityForm(docId: string, data: DocumentData): ActivityForm {
    const startingDate = data.starting_date ? toIso(data.starting_date) : null;
    const endingDate = data.ending_date ? toIso(data.ending_date) : null;

    // Compute effective status from the date window:
    // - "Active":   admin set "Open" AND today is within [starting_date, ending_date]
    // - "Inactive": admin set "Open" but today is BEFORE starting_date (scheduled)
    // - "Closed":   admin set "Closed" OR today is AFTER ending_date (expired)
    let computedStatus: "Active" | "Inactive" | "Closed" = "Closed";
    if (data.status === "Open" && startingDate && endingDate) {
        const now = new Date();
        const start = new Date(startingDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endingDate);
        end.setHours(23, 59, 59, 999);

        if (now >= start && now <= end) {
            computedStatus = "Active";
        } else if (now < start) {
            computedStatus = "Inactive";
        }
        // If now > end, stays "Closed" (expired)
    }

    return {
        id: docId,
        name: data.name ?? "ICT",
        status: computedStatus,
        starting_date: startingDate,
        ending_date: endingDate,
        created_at: toIso(data.created_at),
        updated_at: toIso(data.updated_at),
    };
}

// ────────────────────── Firestore API ──────────────────────

export const activityFormsFirestore = {
    /**
     * Fetch all activity forms, ordered by name.
     */
    async getAll(): Promise<ActivityForm[]> {
        await waitForAuthReady();
        await devDelay("read", "activityForms.getAll");
        const db = getFirebaseFirestore();
        const formsCol = collection(db, "activity_forms");
        const snapshot = await getDocs(formsCol);
        const forms = snapshot.docs.map((d) => toActivityForm(d.id, d.data()));
        // toast.success(JSON.stringify(forms))
        return forms.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Open an activity form — sets status to "Open" and updates dates.
     */
    async openForm(formId: string, startingDate: string, endingDate: string): Promise<void> {
        await waitForAuthReady();
        await devDelay("write", "activityForms.openForm");
        const db = getFirebaseFirestore();
        const formRef = doc(db, "activity_forms", formId);

        // Parse date-only strings ("YYYY-MM-DD") into local-timezone Date objects.
        // new Date("YYYY-MM-DD") parses as UTC midnight, which can shift the date
        // by ±1 day depending on the timezone. Splitting into parts avoids this.
        const [sy, sm, sd] = startingDate.split('-').map(Number);
        const startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        const [ey, em, ed] = endingDate.split('-').map(Number);
        const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);

        await updateDoc(formRef, {
            status: "Open",
            starting_date: Timestamp.fromDate(startDate),
            ending_date: Timestamp.fromDate(endDate),
            updated_at: serverTimestamp(),
        });
    },

    /**
     * Close an activity form — sets status to "Closed".
     */
    async closeForm(formId: string): Promise<void> {
        await waitForAuthReady();
        await devDelay("write", "activityForms.closeForm");
        const db = getFirebaseFirestore();
        const formRef = doc(db, "activity_forms", formId);

        await updateDoc(formRef, {
            status: "Closed",
            updated_at: serverTimestamp(),
        });
    },
};
