/**
 * NSCBAV Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission and retrieval of NSCBAV warden activity form data.
 * Collection: `nscbav_form_data`
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
import type { NSCBAVFormData } from '../../lib/zod';
import { uploadNSCBAVFormFile } from '../storage.service';

const db = getFirebaseDb();

export interface NSCBAVFormSubmission {
    id: string;
    ebrc: string;
    district: string;
    submitted_by: string;
    submitted_by_name: string;
    submitted_by_role: string;
    photo: string;
    girl_participants: string;
    girls_benefited: string;
    materials_used: string;
    instructor_name: string;
    contact_number: string;
    best_practices: string;
    success_story: string;
    created_at: string;
}

/**
 * Submit a completed NSCBAV form to Firestore.
 */
export async function submitNSCBAVForm(
    formData: NSCBAVFormData,
    userInfo: {
        userId: string;
        userName: string;
        userRole: string;
        ebrc: string;
        district: string;
    },
): Promise<string> {
    // Upload the photo
    let photoUrl = '';
    const result = await uploadNSCBAVFormFile(formData.photo, userInfo.userId);
    if (result.success && result.fileUrl) {
        photoUrl = result.fileUrl;
    }

    const docData = {
        ebrc: userInfo.ebrc,
        district: userInfo.district,
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        submitted_by_role: userInfo.userRole,
        photo: photoUrl,
        girl_participants: formData.girlParticipants,
        girls_benefited: formData.girlsBenefited,
        materials_used: formData.materialsUsed,
        instructor_name: formData.instructorName,
        contact_number: formData.contactNumber,
        best_practices: formData.bestPractices,
        success_story: formData.successStory ?? '',
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_nscbav`;
    await setDoc(doc(db, 'nscbav_form_data', docId), docData);
    console.log('[NSCBAV Form] Submission saved/updated with ID:', docId);
    return docId;
}

/**
 * Get all NSCBAV form submissions for a specific user.
 */
export async function getNSCBAVFormSubmissions(userId: string): Promise<NSCBAVFormSubmission[]> {
    const q = query(
        collection(db, 'nscbav_form_data'),
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
            ebrc: d.ebrc ?? '',
            district: d.district ?? '',
            submitted_by: d.submitted_by ?? '',
            submitted_by_name: d.submitted_by_name ?? '',
            submitted_by_role: d.submitted_by_role ?? '',
            photo: d.photo ?? '',
            girl_participants: d.girl_participants ?? '',
            girls_benefited: d.girls_benefited ?? '',
            materials_used: d.materials_used ?? '',
            instructor_name: d.instructor_name ?? '',
            contact_number: d.contact_number ?? '',
            best_practices: d.best_practices ?? '',
            success_story: d.success_story ?? '',
            created_at: createdAt,
        } as NSCBAVFormSubmission;
    });
}
