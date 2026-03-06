/**
 * Library Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission and retrieval of Library activity form data.
 * Collection: `library_form_data`
 */

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import type { LibraryFormData } from '../../lib/zod';
import { uploadLibraryFormFile } from '../storage.service';

const db = getFirebaseDb();

export interface LibraryFormSubmission {
    id: string;
    // School info
    school_id: string;
    school_name: string;
    district: string;
    udise: string;
    submitted_by: string;
    submitted_by_name: string;
    submitted_by_role: string;
    // Library data
    is_library_available: string;
    is_child_friendly: string;
    has_proper_furniture: string;
    has_management_committee: string;
    library_teacher_name: string;
    has_reading_corner: string;
    number_of_reading_corners: string;
    number_of_computers: string;
    has_readers_club: string;
    has_weekly_library_period: string;
    library_periods_per_week: string;
    received_books_from_samagra: string;
    number_of_books_received: string;
    innovative_initiative: string;
    suggestions_feedback: string;
    student_photos: string[];
    logbook_photos: string[];
    // Metadata
    created_at: string;
}

/**
 * Upload all Library form images and return download URLs.
 */
async function uploadFormFiles(
    formData: LibraryFormData,
    userId: string,
): Promise<{
    studentPhotoUrls: string[];
    logbookPhotoUrls: string[];
}> {
    // Upload student photos
    const studentPhotoUrls: string[] = [];
    for (const photoUri of formData.studentPhotos) {
        const result = await uploadLibraryFormFile(photoUri, userId, 'student-photos');
        if (result.success && result.fileUrl) {
            studentPhotoUrls.push(result.fileUrl);
        }
    }

    // Upload logbook photos
    const logbookPhotoUrls: string[] = [];
    for (const photoUri of formData.logbookPhotos) {
        const result = await uploadLibraryFormFile(photoUri, userId, 'logbook-photos');
        if (result.success && result.fileUrl) {
            logbookPhotoUrls.push(result.fileUrl);
        }
    }

    return { studentPhotoUrls, logbookPhotoUrls };
}

/**
 * Submit a completed Library form to Firestore.
 */
export async function submitLibraryForm(
    formData: LibraryFormData,
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
    // Upload files first
    const { studentPhotoUrls, logbookPhotoUrls } = await uploadFormFiles(
        formData,
        userInfo.userId,
    );

    const docData = {
        // School info
        school_id: userInfo.schoolId,
        school_name: userInfo.schoolName,
        district: userInfo.district,
        udise: userInfo.udise,
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        submitted_by_role: userInfo.userRole,
        // Library data
        is_library_available: formData.isLibraryAvailable,
        is_child_friendly: formData.isChildFriendly,
        has_proper_furniture: formData.hasProperFurniture,
        has_management_committee: formData.hasManagementCommittee,
        library_teacher_name: formData.libraryTeacherName,
        has_reading_corner: formData.hasReadingCorner,
        number_of_reading_corners: formData.numberOfReadingCorners,
        number_of_computers: formData.numberOfComputers,
        has_readers_club: formData.hasReadersClub,
        has_weekly_library_period: formData.hasWeeklyLibraryPeriod,
        library_periods_per_week: formData.libraryPeriodsPerWeek,
        received_books_from_samagra: formData.receivedBooksFromSamagra,
        number_of_books_received: formData.numberOfBooksReceived,
        innovative_initiative: formData.innovativeInitiative,
        suggestions_feedback: formData.suggestionsFeedback || '',
        student_photos: studentPhotoUrls,
        logbook_photos: logbookPhotoUrls,
        // Metadata
        created_at: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'library_form_data'), docData);
    console.log('[Library Form] Submission saved with ID:', docRef.id);
    return docRef.id;
}

/**
 * Get all Library form submissions for a specific user.
 */
export async function getLibraryFormSubmissions(userId: string): Promise<LibraryFormSubmission[]> {
    const q = query(
        collection(db, 'library_form_data'),
        where('submitted_by', '==', userId),
        orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            school_id: d.school_id ?? '',
            school_name: d.school_name ?? '',
            district: d.district ?? '',
            udise: d.udise ?? '',
            submitted_by: d.submitted_by ?? '',
            submitted_by_name: d.submitted_by_name ?? '',
            submitted_by_role: d.submitted_by_role ?? '',
            is_library_available: d.is_library_available ?? '',
            is_child_friendly: d.is_child_friendly ?? '',
            has_proper_furniture: d.has_proper_furniture ?? '',
            has_management_committee: d.has_management_committee ?? '',
            library_teacher_name: d.library_teacher_name ?? '',
            has_reading_corner: d.has_reading_corner ?? '',
            number_of_reading_corners: d.number_of_reading_corners ?? '',
            number_of_computers: d.number_of_computers ?? '',
            has_readers_club: d.has_readers_club ?? '',
            has_weekly_library_period: d.has_weekly_library_period ?? '',
            library_periods_per_week: d.library_periods_per_week ?? '',
            received_books_from_samagra: d.received_books_from_samagra ?? '',
            number_of_books_received: d.number_of_books_received ?? '',
            innovative_initiative: d.innovative_initiative ?? '',
            suggestions_feedback: d.suggestions_feedback ?? '',
            student_photos: d.student_photos ?? [],
            logbook_photos: d.logbook_photos ?? [],
            created_at: toIso(d.created_at),
        };
    });
}

function toIso(val: any): string {
    if (!val) return new Date().toISOString();
    if (val?.toDate) return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') return val;
    return new Date().toISOString();
}
