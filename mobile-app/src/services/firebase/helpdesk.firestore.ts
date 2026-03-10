/**
 * Helpdesk Firestore Service
 *
 * Support ticket CRUD for mobile app users.
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { createAuditLog } from './audit-logs.firestore';

const db = getFirebaseDb();

/** Get tickets for the current user. */
export async function getMyTickets(userId: string): Promise<any[]> {
    const snap = await getDocs(query(collection(db, 'helpdesk_tickets'), where('user_id', '==', userId), orderBy('created_at', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Create a helpdesk ticket. */
export async function createTicket(data: {
    user_id: string;
    full_name: string;
    phone: string;
    message: string;
}): Promise<any> {
    const ref = doc(collection(db, 'helpdesk_tickets'));
    const record = { id: ref.id, ...data, is_resolved: false, created_at: Timestamp.now() };
    await setDoc(ref, record);

    await createAuditLog({
        user_id: data.user_id,
        action: 'TICKET_CREATED',
        entity_type: 'Helpdesk_Ticket',
        entity_id: ref.id,
    });

    return record;
}
