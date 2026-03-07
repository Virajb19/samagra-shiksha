/**
 * Project Service — Firebase Firestore + Storage
 *
 * Handles project queries and status updates for Junior Engineers.
 * Projects are read from `projects` collection.
 * Updates are written to `project_updates` collection and
 * the parent project's progress/photos are updated accordingly.
 */

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    limit as queryLimit,
    startAfter,
    getCountFromServer,
    QueryConstraint,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseDb, getFirebaseStorage } from '../lib/firebase';
import type { Project, ProjectUpdate } from '../types';

// ── Helpers ──

function toIso(value: unknown): string {
    if (!value) return new Date(0).toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (
        typeof value === 'object' &&
        value !== null &&
        'seconds' in value
    ) {
        return new Date((value as { seconds: number }).seconds * 1000).toISOString();
    }
    return new Date(0).toISOString();
}

function docToProject(docId: string, data: Record<string, unknown>): Project {
    return {
        id: docId,
        project_school_id: (data.project_school_id as string) || '',
        school_name: (data.school_name as string) || '',
        district_name: (data.district_name as string) || '',
        udise_code: (data.udise_code as string) || '',
        pab_year: (data.pab_year as Project['pab_year']) || '2024 - 2025',
        category: (data.category as Project['category']) || 'Elementary',
        activity: (data.activity as Project['activity']) || 'Major Repair',
        contractor: (data.contractor as string) || undefined,
        status: (data.status as Project['status']) || 'Not Started',
        progress: (data.progress as number) || 0,
        photos: (data.photos as string[]) || [],
        created_at: toIso(data.created_at),
        updated_at: toIso(data.updated_at),
    };
}

function docToProjectUpdate(docId: string, data: Record<string, unknown>): ProjectUpdate {
    return {
        id: docId,
        project_id: (data.project_id as string) || '',
        user_id: (data.user_id as string) || '',
        user_name: (data.user_name as string) || '',
        completion_status: (data.completion_status as number) || 0,
        comment: (data.comment as string) || null,
        photos: (data.photos as string[]) || [],
        location_address: (data.location_address as string) || null,
        latitude: (data.latitude as number) || null,
        longitude: (data.longitude as number) || null,
        created_at: toIso(data.created_at),
    };
}

// ── Queries ──

/**
 * Get projects assigned to the user's district.
 * Junior Engineers see all projects in their district.
 */
export async function getProjectsByDistrict(districtName: string): Promise<Project[]> {
    const db = getFirebaseDb();
    const col = collection(db, 'projects');
    const q = query(
        col,
        where('district_name', '==', districtName),
        orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToProject(d.id, d.data() as Record<string, unknown>));
}

/**
 * Get projects filtered by search/filter criteria within a district.
 */
export async function getFilteredProjects(
    districtName: string,
    options?: {
        category?: string;
        activity?: string;
        pabYear?: string;
        searchText?: string;
    },
): Promise<Project[]> {
    const db = getFirebaseDb();
    const col = collection(db, 'projects');

    const constraints: Parameters<typeof query>[1][] = [
        where('district_name', '==', districtName),
    ];

    if (options?.category) {
        constraints.push(where('category', '==', options.category));
    }
    if (options?.activity) {
        constraints.push(where('activity', '==', options.activity));
    }
    if (options?.pabYear) {
        constraints.push(where('pab_year', '==', options.pabYear));
    }

    constraints.push(orderBy('created_at', 'desc'));

    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    let projects = snap.docs.map((d) => docToProject(d.id, d.data() as Record<string, unknown>));

    // Client-side text search (Firestore can't do substring matching)
    if (options?.searchText) {
        const searchLower = options.searchText.toLowerCase();
        projects = projects.filter(
            (p) =>
                p.school_name.toLowerCase().includes(searchLower) ||
                p.activity.toLowerCase().includes(searchLower) ||
                p.udise_code.includes(searchLower),
        );
    }

    return projects;
}

// ── Paginated Query ──

