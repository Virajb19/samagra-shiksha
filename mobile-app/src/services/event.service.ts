/**
 * Event Service — Firebase Storage + Firestore
 *
 * Handles task-event submission with image proof.
 * Image is uploaded to Firebase Storage, then a Firestore document is
 * created in `task_events/<auto-id>`.
 */

import { doc, collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { uploadEventImage } from './storage.service';
import { hasInternetConnection, checkNetworkStatus, getNetworkErrorMessage } from '../utils/network';
import { EventType, TaskEvent } from '../types';

//  Types 

export interface SubmitEventResult {
    success: boolean;
    event?: TaskEvent;
    error?: string;
    errorCode?: 'DUPLICATE_EVENT' | 'TASK_COMPLETED' | 'TIME_VIOLATION' | 'UNAUTHORIZED' | 'NETWORK' | 'NO_INTERNET' | 'UNKNOWN';
}

//  Submit event 

/**
 * Submit a task event with image proof.
 *
 * 1. Check network
 * 2. Upload image to Firebase Storage
 * 3. Write event document to Firestore
 *
 * @param taskId    – The task ID
 * @param eventType – PICKUP_POLICE_STATION, ARRIVAL_EXAM_CENTER, etc.
 * @param imageUri  – Local URI of the captured image
 * @param latitude  – GPS latitude
 * @param longitude – GPS longitude
 * @param userId    – Authenticated user ID
 */
export async function submitEvent(
    taskId: string,
    eventType: EventType,
    imageUri: string,
    latitude: number,
    longitude: number,
    userId?: string,
): Promise<SubmitEventResult> {
    const startTime = Date.now();
    console.log(`[Event] ========== SUBMISSION START ==========`);
    console.log(`[Event] Task: ${taskId}`);
    console.log(`[Event] Event Type: ${eventType}`);
    console.log(`[Event] Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

    try {
        // 1. Network check
        console.log('[Event] Checking network connectivity...');
        const hasInternet = await hasInternetConnection();
        if (!hasInternet) {
            const status = await checkNetworkStatus();
            console.log('[Event] No internet connection detected');
            return { success: false, error: getNetworkErrorMessage(status), errorCode: 'NO_INTERNET' };
        }
        console.log('[Event] Network check passed');

        // 2. Check for duplicate event
        const db = getFirebaseDb();
        const eventsRef = collection(db, 'task_events');
        const dupQ = query(eventsRef, where('task_id', '==', taskId), where('event_type', '==', eventType));
        const dupSnap = await getDocs(dupQ);
        if (!dupSnap.empty) {
            return { success: false, error: 'This event step has already been submitted.', errorCode: 'DUPLICATE_EVENT' };
        }

        // 3. Upload image to Firebase Storage
        const uploadResult = await uploadEventImage(imageUri, taskId, eventType);
        if (!uploadResult.success || !uploadResult.fileUrl) {
            return { success: false, error: uploadResult.error || 'Image upload failed.', errorCode: 'UNKNOWN' };
        }

        // 4. Write Firestore event document
        const eventData = {
            task_id: taskId,
            user_id: userId || null,
            event_type: eventType,
            image_url: uploadResult.fileUrl,
            latitude,
            longitude,
            created_at: Timestamp.now(),
        };

        const docRef = await addDoc(eventsRef, eventData);
        const elapsed = Date.now() - startTime;
        console.log(`[Event] ========== SUBMISSION SUCCESS (${elapsed}ms) ==========`);

        return {
            success: true,
            event: { id: docRef.id, ...eventData, created_at: new Date().toISOString() } as unknown as TaskEvent,
        };
    } catch (error) {
        console.error('[Event] Submission error:', error);
        return { success: false, error: 'Network error. Please check your connection.', errorCode: 'NETWORK' };
    }
}

//  Helpers (pure — no API calls) 

/**
 * Get the next required event type based on completed events.
 *
 * Full day: PICKUP  ARRIVAL  OPENING  SEALING  SUBMISSION
 * Double shift (Afternoon): OPENING  SEALING  SUBMISSION
 */
export function getNextEventType(completedEvents: EventType[], isDoubleShiftAfternoon = false): EventType | null {
    if (isDoubleShiftAfternoon) {
        if (!completedEvents.includes('OPENING_SEAL')) return 'OPENING_SEAL';
        if (!completedEvents.includes('SEALING_ANSWER_SHEETS')) return 'SEALING_ANSWER_SHEETS';
        if (!completedEvents.includes('SUBMISSION_POST_OFFICE')) return 'SUBMISSION_POST_OFFICE';
    } else {
        if (!completedEvents.includes('PICKUP_POLICE_STATION')) return 'PICKUP_POLICE_STATION';
        if (!completedEvents.includes('ARRIVAL_EXAM_CENTER')) return 'ARRIVAL_EXAM_CENTER';
        if (!completedEvents.includes('OPENING_SEAL')) return 'OPENING_SEAL';
        if (!completedEvents.includes('SEALING_ANSWER_SHEETS')) return 'SEALING_ANSWER_SHEETS';
        if (!completedEvents.includes('SUBMISSION_POST_OFFICE')) return 'SUBMISSION_POST_OFFICE';
    }
    return null;
}

/** Check if an event type is allowed based on completed events. */
export function isEventAllowed(eventType: EventType, completedEvents: EventType[], isDoubleShiftAfternoon = false): boolean {
    return getNextEventType(completedEvents, isDoubleShiftAfternoon) === eventType;
}

/** Step metadata for UI display. */
export const EVENT_STEPS: Array<{
    type: EventType;
    label: string;
    icon: string;
    description: string;
    skipForAfternoon?: boolean;
}> = [
    {
        type: 'PICKUP_POLICE_STATION',
        label: 'Police Station Pickup',
        icon: '',
        description: 'Collect sealed pack from Police Station',
        skipForAfternoon: true,
    },
    {
        type: 'ARRIVAL_EXAM_CENTER',
        label: 'Exam Center Arrival',
        icon: '',
        description: 'Arrive at the examination center',
        skipForAfternoon: true,
    },
    {
        type: 'OPENING_SEAL',
        label: 'Opening Seal',
        icon: '',
        description: 'Open the sealed question paper pack',
    },
    {
        type: 'SEALING_ANSWER_SHEETS',
        label: 'Seal Answer Sheets',
        icon: '',
        description: 'Seal collected answer sheets',
    },
    {
        type: 'SUBMISSION_POST_OFFICE',
        label: 'Post Office Submission',
        icon: '',
        description: 'Submit sealed pack at Post Office',
    },
];
