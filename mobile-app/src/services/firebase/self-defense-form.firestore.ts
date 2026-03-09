/**
 * Self Defense Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission and retrieval of Self Defense activity form data.
 * Collection: `self_defense_form_data`
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import type { SelfDefenseFormData } from '../../lib/zod';
import { uploadSelfDefenseFormFile } from '../storage.service';

const db = getFirebaseDb();

export interface SelfDefenseFormSubmission {
    id: string;
    school_id: string;
    school_name: string;
    district: string;
    udise: string;
    submitted_by: string;
    submitted_by_name: string;
    submitted_by_role: string;
    photo: string;
    classes_per_week: string;
    classes_per_month: string;
    girl_participants: string;
    girls_benefited: string;
    instructor_name: string;
    contact_number: string;
    created_at: string;
}

/**
 * Submit a completed Self Defense form to Firestore.
 */
export async function submitSelfDefenseForm(
    formData: SelfDefenseFormData,
    userInfo: {
        userId: string;
        userName: string;
        userRole: string;
        schoolId: string;
        schoolName: string;
        district: string;
        udise: string;
    },
): Promise<string> {
    // Upload the single photo
    let photoUrl = '';
    const result = await uploadSelfDefenseFormFile(formData.photo, userInfo.userId);
    if (result.success && result.fileUrl) {
        photoUrl = result.fileUrl;
    }

    const docData = {
        school_id: userInfo.schoolId,
        school_name: userInfo.schoolName,
        district: userInfo.district,
        udise: userInfo.udise,
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        submitted_by_role: userInfo.userRole,
        photo: photoUrl,
        classes_per_week: formData.classesPerWeek,
        classes_per_month: formData.classesPerMonth,
        girl_participants: formData.girlParticipants,
        girls_benefited: formData.girlsBenefited,
        instructor_name: formData.instructorName,
        contact_number: formData.contactNumber,
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_self_defense`;
    await setDoc(doc(db, 'self_defense_form_data', docId), docData);
    console.log('[Self Defense Form] Submission saved/updated with ID:', docId);
    return docId;
}

/**
 * Get all Self Defense form submissions for a specific user.
 */
export async function getSelfDefenseFormSubmissions(userId: string): Promise<SelfDefenseFormSubmission[]> {
    const q = query(
        collection(db, 'self_defense_form_data'),
        where('submitted_by', '==', userId),
        orderBy('created_at', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const d = doc.data();
        let createdAt = '';
        if (d.created_at?.toDate) {
            createdAt = d.created_at.toDate().toISOString();
        } else if (typeof d.created_at === 'string') {
            createdAt = d.created_at;
        }
        return {
            id: doc.id,
            school_id: d.school_id ?? '',
            school_name: d.school_name ?? '',
            district: d.district ?? '',
            udise: d.udise ?? '',
            submitted_by: d.submitted_by ?? '',
            submitted_by_name: d.submitted_by_name ?? '',
            submitted_by_role: d.submitted_by_role ?? '',
            photo: d.photo ?? '',
            classes_per_week: d.classes_per_week ?? '',
            classes_per_month: d.classes_per_month ?? '',
            girl_participants: d.girl_participants ?? '',
            girls_benefited: d.girls_benefited ?? '',
            instructor_name: d.instructor_name ?? '',
            contact_number: d.contact_number ?? '',
            created_at: createdAt,
        } as SelfDefenseFormSubmission;
    });
}
