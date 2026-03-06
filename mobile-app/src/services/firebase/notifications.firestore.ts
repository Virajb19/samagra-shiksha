/**
 * Notifications Firestore Service
 *
 * CRUD for notification_logs and push-token management.
 */

import {
    collection,
    doc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';

const db = getFirebaseDb();

// ── Reads ──

/** Fetch notification logs for a user (paginated). */
export async function getNotifications(
    userId: string,
    page: number = 1,
    pageLimit: number = 20,
): Promise<{ notifications: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const allSnap = await getDocs(query(collection(db, 'notification_logs'), where('user_id', '==', userId)));
    const total = allSnap.size;
    const totalPages = Math.ceil(total / pageLimit);

    const snap = await getDocs(query(
        collection(db, 'notification_logs'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
    ));
    const allDocs = snap.docs;
    const start = (page - 1) * pageLimit;
    const pageDocs = allDocs.slice(start, start + pageLimit);

    return {
        notifications: pageDocs.map((d) => ({ id: d.id, ...d.data() })),
        total,
        page,
        limit: pageLimit,
        totalPages,
    };
}

/** Get unread notification count. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    const snap = await getDocs(query(
        collection(db, 'notification_logs'),
        where('user_id', '==', userId),
        where('is_read', '==', false),
    ));
    return snap.size;
}

// ── Writes ──

/** Mark a single notification as read. */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notification_logs', notificationId), { is_read: true });
}

/** Mark all notifications as read for a user. */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    const snap = await getDocs(query(
        collection(db, 'notification_logs'),
        where('user_id', '==', userId),
        where('is_read', '==', false),
    ));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { is_read: true }));
    await batch.commit();
}

// ── Push Token ──

/** Register push token on the user doc. */
export async function registerPushToken(userId: string, pushToken: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId), { push_token: pushToken });
}

/** Remove push token from user doc. */
export async function removePushToken(userId: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId), { push_token: null });
}
