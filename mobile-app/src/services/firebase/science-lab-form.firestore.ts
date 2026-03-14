/**
 * Science Lab Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission and retrieval of Science Lab activity form data.
 * Collection: `science_lab_form_data`
 */

import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import type { ScienceLabFormData } from '../../lib/zod';
import { uploadScienceLabFormFile } from '../storage.service';

const db = getFirebaseDb();

export interface ScienceLabFormSubmission {
    id: string;
    school_id: string;
    school_name: string;
    district: string;
    udise: string;
    submitted_by: string;
    submitted_by_name: string;
    submitted_by_role: string;
    kit_teacher_name: string;
    experiments_per_week: string;
    student_photos: string[];
    logbook_photos: string[];
    created_at: string;
}

/**
 * Upload all Science Lab form images and return download URLs.
 */
async function uploadFormFiles(
    formData: ScienceLabFormData,
    userId: string,
): Promise<{
    studentPhotoUrls: string[];
    logbookPhotoUrls: string[];
}> {
    const studentPhotoUrls: string[] = [];
    for (const photoUri of formData.studentPhotos) {
        const result = await uploadScienceLabFormFile(photoUri, userId, 'student-photos');
        if (result.success && result.fileUrl) {
            studentPhotoUrls.push(result.fileUrl);
        }
    }

    const logbookPhotoUrls: string[] = [];
    for (const photoUri of formData.logbookPhotos) {
        const result = await uploadScienceLabFormFile(photoUri, userId, 'logbook-photos');
        if (result.success && result.fileUrl) {
            logbookPhotoUrls.push(result.fileUrl);
        }
    }

    return { studentPhotoUrls, logbookPhotoUrls };
}

/**
 * Submit a completed Science Lab form to Firestore.
 */
export async function submitScienceLabForm(
    formData: ScienceLabFormData,
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
    const { studentPhotoUrls, logbookPhotoUrls } = await uploadFormFiles(
        formData,
        userInfo.userId,
    );

    const docData = {
        school_id: userInfo.schoolId,
        school_name: userInfo.schoolName,
        district: userInfo.district,
        udise: userInfo.udise,
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        submitted_by_role: userInfo.userRole,
        kit_teacher_name: formData.kitTeacherName,
        experiments_per_week: formData.experimentsPerWeek,
        student_photos: studentPhotoUrls,
        logbook_photos: logbookPhotoUrls,
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_science_lab`;
    await setDoc(doc(db, 'science_lab_form_data', docId), docData);
    console.log('[Science Lab Form] Submission saved/updated with ID:', docId);
    return docId;
}

/**
 * Get all Science Lab form submissions for a specific user.
 */
export async function getScienceLabFormSubmissions(userId: string): Promise<ScienceLabFormSubmission[]> {
    const q = query(
        collection(db, 'science_lab_form_data'),
        where('submitted_by', '==', userId),
        orderBy('created_at', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((submissionDoc) => mapScienceLabSubmission(submissionDoc.id, submissionDoc.data()));
}

/**
 * Get the latest Science Lab submission for a specific user.
 */
export async function getScienceLabFormSubmission(userId: string): Promise<ScienceLabFormSubmission | null> {
    const docId = `${userId}_science_lab`;
    const submissionDoc = await getDoc(doc(db, 'science_lab_form_data', docId));
    if (!submissionDoc.exists()) {
        return null;
    }
    return mapScienceLabSubmission(submissionDoc.id, submissionDoc.data());
}

function mapScienceLabSubmission(id: string, d: any): ScienceLabFormSubmission {
    let createdAt = '';
    if (d.created_at?.toDate) {
        createdAt = d.created_at.toDate().toISOString();
    } else if (typeof d.created_at === 'string') {
        createdAt = d.created_at;
    }
    return {
        id,
        school_id: d.school_id ?? '',
        school_name: d.school_name ?? '',
        district: d.district ?? '',
        udise: d.udise ?? '',
        submitted_by: d.submitted_by ?? '',
        submitted_by_name: d.submitted_by_name ?? '',
        submitted_by_role: d.submitted_by_role ?? '',
        kit_teacher_name: d.kit_teacher_name ?? '',
        experiments_per_week: d.experiments_per_week ?? '',
        student_photos: d.student_photos ?? [],
        logbook_photos: d.logbook_photos ?? [],
        created_at: createdAt,
    };
}
