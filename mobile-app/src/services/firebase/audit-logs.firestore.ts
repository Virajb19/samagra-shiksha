/**
 * Audit Logs — Firestore Helper (Mobile App)
 *
 * Lightweight helper to create audit log entries from the mobile app.
 * Writes to the shared `audit_logs` Firestore collection.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';

const db = getFirebaseDb();

export async function createAuditLog(input: {
    user_id?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    ip_address?: string | null;
}): Promise<void> {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            user_id: input.user_id ?? null,
            action: input.action,
            entity_type: input.entity_type,
            entity_id: input.entity_id ?? null,
            ip_address: input.ip_address ?? null,
            created_at: serverTimestamp(),
        });
    } catch (error) {
        // Audit logging should never block the main operation
        console.warn('[AuditLog] Failed to create audit log:', error);
    }
}
