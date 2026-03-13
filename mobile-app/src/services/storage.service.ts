/**
 * Storage Service — Firebase Storage
 *
 * Handles file uploads (profile images, event photos, etc.)
 * to Firebase Cloud Storage.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '../lib/firebase';

//  Types 

export interface UploadResult {
    success: boolean;
    fileId?: string;
    fileUrl?: string;
    error?: string;
}

//  Helpers 

/**
 * Convert a local file URI to a Blob that Firebase Storage can accept.
 */
async function uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return response.blob();
}

//  Upload functions 

/**
 * Get a displayable image URL.
 * If the stored URL is already a full https URL, return it as-is.
 * Returns undefined when no URL is available.
 */
export function getImagePreviewUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    // Already a full URL (Firebase download URLs, etc.)
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return undefined;
}

/**
 * Upload a profile image to Firebase Storage.
 *
 * Path: `profile-photos/<userId>/<timestamp>_<filename>`
 *
 * Must be called AFTER the user's Firebase Auth account is created
 * so that storage security rules (which check `request.auth.uid`) pass.
 *
 * @param imageUri – Local URI of the image (from camera/gallery picker)
 * @param userId   – Firebase Auth UID of the newly-created user
 * @returns Upload result including the public download URL
 */
export async function uploadProfileImage(imageUri: string, userId: string): Promise<UploadResult> {
    try {
        if (!imageUri) {
            return { success: true }; // Nothing to upload
        }

        console.log('[Storage] Uploading profile image to Firebase Storage...');

        const storage = getFirebaseStorage();

        // Derive file name from URI
        const uriParts = imageUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `profile_${Date.now()}.jpg`;
        const storagePath = `profile-photos/${userId}/${Date.now()}_${fileName}`;

        // Convert local URI  Blob  upload
        const blob = await uriToBlob(imageUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        // Get the public download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Upload successful:', downloadURL);

        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload an ICT form file (image or PDF) to Firebase Storage.
 *
 * Path: `ict-form-files/<userId>/<timestamp>_<filename>`
 *
 * @param fileUri  – Local URI of the file (image or PDF)
 * @param userId   – Firebase Auth UID
 * @param subfolder – Optional subfolder name (e.g. 'photos', 'pdfs')
 * @returns Upload result with download URL
 */
export async function uploadICTFormFile(
    fileUri: string,
    userId: string,
    subfolder: string = 'files',
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading ICT form file to Firebase Storage...');

        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `ict_${Date.now()}.jpg`;
        const storagePath = `ict-form-files/${userId}/${subfolder}/${Date.now()}_${fileName}`;

        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] ICT form file upload successful:', downloadURL);

        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] ICT form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload an event proof image to Firebase Storage.
 *
 * Path: `event-images/<taskId>/<eventType>_<timestamp>.jpg`
 *
 * @param imageUri  – Local URI of the captured image
 * @param taskId    – ID of the task this event belongs to
 * @param eventType – e.g. PICKUP_POLICE_STATION
 * @returns Upload result with download URL
 */
export async function uploadEventImage(
    imageUri: string,
    taskId: string,
    eventType: string,
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading event image to Firebase Storage...');

        const storage = getFirebaseStorage();
        const storagePath = `event-images/${taskId}/${eventType}_${Date.now()}.jpg`;

        const blob = await uriToBlob(imageUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Event image upload successful:', downloadURL);

        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Event image upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload event image';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload a Library form file (image) to Firebase Storage.
 *
 * Path: `library-form-files/<userId>/<subfolder>/<timestamp>_<filename>`
 *
 * @param fileUri   – Local URI of the file (image)
 * @param userId    – Firebase Auth UID
 * @param subfolder – Subfolder name (e.g. 'student-photos', 'logbook-photos')
 * @returns Upload result with download URL
 */
export async function uploadLibraryFormFile(
    fileUri: string,
    userId: string,
    subfolder: string = 'photos',
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading Library form file to Firebase Storage...');

        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `library_${Date.now()}.jpg`;
        const storagePath = `library-form-files/${userId}/${subfolder}/${Date.now()}_${fileName}`;

        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Library form file upload successful:', downloadURL);

        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Library form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload a Science Lab form file (image) to Firebase Storage.
 *
 * Path: `science-lab-form-files/<userId>/<subfolder>/<timestamp>_<filename>`
 */
export async function uploadScienceLabFormFile(
    fileUri: string,
    userId: string,
    subfolder: string = 'photos',
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading Science Lab form file...');
        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `scilab_${Date.now()}.jpg`;
        const storagePath = `science-lab-form-files/${userId}/${subfolder}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Science Lab form file upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Science Lab form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload a Self Defense form file (image) to Firebase Storage.
 *
 * Path: `self-defense-form-files/<userId>/<timestamp>_<filename>`
 */
export async function uploadSelfDefenseFormFile(
    fileUri: string,
    userId: string,
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading Self Defense form file...');
        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `selfdef_${Date.now()}.jpg`;
        const storagePath = `self-defense-form-files/${userId}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Self Defense form file upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Self Defense form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload a KGBV form file (image) to Firebase Storage.
 *
 * Path: `kgbv-form-files/<userId>/<timestamp>_<filename>`
 */
export async function uploadKGBVFormFile(
    fileUri: string,
    userId: string,
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading KGBV form file...');
        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `kgbv_${Date.now()}.jpg`;
        const storagePath = `kgbv-form-files/${userId}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] KGBV form file upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] KGBV form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload an NSCBAV form file (image) to Firebase Storage.
 *
 * Path: `nscbav-form-files/<userId>/<timestamp>_<filename>`
 */
export async function uploadNSCBAVFormFile(
    fileUri: string,
    userId: string,
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading NSCBAV form file...');
        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `nscbav_${Date.now()}.jpg`;
        const storagePath = `nscbav-form-files/${userId}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] NSCBAV form file upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] NSCBAV form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload an IE visit form file (image) to Firebase Storage.
 *
 * Path: `ie-visit-form-files/<userId>/<subfolder>/<timestamp>_<filename>`
 */
export async function uploadIEVisitFormFile(
    fileUri: string,
    userId: string,
    subfolder: string = 'photos',
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading IE visit form file...');
        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `ie_visit_${Date.now()}.jpg`;
        const storagePath = `ie-visit-form-files/${userId}/${subfolder}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] IE visit form file upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] IE visit form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}


/**
 * Upload a Vocational Education form file to Firebase Storage.
 *
 * Path: `vocational-education-form-files/<userId>/<subfolder>/<timestamp>_<filename>`
 *
 * @param fileUri   – Local URI of the file (image)
 * @param userId    – Firebase Auth UID
 * @param subfolder – Optional subfolder name (e.g. 'photos', 'lab', 'guest-lecture')
 * @returns Upload result with download URL
 */
export async function uploadVocationalEducationFormFile(
    fileUri: string,
    userId: string,
    subfolder: string = 'photos',
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading vocational education form file...');
        const storage = getFirebaseStorage();
        const uriParts = fileUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `vocational_${Date.now()}.jpg`;
        const storagePath = `vocational-education-form-files/${userId}/${subfolder}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(fileUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Vocational education form file upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Vocational education form file upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return { success: false, error: errorMessage };
    }
}

/**
 * Upload a project status photo to Firebase Storage.
 *
 * Path: `project-update-files/<userId>/<timestamp>_<filename>`
 *
 * @param imageUri – Local URI of the image (from camera/gallery picker)
 * @param userId   – Firebase Auth UID
 * @returns Upload result with download URL
 */
export async function uploadProjectPhoto(
    imageUri: string,
    userId: string,
): Promise<UploadResult> {
    try {
        console.log('[Storage] Uploading project photo...');
        const storage = getFirebaseStorage();
        const uriParts = imageUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `project_${Date.now()}.jpg`;
        const storagePath = `project-update-files/${userId}/${Date.now()}_${fileName}`;
        const blob = await uriToBlob(imageUri);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Project photo upload successful:', downloadURL);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Storage] Project photo upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo';
        return { success: false, error: errorMessage };
    }
}
