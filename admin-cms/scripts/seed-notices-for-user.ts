/**
 * Seed many notices for a single user (for mobile notices screen testing).
 *
 * Defaults:
 * - TARGET_EMAIL=je@gmail.com
 * - SEED_NOTICE_COUNT=350
 *
 * Usage:
 *   cd admin-cms
 *   npm run notices:seed:user
 *
 * Optional env overrides:
 *   TARGET_EMAIL=je@gmail.com SEED_NOTICE_COUNT=500 npm run notices:seed:user
 */

import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID || 'tracking-aa41a';
const useEmulator = process.env.USE_FIRESTORE_EMULATOR !== 'false';
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const TARGET_EMAIL = (process.env.TARGET_EMAIL || 'je@gmail.com').trim().toLowerCase();
const NOTICE_COUNT = Math.max(1, Number(process.env.SEED_NOTICE_COUNT || 350));
const BATCH_SIZE = 250;

type NoticeType = 'GENERAL' | 'INVITATION' | 'PUSH_NOTIFICATION';

const NOTICE_TOPICS = [
  'Morning Assembly',
  'Safety Drill',
  'PTA Meeting',
  'School Inspection',
  'Exam Guidelines',
  'Holiday Circular',
  'Attendance Alert',
  'Mid-Day Meal Review',
  'Infrastructure Update',
  'Scholarship Reminder',
  'Uniform Policy',
  'Health Camp',
  'Lab Maintenance',
  'Library Drive',
  'Sports Practice',
  'Cultural Program',
  'Parent Orientation',
  'Water Supply Update',
  'Electricity Maintenance',
  'Transport Advisory',
] as const;

const VENUES = [
  'District Education Office',
  'School Hall',
  'Block Resource Center',
  'Headmaster Office',
  'Community Ground',
] as const;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNoticeType(): NoticeType {
  const roll = Math.random();
  if (roll < 0.65) return 'GENERAL';
  if (roll < 0.85) return 'PUSH_NOTIFICATION';
  return 'INVITATION';
}

async function findUserByEmail(email: string) {
  const snap = await db
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!snap.empty) return snap.docs[0];

  // Fallback for mixed-case stored emails.
  const all = await db.collection('users').where('email', '>=', '').limit(5000).get();
  return all.docs.find((d) => String(d.data().email || '').toLowerCase() === email) || null;
}

async function seedNoticesForUser() {
  console.log(`Seeding ${NOTICE_COUNT} notices for ${TARGET_EMAIL} (${useEmulator ? 'emulator' : 'project'})...`);

  const userDoc = await findUserByEmail(TARGET_EMAIL);
  if (!userDoc) {
    throw new Error(`User not found for email: ${TARGET_EMAIL}`);
  }

  const userId = userDoc.id;
  const userData = userDoc.data();
  const userName = String(userData.name || userData.email || TARGET_EMAIL);

  console.log(`Target user resolved: ${userName} (${userId})`);

  let batch = db.batch();
  let pendingOps = 0;
  let seeded = 0;

  const commitBatch = async () => {
    if (pendingOps === 0) return;
    await batch.commit();
    batch = db.batch();
    pendingOps = 0;
  };

  const now = Date.now();

  for (let i = 0; i < NOTICE_COUNT; i++) {
    const type = randomNoticeType();
    const topic = randomElement(NOTICE_TOPICS);
    const createdAt = Timestamp.fromDate(new Date(now - randomInt(0, 180) * 24 * 60 * 60 * 1000));

    const title = `${topic} Notice ${String(i + 1).padStart(3, '0')}`;
    const message = `This is seeded notice #${i + 1} for ${userName}. Please review and take necessary action.`;

    const noticeRef = db.collection('notices').doc();
    const recipientRef = db.collection('notice_recipients').doc();

    const invitationVenue = type === 'INVITATION' ? randomElement(VENUES) : null;
    const invitationTime = type === 'INVITATION' ? `${randomInt(9, 16)}:${randomElement(['00', '15', '30', '45'])}` : null;
    const invitationDate =
      type === 'INVITATION'
        ? Timestamp.fromDate(new Date(now + randomInt(1, 60) * 24 * 60 * 60 * 1000))
        : null;

    batch.set(noticeRef, {
      title,
      content: message,
      type,
      user_ids: [userId],
      created_by: 'seed-script',
      is_active: true,
      file_url: null,
      file_name: null,
      venue: invitationVenue,
      event_time: invitationTime,
      event_date: invitationDate,
      created_at: createdAt,
      updated_at: FieldValue.serverTimestamp(),
    });

    batch.set(recipientRef, {
      notice_id: noticeRef.id,
      user_id: userId,
      is_read: false,
      read_at: null,
      status: 'PENDING',
      reject_reason: null,
      responded_at: null,
      user_name: userName,
      notice_title: title,
      notice_content: message,
      notice_type: type,
      venue: invitationVenue,
      event_time: invitationTime,
      event_date: invitationDate,
      file_url: null,
      file_name: null,
      created_at: createdAt,
    });

    pendingOps += 2;
    seeded++;

    if (pendingOps >= BATCH_SIZE) {
      await commitBatch();
      if (seeded % 50 === 0 || seeded === NOTICE_COUNT) {
        console.log(`Seeded ${seeded}/${NOTICE_COUNT} notices...`);
      }
    }
  }

  await commitBatch();
  console.log(`Done. Seeded ${seeded} notices for ${TARGET_EMAIL}.`);
}

seedNoticesForUser().catch((err) => {
  console.error('Failed to seed notices:', err);
  process.exit(1);
});
