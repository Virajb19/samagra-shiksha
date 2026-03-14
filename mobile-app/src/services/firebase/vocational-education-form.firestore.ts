/**
 * Vocational Education Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission and retrieval of Vocational Education activity form data.
 * Collection: `vocational_education_form_data`
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
import type { VocationalEducationFormData } from '../../lib/zod';
import { uploadVocationalEducationFormFile } from '../storage.service';

const db = getFirebaseDb();

export interface VocationalEducationFormSubmission {
    id: string;
    school_id: string;
    school_name: string;
    district: string;
    udise: string;
    submitted_by: string;
    submitted_by_name: string;
    submitted_by_role: string;
    trade: string;
    class_9: { boys: string; girls: string };
    class_10: { boys: string; girls: string };
    class_11: { boys: string; girls: string };
    class_12: { boys: string; girls: string };
    is_lab_setup: string;
    lab_photo: string;
    lab_not_setup_reason: string;
    is_guest_lecture_done: string;
    guest_lecture_photo: string;
    guest_lecture_not_done_reason: string;
    is_industrial_visit_done: string;
    industrial_visit_photo: string;
    industrial_visit_not_done_reason: string;
    is_internship_done: string;
    internship_report: string;
    internship_not_done_reason: string;
    best_practices: string;
    best_practice_photos: string[];
    success_stories: string;
    success_story_photos: string[];
    created_at: string;
}

/**
 * Upload all form images and return download URLs.
 */
async function uploadFormFiles(
    formData: VocationalEducationFormData,
    userId: string,
): Promise<{
    labPhotoUrl: string;
    guestLecturePhotoUrl: string;
    industrialVisitPhotoUrl: string;
    bestPracticePhotoUrls: string[];
    successStoryPhotoUrls: string[];
}> {
    let labPhotoUrl = '';
    if (formData.labPhoto) {
        const result = await uploadVocationalEducationFormFile(formData.labPhoto, userId, 'lab');
        if (result.success && result.fileUrl) labPhotoUrl = result.fileUrl;
    }

    let guestLecturePhotoUrl = '';
    if (formData.guestLecturePhoto) {
        const result = await uploadVocationalEducationFormFile(formData.guestLecturePhoto, userId, 'guest-lecture');
        if (result.success && result.fileUrl) guestLecturePhotoUrl = result.fileUrl;
    }

    let industrialVisitPhotoUrl = '';
    if (formData.industrialVisitPhoto) {
        const result = await uploadVocationalEducationFormFile(formData.industrialVisitPhoto, userId, 'industrial-visit');
        if (result.success && result.fileUrl) industrialVisitPhotoUrl = result.fileUrl;
    }

    const bestPracticePhotoUrls: string[] = [];
    for (const uri of formData.bestPracticePhotos) {
        const result = await uploadVocationalEducationFormFile(uri, userId, 'best-practices');
        if (result.success && result.fileUrl) bestPracticePhotoUrls.push(result.fileUrl);
    }

    const successStoryPhotoUrls: string[] = [];
    for (const uri of formData.successStoryPhotos) {
        const result = await uploadVocationalEducationFormFile(uri, userId, 'success-stories');
        if (result.success && result.fileUrl) successStoryPhotoUrls.push(result.fileUrl);
    }

    return { labPhotoUrl, guestLecturePhotoUrl, industrialVisitPhotoUrl, bestPracticePhotoUrls, successStoryPhotoUrls };
}

/**
 * Submit a completed Vocational Education form to Firestore.
 */
