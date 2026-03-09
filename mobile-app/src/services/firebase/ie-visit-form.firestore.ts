/**
 * IE Visit Form — Firestore Data Access Layer (Mobile)
 *
 * Handles submission of IE school visit and home visit forms.
 * Collections: `ie_school_visit_data`, `ie_home_visit_data`
 */

import {
    doc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import type { IESchoolVisitFormData, IEHomeVisitFormData } from '../../lib/zod';
import { uploadIEVisitFormFile } from '../storage.service';

const db = getFirebaseDb();

/**
 * Upload geo-tagged photos and return download URLs.
 */
async function uploadVisitPhotos(
    photoUris: string[],
    userId: string,
): Promise<string[]> {
    const urls: string[] = [];
    for (const uri of photoUris) {
        const result = await uploadIEVisitFormFile(uri, userId, 'photos');
        if (result.success && result.fileUrl) {
            urls.push(result.fileUrl);
        }
    }
    return urls;
}

/**
 * Submit an IE School Visit form to Firestore.
 */
export async function submitIESchoolVisitForm(
    formData: IESchoolVisitFormData,
    userInfo: {
        userId: string;
        userName: string;
        rciNumber: string;
        ebrc: string;
        districtName: string;
        schoolName: string;
    },
): Promise<string> {
    const photoUrls = await uploadVisitPhotos(formData.geoTaggedPhotos, userInfo.userId);

    const docData = {
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        rci_number: userInfo.rciNumber,
        ebrc: userInfo.ebrc,
        district: userInfo.districtName,
        school: userInfo.schoolName,
        school_id: formData.schoolId,
        district_id: formData.districtId,
        name_of_cwsn: formData.nameOfCwSN,
        type_of_disability: formData.typeOfDisability,
        gender: formData.gender,
        age: formData.age,
        activities_topics: formData.activitiesTopics,
        therapy_type: formData.therapyType || '',
        therapy_brief: formData.therapyBrief,
        expected_outcome: formData.expectedOutcome,
        was_goal_achieved: formData.wasGoalAchieved,
        photos: photoUrls,
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_ie_school_visit`;
    await setDoc(doc(db, 'ie_school_visit_data', docId), docData);
    console.log('[IE School Visit] Submission saved/updated with ID:', docId);
    return docId;
}

/**
 * Submit an IE Home Visit form to Firestore.
 */
export async function submitIEHomeVisitForm(
    formData: IEHomeVisitFormData,
    userInfo: {
        userId: string;
        userName: string;
        rciNumber: string;
        ebrc: string;
        districtName: string;
    },
): Promise<string> {
    const photoUrls = await uploadVisitPhotos(formData.geoTaggedPhotos, userInfo.userId);

    const docData = {
        submitted_by: userInfo.userId,
        submitted_by_name: userInfo.userName,
        rci_number: userInfo.rciNumber,
        ebrc: userInfo.ebrc,
        district: userInfo.districtName,
        name_of_cwsn: formData.nameOfCwSN,
        type_of_disability: formData.typeOfDisability,
        gender: formData.gender,
        age: formData.age,
        activities_topics: formData.activitiesTopics,
        therapy_type: formData.therapyType || '',
        therapy_brief: formData.therapyBrief,
        expected_outcome: formData.expectedOutcome,
        was_goal_achieved: formData.wasGoalAchieved,
        photos: photoUrls,
        created_at: serverTimestamp(),
    };

    const docId = `${userInfo.userId}_ie_home_visit`;
    await setDoc(doc(db, 'ie_home_visit_data', docId), docData);
    console.log('[IE Home Visit] Submission saved/updated with ID:', docId);
    return docId;
}