export interface PaginatedProjectsResponse {
    data: Project[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
}

/**
 * Get projects with cursor-based pagination and server-side filters.
 * Filters (category, activity, pabYear) are applied as Firestore where() clauses.
 * searchText is applied client-side since Firestore can't do substring matching.
 */
export async function getPaginatedProjects(
    districtName: string,
    limit = 10,
    cursor: string | null = null,
    options?: {
        category?: string;
        activity?: string;
        pabYear?: string;
        searchText?: string;
    },
): Promise<PaginatedProjectsResponse> {
    const db = getFirebaseDb();
    const col = collection(db, 'projects');

    // Build filter constraints
    const filterConstraints: QueryConstraint[] = [
        where('district_name', '==', districtName),
    ];

    if (options?.category) {
        filterConstraints.push(where('category', '==', options.category));
    }
    if (options?.activity) {
        filterConstraints.push(where('activity', '==', options.activity));
    }
    if (options?.pabYear) {
        filterConstraints.push(where('pab_year', '==', options.pabYear));
    }

    // Get total count for this filter combination
    const countQ = query(col, ...filterConstraints);
    const countSnap = await getCountFromServer(countQ);
    const total = countSnap.data().count;

    // Build paginated query
    const constraints: QueryConstraint[] = [
        ...filterConstraints,
        orderBy('created_at', 'desc'),
        queryLimit(limit + 1), // fetch one extra to detect hasMore
    ];

    if (cursor) {
        const cursorDoc = await getDoc(doc(db, 'projects', cursor));
        if (cursorDoc.exists()) {
            constraints.push(startAfter(cursorDoc));
        }
    }

    const q = query(col, ...constraints);
    const snap = await getDocs(q);

    let projects = snap.docs.slice(0, limit).map((d) =>
        docToProject(d.id, d.data() as Record<string, unknown>),
    );

    // Client-side text search (Firestore can't do substring matching)
    if (options?.searchText) {
        const searchLower = options.searchText.toLowerCase();
        projects = projects.filter(
            (p) =>
                p.school_name.toLowerCase().includes(searchLower) ||
                p.activity.toLowerCase().includes(searchLower) ||
                p.udise_code.includes(searchLower),
        );
    }

    return {
        data: projects,
        total,
        hasMore: snap.docs.length > limit,
        nextCursor: projects.length > 0 ? projects[projects.length - 1].id : null,
    };
}

/**
 * Get the 2 most recent projects in a district (for home screen preview).
 */
export async function getRecentProjects(districtName: string): Promise<Project[]> {
    const db = getFirebaseDb();
    const col = collection(db, 'projects');
    const q = query(
        col,
        where('district_name', '==', districtName),
        orderBy('created_at', 'desc'),
        queryLimit(2),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToProject(d.id, d.data() as Record<string, unknown>));
}

/**
 * Get all project updates for a specific project.
 */
export async function getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    const db = getFirebaseDb();
    const col = collection(db, 'project_updates');
    const q = query(
        col,
        where('project_id', '==', projectId),
        orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToProjectUpdate(d.id, d.data() as Record<string, unknown>));
}

// ── Upload ──

/**
 * Upload a project status photo to Firebase Storage.
 * Path: `project-update-files/<userId>/<timestamp>_<filename>`
 */
export async function uploadProjectPhoto(
    imageUri: string,
    userId: string,
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    try {
        const storage = getFirebaseStorage();
        const uriParts = imageUri.split('/');
        const fileName = uriParts[uriParts.length - 1] || `project_${Date.now()}.jpg`;
        const storagePath = `project-update-files/${userId}/${Date.now()}_${fileName}`;

        const response = await fetch(imageUri);
        const blob = await response.blob();
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);
        return { success: true, fileUrl: downloadURL };
    } catch (error) {
        console.error('[Project] Photo upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo';
        return { success: false, error: errorMessage };
    }
}

// ── Submit Update ──

export interface SubmitProjectUpdateInput {
    projectId: string;
    userId: string;
    userName: string;
    completionStatus: number;
    comment?: string;
    photoUris: string[];
    locationAddress?: string;
    latitude?: number;
    longitude?: number;
}

export interface SubmitProjectUpdateResult {
    success: boolean;
    error?: string;
}

/**
 * Submit a project status update.
 *
 * 1. Upload all photos to Storage
 * 2. Create a document in `project_updates`
 * 3. Update the parent `projects` doc with new progress & accumulated photos
 */
export async function submitProjectUpdate(
    input: SubmitProjectUpdateInput,
): Promise<SubmitProjectUpdateResult> {
    try {
        console.log('[Project] Submitting project update...');

        // 1. Upload photos
        const uploadedUrls: string[] = [];
        for (const uri of input.photoUris) {
            const result = await uploadProjectPhoto(uri, input.userId);
            if (!result.success || !result.fileUrl) {
                return { success: false, error: result.error || 'Photo upload failed' };
            }
            uploadedUrls.push(result.fileUrl);
        }

        const db = getFirebaseDb();

        // 2. Create project_updates document
        const updateData = {
            project_id: input.projectId,
            user_id: input.userId,
            user_name: input.userName,
            completion_status: input.completionStatus,
            comment: input.comment || null,
            photos: uploadedUrls,
            location_address: input.locationAddress || null,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
            created_at: Timestamp.now(),
        };

        await addDoc(collection(db, 'project_updates'), updateData);

        // 3. Update parent project progress & append photos
        const projectRef = doc(db, 'projects', input.projectId);
        await updateDoc(projectRef, {
            progress: input.completionStatus,
            photos: uploadedUrls, // Latest photos replace old ones
            updated_at: Timestamp.now(),
        });

        console.log('[Project] Update submitted successfully');
        return { success: true };
    } catch (error) {
        console.error('[Project] Submit update failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to submit update';
        return { success: false, error: errorMessage };
    }
}
