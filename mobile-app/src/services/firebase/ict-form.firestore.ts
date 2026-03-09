/**
 * ICT Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission and retrieval of ICT activity form data.
 * Collection: `ict_form_data`
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
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import type { ICTFormData } from '../../lib/zod';
import { uploadICTFormFile } from '../storage.service';

const db = getFirebaseDb();

export interface ICTFormSubmission {
    id: string;
    // School info
    school_id: string;
    school_name: string;
    district: string;
    udise: string;
    submitted_by: string;
    submitted_by_name: string;
    submitted_by_role: string;
    // Page 1
    have_smart_tvs: string;
    have_ups: string;
    have_pendrives: string;
    ict_materials_working: string;
    smart_tvs_wall_mounted: string;
    smart_tvs_location: string;
    photos_of_materials: string[];
    // Page 2
    smart_class_in_routine: string;
    school_routine: string;
    weekly_smart_class: string;
    has_logbook: string;
    logbook: string;
    // Page 3
    students_benefited: string;
    smart_tvs_other_purposes: string;
    is_smart_class_benefiting: string;
    benefit_comment: string;
    noticed_impact: string;
    how_program_helped: string;
    observations: string;
    // Metadata
    created_at: string;
}

/**
 * Upload all ICT form files (images + PDFs) and return download URLs.
 */
async function uploadFormFiles(
    formData: ICTFormData,
    userId: string,
): Promise<{
    photoUrls: string[];
    schoolRoutineUrl: string;
    logbookUrl: string;
}> {
    // Upload material photos
    const photoUrls: string[] = [];
    for (const photoUri of formData.ictMaterialPhotos) {
        const result = await uploadICTFormFile(photoUri, userId, 'photos');
        if (result.success && result.fileUrl) {
            photoUrls.push(result.fileUrl);
        }
    }

    // Upload school routine PDF
    let schoolRoutineUrl = '';
    if (formData.schoolRoutinePdf) {
        const result = await uploadICTFormFile(formData.schoolRoutinePdf, userId, 'pdfs');
        if (result.success && result.fileUrl) {
            schoolRoutineUrl = result.fileUrl;
        }
    }

    // Upload logbook PDF
    let logbookUrl = '';
    if (formData.logbookPdf) {
        const result = await uploadICTFormFile(formData.logbookPdf, userId, 'pdfs');
        if (result.success && result.fileUrl) {
            logbookUrl = result.fileUrl;
        }
    }

    return { photoUrls, schoolRoutineUrl, logbookUrl };
}

/**
 * Submit a completed ICT form to Firestore.
 */
export async function submitICTForm(
    formData: ICTFormData,
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
    const { photoUrls, schoolRoutineUrl, logbookUrl } = await uploadFormFiles(
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
        // Page 1
        have_smart_tvs: formData.haveSmartTvs,
        have_ups: formData.haveUps,
        have_pendrives: formData.havePendrives,
        ict_materials_working: formData.ictMaterialsWorking,
        smart_tvs_wall_mounted: formData.smartTvsWallMounted,
        smart_tvs_location: formData.smartTvsLocation,
        photos_of_materials: photoUrls,
        // Page 2
        smart_class_in_routine: formData.smartClassInRoutine,
        school_routine: schoolRoutineUrl,
        weekly_smart_class: formData.weeklySmartClassDays,
        has_logbook: formData.hasLogbook,
        logbook: logbookUrl,
        // Page 3
        students_benefited: formData.studentsBenefited,
        smart_tvs_other_purposes: formData.smartTvsOtherPurposes,
        is_smart_class_benefiting: formData.isSmartClassBenefiting,
        benefit_comment: formData.benefitComment || '',
        noticed_impact: formData.teacherImpact,
        how_program_helped: formData.howProgramHelped,
        observations: formData.observations,
        // Metadata
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_ict`;
    await setDoc(doc(db, 'ict_form_data', docId), docData);
    console.log('[ICT Form] Submission saved/updated with ID:', docId);
    return docId;
}

/**
 * Get all ICT form submissions for a specific user.
 */
export async function getICTFormSubmissions(userId: string): Promise<ICTFormSubmission[]> {
    const q = query(
        collection(db, 'ict_form_data'),
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
            have_smart_tvs: d.have_smart_tvs ?? '',
            have_ups: d.have_ups ?? '',
            have_pendrives: d.have_pendrives ?? '',
            ict_materials_working: d.ict_materials_working ?? '',
            smart_tvs_wall_mounted: d.smart_tvs_wall_mounted ?? '',
            smart_tvs_location: d.smart_tvs_location ?? '',
            photos_of_materials: d.photos_of_materials ?? [],
            smart_class_in_routine: d.smart_class_in_routine ?? '',
            school_routine: d.school_routine ?? '',
            weekly_smart_class: d.weekly_smart_class ?? '',
            has_logbook: d.has_logbook ?? '',
            logbook: d.logbook ?? '',
            students_benefited: d.students_benefited ?? '',
            smart_tvs_other_purposes: d.smart_tvs_other_purposes ?? '',
            is_smart_class_benefiting: d.is_smart_class_benefiting ?? '',
            benefit_comment: d.benefit_comment ?? '',
            noticed_impact: d.noticed_impact ?? '',
            how_program_helped: d.how_program_helped ?? '',
            observations: d.observations ?? '',
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
