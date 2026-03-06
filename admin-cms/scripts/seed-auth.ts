/**
 * Firebase Auth Emulator Seed Script
 *
 * Creates ALL users in the Firebase Auth emulator so login works for every role.
 * Emails match the deterministic pattern used by backend/prisma/seed.ts.
 *
 * Run with:  npm run auth:seed
 * Requires:  Firebase Auth emulator running on port 9099
 */

import admin from 'firebase-admin';

// ─── Config ───────────────────────────────────────────────────
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tracking-aa41a';
const AUTH_EMULATOR_HOST = '127.0.0.1:9099';

// Tell the Admin SDK to use the Auth emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;

if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
}

const auth = admin.auth();

// ─── Constants (must match backend/prisma/seed.ts) ───────────
const SEED_PASSWORD = '12345678';
const HEADMASTER_COUNT = 4000;
const TEACHER_COUNT = 15000;

// ─── Batch helper ────────────────────────────────────────────
async function createUsersBatch(
    users: { email: string; password: string; displayName: string }[],
    label: string,
    role: string,
    batchSize = 50
) {
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(async (u) => {
                try {
                    const existing = await auth.getUserByEmail(u.email);
                    // Ensure existing users also have custom claims set
                    await auth.setCustomUserClaims(existing.uid, { role });
                    skipped++;
                } catch {
                    const created_user = await auth.createUser({
                        email: u.email,
                        password: u.password,
                        displayName: u.displayName,
                        emailVerified: true,
                    });
                    // Set custom claims (role) on the Firebase Auth token
                    await auth.setCustomUserClaims(created_user.uid, { role });
                    created++;
                }
            })
        );

        // Count failures
        results.forEach((r) => { if (r.status === 'rejected') failed++; });

        // Progress log every 500 users
        const progress = Math.min(i + batchSize, users.length);
        if (progress % 500 === 0 || progress === users.length) {
            console.log(`  ${label}: ${progress}/${users.length}`);
        }
    }

    console.log(`  ✅ ${label}: ${created} created, ${skipped} skipped, ${failed} failed (role: ${role})`);
}

// ─── Email generator (deterministic — must match seed.ts) ────
function generateEmail(index: number): string {
    return `user${index}@example.com`;
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
    console.log(`\n🔐 Seeding Firebase Auth emulator (${AUTH_EMULATOR_HOST})...\n`);

    // ── 1. Fixed CMS users ──
    console.log('👤 Fixed users (Admins)...');
    await createUsersBatch([
        { email: 'bittu-raja@gmail.com', password: SEED_PASSWORD, displayName: 'Bittu Raja' },
        { email: 'viraj@gmail.com', password: SEED_PASSWORD, displayName: 'Viraj Bhardwaj' },
        { email: 'pri@gmail.com', password: SEED_PASSWORD, displayName: 'Priyanshu Gupta' },
        { email: 'ritik-raj@gmail.com', password: SEED_PASSWORD, displayName: 'Ritik Raj' },
    ], 'Fixed users', 'ADMIN');

    // ── 2. Headmasters, Teachers ──
    // These use generateEmail(userIndex) with a running counter starting at 0
    let userIndex = 0;

    console.log('🎓 Headmasters...');
    const hmUsers = Array.from({ length: HEADMASTER_COUNT }, () => {
        const u = { email: generateEmail(userIndex), password: SEED_PASSWORD, displayName: `Headmaster ${userIndex}` };
        userIndex++;
        return u;
    });
    await createUsersBatch(hmUsers, 'Headmasters', 'HEADMASTER');

    console.log('�‍🏫 Teachers...');
    const teacherUsers = Array.from({ length: TEACHER_COUNT }, () => {
        const u = { email: generateEmail(userIndex), password: SEED_PASSWORD, displayName: `Teacher ${userIndex}` };
        userIndex++;
        return u;
    });
    await createUsersBatch(teacherUsers, 'Teachers', 'TEACHER');

    // ── 5. IE Resource Persons ──
    const IE_RESOURCE_PERSON_COUNT = 200;
    console.log('🔬 IE Resource Persons...');
    const ieUsers = Array.from({ length: IE_RESOURCE_PERSON_COUNT }, () => {
        const u = { email: generateEmail(userIndex), password: SEED_PASSWORD, displayName: `IE RP ${userIndex}` };
        userIndex++;
        return u;
    });
    await createUsersBatch(ieUsers, 'IE Resource Persons', 'IE_RESOURCE_PERSON');

    // ── 6. KGBV Wardens ──
    const KGBV_WARDEN_COUNT = 200;
    console.log('🏠 KGBV Wardens...');
    const kgbvUsers = Array.from({ length: KGBV_WARDEN_COUNT }, () => {
        const u = { email: generateEmail(userIndex), password: SEED_PASSWORD, displayName: `KGBV Warden ${userIndex}` };
        userIndex++;
        return u;
    });
    await createUsersBatch(kgbvUsers, 'KGBV Wardens', 'KGBV_WARDEN');

    // ── 7. NSCBAV Wardens ──
    const NSCBAV_WARDEN_COUNT = 200;
    console.log('🏫 NSCBAV Wardens...');
    const nscbavUsers = Array.from({ length: NSCBAV_WARDEN_COUNT }, () => {
        const u = { email: generateEmail(userIndex), password: SEED_PASSWORD, displayName: `NSCBAV Warden ${userIndex}` };
        userIndex++;
        return u;
    });
    await createUsersBatch(nscbavUsers, 'NSCBAV Wardens', 'NSCBAV_WARDEN');

    // ── 8. Junior Engineers ──
    const JUNIOR_ENGINEER_COUNT = 200;
    console.log('🔧 Junior Engineers...');
    const jeUsers = Array.from({ length: JUNIOR_ENGINEER_COUNT }, () => {
        const u = { email: generateEmail(userIndex), password: SEED_PASSWORD, displayName: `JE ${userIndex}` };
        userIndex++;
        return u;
    });
    await createUsersBatch(jeUsers, 'Junior Engineers', 'JUNIOR_ENGINEER');

    console.log(`\n✅ Auth emulator seed complete! Total users queued: ${4 + userIndex}\n`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Auth seed failed:', err);
    process.exit(1);
});
