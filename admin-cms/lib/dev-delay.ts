/**
 * Development Delay Utility
 *
 * Adds an artificial delay to Firestore operations in development mode,
 * matching the backend's DevDelayMiddleware behavior.
 *
 * - Reads:     2s delay  (lighter than backend's 2s since multiple queries run in parallel)
 * - Mutations: 3s delay
 *
 * Completely skipped in production (NODE_ENV === 'production').
 *
 * Usage:
 *   await devDelay('read');   // before a Firestore read
 *   await devDelay('write');  // before a Firestore write/update/delete
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DELAY_MS = {
    read: 2000,   // 2s for reads
    write: 3000,  // 3s for mutations
} as const;

type OperationType = keyof typeof DELAY_MS;

export async function devDelay(
    operation: OperationType = 'read',
    label?: string,
): Promise<void> {
    if (IS_PRODUCTION) return;

    const ms = DELAY_MS[operation];
    const tag = label ? ` (${label})` : '';
    console.log(`[DevDelay] ${ms}ms delay for Firestore ${operation}${tag}`);
    await new Promise((resolve) => setTimeout(resolve, ms));
}
