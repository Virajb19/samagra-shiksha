/**
 * Active Forms Page — Server Component
 *
 * Fetches all activity forms directly from Firestore using
 * firebase-admin (server-side), then passes data to the client component.
 */

import { getAdminFirestore } from '@/lib/firebase-admin';
import ActiveFormsClient from './ActiveFormsClient';
import type { ActivityForm, ActivityFormType } from '@/types';

// ── Server-side Firestore fetch ──

async function fetchActivityForms(): Promise<ActivityForm[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection('activity_forms').orderBy('name', 'asc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const startingDate = data.starting_date?.toDate?.()?.toISOString?.() ?? null;
    const endingDate = data.ending_date?.toDate?.()?.toISOString?.() ?? null;

    // Compute effective status from the date window:
    //   Active   = admin set 'Open' AND today is within [start, end]
    //   Inactive = admin set 'Open' AND today is BEFORE start
    //   Closed   = admin set 'Closed' OR today is AFTER end
    let effectiveStatus: 'Active' | 'Inactive' | 'Closed' = 'Closed';
    if (data.status === 'Open' && startingDate && endingDate) {
      const now = new Date();
      const start = new Date(startingDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endingDate);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) {
        effectiveStatus = 'Active';
      } else if (now < start) {
        effectiveStatus = 'Inactive';
      }
    }

    return {
      id: doc.id,
      name: (data.name as ActivityFormType) ?? 'ICT',
      status: effectiveStatus,
      starting_date: startingDate,
      ending_date: endingDate,
      created_at: data.created_at?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      updated_at: data.updated_at?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    };
  });
}

// ── Page ──

export default async function ActiveFormsPage() {
  const forms = await fetchActivityForms();
  // console.log(forms);
  return <ActiveFormsClient initialForms={forms} />;
}