export async function submitVocationalEducationForm(
    formData: VocationalEducationFormData,
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
    const {
        labPhotoUrl,
        guestLecturePhotoUrl,
        industrialVisitPhotoUrl,
        bestPracticePhotoUrls,
        successStoryPhotoUrls,
    } = await uploadFormFiles(formData, userInfo.userId);

    const docData = {
        school_id: userInfo.schoolId,
        school_name: userInfo.schoolName,
        district: userInfo.district,
        udise: userInfo.udise,
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        submitted_by_role: userInfo.userRole,
        trade: formData.trade,
        class_9: { boys: formData.class9.boys, girls: formData.class9.girls },
        class_10: { boys: formData.class10.boys, girls: formData.class10.girls },
        class_11: { boys: formData.class11.boys, girls: formData.class11.girls },
        class_12: { boys: formData.class12.boys, girls: formData.class12.girls },
        is_lab_setup: formData.isLabSetup,
        lab_photo: labPhotoUrl || '',
        lab_not_setup_reason: formData.labNotSetupReason || '',
        is_guest_lecture_done: formData.isGuestLectureDone,
        guest_lecture_photo: guestLecturePhotoUrl || '',
        guest_lecture_not_done_reason: formData.guestLectureNotDoneReason || '',
        is_industrial_visit_done: formData.isIndustrialVisitDone,
        industrial_visit_photo: industrialVisitPhotoUrl || '',
        industrial_visit_not_done_reason: formData.industrialVisitNotDoneReason || '',
        is_internship_done: formData.isInternshipDone,
        internship_report: formData.internshipReport || '',
        internship_not_done_reason: formData.internshipNotDoneReason || '',
        best_practices: formData.bestPractices,
        best_practice_photos: bestPracticePhotoUrls,
        success_stories: formData.successStories,
        success_story_photos: successStoryPhotoUrls,
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_vocational_education`;
    await setDoc(doc(db, 'vocational_education_form_data', docId), docData);
    console.log('[Vocational Education Form] Submission saved/updated with ID:', docId);
    return docId;
}

/**
 * Get all vocational education form submissions for a specific user.
 */
export async function getVocationalEducationFormSubmissions(
    userId: string,
): Promise<VocationalEducationFormSubmission[]> {
    const q = query(
        collection(db, 'vocational_education_form_data'),
        where('submitted_by', '==', userId),
        orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((submissionDoc) => mapVocationalSubmission(submissionDoc.id, submissionDoc.data()));
}

/**
 * Get the latest Vocational Education submission for a specific user.
 */
export async function getVocationalEducationFormSubmission(
    userId: string,
): Promise<VocationalEducationFormSubmission | null> {
    const docId = `${userId}_vocational_education`;
    const submissionDoc = await getDoc(doc(db, 'vocational_education_form_data', docId));
    if (!submissionDoc.exists()) {
        return null;
    }
    return mapVocationalSubmission(submissionDoc.id, submissionDoc.data());
}

function mapVocationalSubmission(id: string, d: any): VocationalEducationFormSubmission {
    return {
        id,
        school_id: d.school_id ?? '',
        school_name: d.school_name ?? '',
        district: d.district ?? '',
        udise: d.udise ?? '',
        submitted_by: d.submitted_by ?? '',
        submitted_by_name: d.submitted_by_name ?? '',
        submitted_by_role: d.submitted_by_role ?? '',
        trade: d.trade ?? '',
        class_9: d.class_9 ?? { boys: '0', girls: '0' },
        class_10: d.class_10 ?? { boys: '0', girls: '0' },
        class_11: d.class_11 ?? { boys: '0', girls: '0' },
        class_12: d.class_12 ?? { boys: '0', girls: '0' },
        is_lab_setup: d.is_lab_setup ?? '',
        lab_photo: d.lab_photo ?? '',
        lab_not_setup_reason: d.lab_not_setup_reason ?? '',
        is_guest_lecture_done: d.is_guest_lecture_done ?? '',
        guest_lecture_photo: d.guest_lecture_photo ?? '',
        guest_lecture_not_done_reason: d.guest_lecture_not_done_reason ?? '',
        is_industrial_visit_done: d.is_industrial_visit_done ?? '',
        industrial_visit_photo: d.industrial_visit_photo ?? '',
        industrial_visit_not_done_reason: d.industrial_visit_not_done_reason ?? '',
        is_internship_done: d.is_internship_done ?? '',
        internship_report: d.internship_report ?? '',
        internship_not_done_reason: d.internship_not_done_reason ?? '',
        best_practices: d.best_practices ?? '',
        best_practice_photos: d.best_practice_photos ?? [],
        success_stories: d.success_stories ?? '',
        success_story_photos: d.success_story_photos ?? [],
        created_at: d.created_at?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    };
}
