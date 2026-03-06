'use server'
/**
 * Firestore Seed Script — Full equivalent of backend/prisma/seed.ts
 *
 * Seeds 27+ collections into Firestore with RAM-optimized patterns:
 *   • Streaming batch writer — commits every BATCH_SIZE ops (default 400)
 *   • Generator functions for large record sets (never hold the full array)
 *   • ID-only tracking — only string IDs stored, never full documents
 *   • Inline generate-and-write per entity
 *   • Configurable scale via SCALE env vars
 *
 * Run:  cd admin-cms && npm run firestore:seed
 */

import admin from 'firebase-admin';

// ────────────────────── ENUMS (plain objects, zero-cost) ──────────────────────

const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HEADMASTER: 'HEADMASTER',
  TEACHER: 'TEACHER',
  IE_RESOURCE_PERSON: 'IE_RESOURCE_PERSON',
  KGBV_WARDEN: 'KGBV_WARDEN',
  NSCBAV_WARDEN: 'NSCBAV_WARDEN',
  JUNIOR_ENGINEER: 'JUNIOR_ENGINEER',
} as const;

const GENDER = { MALE: 'MALE', FEMALE: 'FEMALE' } as const;
type GenderVal = (typeof GENDER)[keyof typeof GENDER];

const SCHOOL_EVENT_TYPES = ['MEETING', 'EXAM', 'HOLIDAY', 'SEMINAR', 'WORKSHOP', 'SPORTS', 'CULTURAL', 'OTHER'] as const;
const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
const NOTICE_TYPES = ['GENERAL', 'INVITATION', 'PUSH_NOTIFICATION'] as const;

// ────────────────────── FIREBASE INIT ──────────────────────

const projectId = process.env.FIREBASE_PROJECT_ID || 'tracking-aa41a';
const useEmulator = process.env.USE_FIRESTORE_EMULATOR !== 'false';
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}
if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}
const db = admin.firestore();

// ────────────────────── STREAMING BATCH WRITER ──────────────────────

const BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE || 400);

const writer = (() => {
  let batch = db.batch();
  let opCount = 0;
  let commitChain = Promise.resolve();

  const commitCurrentBatch = (): void => {
    if (opCount === 0) return;
    const b = batch;
    batch = db.batch();
    opCount = 0;
    commitChain = commitChain.then(() => b.commit()).then(() => undefined);
  };

  return {
    set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData): void {
      batch.set(ref, data);
      opCount += 1;
      if (opCount >= BATCH_SIZE) commitCurrentBatch();
    },
    async close(): Promise<void> {
      commitCurrentBatch();
      await commitChain;
    },
  };
})();

// ────────────────────── CONFIGURABLE SCALE ──────────────────────

const SCALE = {
  districts: 16,
  schools: Number(process.env.SEED_SCHOOLS || 4000),
  ieResourcePersons: Number(process.env.SEED_IE_RESOURCE_PERSONS || 200),
  kgbvWardens: Number(process.env.SEED_KGBV_WARDENS || 200),
  nscbavWardens: Number(process.env.SEED_NSCBAV_WARDENS || 200),
  juniorEngineers: Number(process.env.SEED_JUNIOR_ENGINEERS || 200),
  headmasters: Number(process.env.SEED_HEADMASTERS || 4000),
  teachers: Number(process.env.SEED_TEACHERS || 15000),
  notices: Number(process.env.SEED_NOTICES || 1000),
  auditLogs: Number(process.env.SEED_AUDIT_LOGS || 3000),
  events: Number(process.env.SEED_EVENTS || 1500),
  eventInvitations: Number(process.env.SEED_EVENT_INVITATIONS || 2500),
  circulars: Number(process.env.SEED_CIRCULARS || 800),
  helpdeskTickets: Number(process.env.SEED_HELPDESK || 500),
  notificationLogs: Number(process.env.SEED_NOTIFICATION_LOGS || 1500),
  userStars: Number(process.env.SEED_USER_STARS || 300),
};

// ────────────────────── DATA ARRAYS ──────────────────────

const nagalandDistricts = [
  { name: 'Dimapur', weight: 25 },
  { name: 'Kohima', weight: 20 },
  { name: 'Mokokchung', weight: 15 },
  { name: 'Tuensang', weight: 12 },
  { name: 'Mon', weight: 10 },
  { name: 'Wokha', weight: 8 },
  { name: 'Zunheboto', weight: 7 },
  { name: 'Phek', weight: 6 },
  { name: 'Peren', weight: 5 },
  { name: 'Longleng', weight: 4 },
  { name: 'Kiphire', weight: 3 },
  { name: 'Chumukedima', weight: 3 },
  { name: 'Noklak', weight: 2 },
  { name: 'Shamator', weight: 2 },
  { name: 'Tseminyu', weight: 2 },
  { name: 'Niuland', weight: 1 },
];
const districtWeights = nagalandDistricts.map(d => d.weight);
const totalWeight = districtWeights.reduce((a, b) => a + b, 0);

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Aadhya', 'Myra', 'Aanya', 'Diya', 'Pari', 'Sara', 'Ira', 'Aisha', 'Navya',
  'Rahul', 'Amit', 'Suresh', 'Ramesh', 'Vijay', 'Sanjay', 'Priya', 'Neha', 'Sunita', 'Kavita',
  'Rajesh', 'Mahesh', 'Ganesh', 'Dinesh', 'Rakesh', 'Pooja', 'Deepa', 'Rekha', 'Seema', 'Geeta',
  'Vikas', 'Ravi', 'Ajay', 'Prakash', 'Manoj', 'Ashok', 'Pankaj', 'Suman', 'Anjali', 'Ritu',
  'Temjen', 'Bendang', 'Imchen', 'Meren', 'Nungsang', 'Limasen', 'Akum', 'Moatoshi', 'Imkong',
  'Vezoto', 'Khriezotuo', 'Menguzelie', 'Neiketuolie', 'Vihoto', 'Khrielakuo', 'Mhasilie',
  'Sentila', 'Arenla', 'Imtinaro', 'Temsunaro', 'Sentirenla', 'Akanglila', 'Chubalem',
  'Lipokmar', 'Temsuwati', 'Imtisunep', 'Sentisangla', 'Watirenla', 'Imtisangla', 'Keviseno',
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Das', 'Reddy', 'Rao', 'Nair',
  'Ao', 'Sema', 'Angami', 'Lotha', 'Konyak', 'Chang', 'Phom', 'Yimchunger', 'Khiamniungan',
  'Sangtam', 'Pochury', 'Rengma', 'Zeliang', 'Chakhesang', 'Tikhir', 'Kuki', 'Rongmei',
  'Jamir', 'Longchar', 'Ozukum', 'Imchen', 'Walling', 'Kikon', 'Kithan', 'Kichu', 'Murry',
  'Lemtur', 'Pongen', 'Yaden', 'Patton', 'Kath', 'Thong', 'Shohe', 'Achumi', 'Swu',
];

const schoolPrefixes = ['Government', 'State', 'Public', 'Central', 'Model', 'Higher Secondary', 'Senior Secondary', 'Kendriya Vidyalaya', 'Baptist', 'Christian', 'St. Joseph', 'St. Mary', 'Don Bosco'];
const schoolSuffixes = ['High School', 'Higher Secondary School', 'Vidyalaya', 'Academy', 'Institution', 'School', 'College'];

const designations = [
  'Principal', 'Vice Principal', 'Senior Teacher', 'Teacher', 'Assistant Teacher',
  'Head of Department', 'Lecturer', 'PGT', 'TGT', 'Primary Teacher', 'Subject Teacher',
];
const qualifications = [
  'M.Ed', 'B.Ed', 'M.A.', 'M.Sc.', 'M.Com.', 'Ph.D.', 'B.A.', 'B.Sc.', 'B.Com.',
  'M.Phil.', 'NET', 'SET', 'D.Ed', 'M.A. (English)', 'M.Sc. (Mathematics)', 'M.Sc. (Physics)',
];
const allSubjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Alternative English', 'Tenyidie',
  'History', 'Geography', 'Political Science', 'Economics', 'Computer Science', 'Accountancy',
  'Business Studies', 'Physical Education', 'Music', 'Art', 'Environmental Science', 'Social Science',
];
const nonTeachingRoles = [
  'Clerk', 'Accountant', 'Peon', 'Watchman', 'Lab Assistant', 'Librarian',
  'Office Assistant', 'Computer Operator', 'Store Keeper', 'Driver', 'Sweeper', 'Mali',
];
const responsibilitiesList = [
  'ICT', 'Library', 'Science Lab', 'Self Defence', 'Vocational Education',
  'Civil Works', 'Sports', 'NCC', 'NSS', 'Scout & Guide', 'Mid Day Meal',
  'RMSA', 'SSA', 'Examination', 'Admission', 'Accounts',
];
const kgbvTypes = ['TYPE_I', 'TYPE_II', 'TYPE_III', 'TYPE_IV'] as const;
const residentialLocations = [
  'Dimapur', 'Kohima', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto',
  'Phek', 'Mon', 'Longleng', 'Kiphire', 'Peren', 'Pungro',
  'Purana Bazaar', 'Chumukedima', 'Tseminyu', 'Jalukie', 'Tuli', 'Changtongya',
];
const ebrcNames = [
  'Dhansaripar', 'Chumukedima', 'Niuland', 'Kuhuboto', 'Medziphema',
  'Sanis', 'Pungro', 'Shamator', 'Thonoknyu', 'Tobu',
  'Aghunato', 'Satakha', 'Suruhoto', 'Akuluto', 'Tseminyu',
  'Chiephobozou', 'Jakhama', 'Kohima Town', 'Sechu-Zubza',
];
const nscbavQualifications = [
  '10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'ITI', 'BCA', 'B.Sc.', 'Diploma',
];
const locations = [
  'NBSE Head Office', 'District Education Office', 'Police Station', 'Post Office',
  'Government School', 'Exam Center', 'Administrative Building', 'Storage Facility',
  'Treasury Office', 'Sub-Divisional Office',
];
const activityTypes = [
  'Teachers Training Program', 'Parent-Teacher Meeting', 'Annual Day Celebration',
  'Sports Day', 'Science Exhibition', 'Cultural Festival', 'Workshop on NEP 2020',
  'Orientation Program', 'Republic Day Celebration', 'Independence Day Celebration',
  'Career Guidance Seminar', 'Health Camp', 'Environmental Awareness Program',
  'Hornbill Festival Celebration', 'Naga Heritage Day',
];

const unsplashEventPhotos = [
  'https://images.unsplash.com/photo-1540575467063-178a50e2fd87?w=800&q=80',
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80',
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
];
const unsplashProfileMale = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
  'https://images.unsplash.com/photo-1596075780750-81249df16d19?w=200&q=80',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&q=80',
  'https://images.unsplash.com/photo-1583195764036-6dc248ac07d9?w=200&q=80',
  'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=200&q=80',
];
const unsplashProfileFemale = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&q=80',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80',
  'https://images.unsplash.com/photo-1546961342-ea5f71b193f3?w=200&q=80',
];


// ────────────────────── HELPERS ──────────────────────

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomBool = (p = 0.5): boolean => Math.random() < p;
const randomDecimal = (min: number, max: number, decimals = 7): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const weightedRandom = <T>(items: readonly T[], weights: readonly number[]): T => {
  const tw = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * tw;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
};

const generateName = (): string => `${randomElement(firstNames)} ${randomElement(lastNames)}`;
const generateEmail = (index: number): string => `user${index}@example.com`;
const generatePhone = (index: number): string => `${randomInt(70000, 99999)}${String(index).padStart(5, '0')}`;
const generateSchoolName = (district: string, index: number): string =>
  `${randomElement(schoolPrefixes)} ${randomElement(schoolSuffixes)}, ${district} #${index}`;
const generateRegCode = (index: number): string => `SCH${String(index).padStart(6, '0')}`;
const generatePackCode = (index: number): string => `SP${new Date().getFullYear()}${String(index).padStart(6, '0')}`;
const generateCircularNo = (index: number): string => `CIRC/${new Date().getFullYear()}/${String(index).padStart(4, '0')}`;
const generateImageHash = (): string =>
  Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

const generateDate = (startYear: number, endYear: number): Date => {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
};
const generateFutureDate = (daysAhead: number): Date => {
  const d = new Date(); d.setDate(d.getDate() + randomInt(1, daysAhead)); return d;
};
const getProfilePic = (gender: GenderVal): string | null => {
  if (!randomBool(0.3)) return null;
  return gender === GENDER.MALE ? randomElement(unsplashProfileMale) : randomElement(unsplashProfileFemale);
};

const TS = () => admin.firestore.FieldValue.serverTimestamp();
const newId = (col: string) => db.collection(col).doc().id;

// ────────────────────── ID-ONLY TRACKING ──────────────────────

const ids = {
  districtIds: [] as string[],
  districtIdByName: new Map<string, string>(),
  districtWeightById: new Map<string, number>(),
  schoolIds: [] as string[],
  schoolDistrictMap: new Map<string, string>(),   // schoolId -> districtId
  adminIds: [] as string[],                       // ADMIN + SUPER_ADMIN
  ieResourcePersonIds: [] as string[],
  kgbvWardenIds: [] as string[],
  nscbavWardenIds: [] as string[],
  juniorEngineerIds: [] as string[],
  headmasterIds: [] as string[],
  teacherIds: [] as string[],
  allUserIds: [] as string[],                     // every user
  // Faculty tracking (id -> schoolId mapping)
  teachingFacultyIds: [] as string[],
  facultySchoolMap: new Map<string, string>(),    // facultyId -> schoolId
  // Event tracking
  eventIds: [] as string[],
  // Notice tracking
  noticeIds: [] as string[],
  // Circular tracking
  circularIds: [] as string[],
  circularMeta: [] as { id: string; isMultiSchool: boolean; districtId: string }[],
};

const addUser = (role: string, userId: string) => {
  ids.allUserIds.push(userId);
  switch (role) {
    case USER_ROLES.ADMIN: case USER_ROLES.SUPER_ADMIN:
      ids.adminIds.push(userId); break;
    case USER_ROLES.HEADMASTER: ids.headmasterIds.push(userId); break;
    case USER_ROLES.TEACHER: ids.teacherIds.push(userId); break;
    case USER_ROLES.IE_RESOURCE_PERSON: ids.ieResourcePersonIds.push(userId); break;
    case USER_ROLES.KGBV_WARDEN: ids.kgbvWardenIds.push(userId); break;
    case USER_ROLES.NSCBAV_WARDEN: ids.nscbavWardenIds.push(userId); break;
    case USER_ROLES.JUNIOR_ENGINEER: ids.juniorEngineerIds.push(userId); break;
  }
};

const getWeightedDistrictId = (): string =>
  weightedRandom(ids.districtIds, ids.districtIds.map(id => ids.districtWeightById.get(id)!));

// ────────────────────── ALL COLLECTION NAMES (for clearing) ──────────────────────

const ALL_COLLECTIONS = [
  'districts', 'schools', 'users', 'faculties', 'subjects',
  'events', 'event_invitations',
  'notices', 'notice_recipients',
  'circulars', 'circular_schools',
  'helpdesk_tickets', 'notification_logs',
  'user_stars',
  'audit_logs',
  'project_schools', 'projects',
  'activity_forms',
  'ict_form_data',
  'library_form_data',
  'science_lab_form_data',
  'self_defense_form_data',
  'kgbv_form_data',
  'nscbav_form_data',
] as const;

async function clearCollection(name: string): Promise<void> {
  const ref = db.collection(name);
  while (true) {
    const snap = await ref.limit(400).get();
    if (snap.empty) break;
    const b = db.batch();
    snap.docs.forEach(doc => b.delete(doc.ref));
    await b.commit();
  }
}

// ────────────────────── 1. DISTRICTS ──────────────────────

function seedDistricts(): void {
  console.log('🗺️  Creating 16 Nagaland districts...');
  for (const d of nagalandDistricts) {
    const id = newId('districts');
    writer.set(db.collection('districts').doc(id), {
      id, name: d.name, state: 'Nagaland', created_at: TS(),
    });
    ids.districtIds.push(id);
    ids.districtIdByName.set(d.name, id);
    ids.districtWeightById.set(id, d.weight);
  }
  console.log(`✅ ${ids.districtIds.length} districts`);
}

// ────────────────────── 2. SCHOOLS (weighted) ──────────────────────

function seedSchools(): void {
  console.log(`🏫 Creating ${SCALE.schools} schools (weighted)...`);
  for (let i = 0; i < SCALE.schools; i++) {
    const districtId = getWeightedDistrictId();
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';
    const id = newId('schools');
    writer.set(db.collection('schools').doc(id), {
      id,
      name: generateSchoolName(districtName, i),
      registration_code: generateRegCode(i),
      district_id: districtId,
      created_at: TS(),
    });
    ids.schoolIds.push(id);
    ids.schoolDistrictMap.set(id, districtId);
  }
  console.log(`✅ ${ids.schoolIds.length} schools`);
}

// ────────────────────── 3. SUBJECTS ──────────────────────

function seedSubjects(): void {
  console.log('📖 Creating subjects for class levels 8-12...');
  let count = 0;
  for (const subj of allSubjects) {
    for (let cl = 8; cl <= 12; cl++) {
      const id = newId('subjects');
      writer.set(db.collection('subjects').doc(id), {
        id, name: subj, class_level: cl, is_active: true,
        created_at: TS(), updated_at: TS(),
      });
      count++;
    }
  }
  console.log(`✅ ${count} subjects`);
}

// ────────────────────── 4. CORE USERS (Admin, SC, Assistant) ──────────────────────

function seedCoreAdminUsers(): void {
  console.log('👤 Creating Admin, Subject Coordinators, Assistants...');

  // Admin
  const adminId = newId('users');
  writer.set(db.collection('users').doc(adminId), {
    id: adminId, name: 'Bittu Raja', email: 'bittu-raja@gmail.com', password: '12345678',
    phone: '1234567890', role: USER_ROLES.ADMIN, gender: GENDER.MALE, is_active: true,
    profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    created_at: TS(),
  });
  addUser(USER_ROLES.ADMIN, adminId);

  // 2 Additional Admin users
  const admin2Id = newId('users');
  writer.set(db.collection('users').doc(admin2Id), {
    id: admin2Id, name: 'Viraj Bhardwaj', email: 'viraj@gmail.com', password: '12345678',
    phone: '9896008137', role: USER_ROLES.ADMIN, gender: GENDER.MALE, is_active: true,
    profile_image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    created_at: TS(),
  });
  addUser(USER_ROLES.ADMIN, admin2Id);

  const admin3Id = newId('users');
  writer.set(db.collection('users').doc(admin3Id), {
    id: admin3Id, name: 'Priyanshu Gupta', email: 'pri@gmail.com', password: '12345678',
    phone: '9876501234', role: USER_ROLES.ADMIN, gender: GENDER.MALE, is_active: true,
    profile_image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    created_at: TS(),
  });
  addUser(USER_ROLES.ADMIN, admin3Id);

  // Ritik Raj - Admin user
  const ritikId = newId('users');
  writer.set(db.collection('users').doc(ritikId), {
    id: ritikId, name: 'Ritik Raj', email: 'ritik-raj@gmail.com', password: '12345678',
    phone: '9876543210', role: USER_ROLES.ADMIN, gender: GENDER.MALE, is_active: true,
    profile_image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80',
    created_at: TS(),
  });
  addUser(USER_ROLES.ADMIN, ritikId);

  console.log(`✅ Core users: ${ids.adminIds.length} admins`);
}

// ────────────────────── 5. BULK USERS (Headmasters, Teachers) ──────────────────────
// Uses generators so we never hold all user objects in memory at once.

function* userGenerator(): Generator<{ role: string; gender: GenderVal; districtId: string; index: number }> {
  let idx = 0;
  // Headmasters
  for (let i = 0; i < SCALE.headmasters; i++) {
    yield { role: USER_ROLES.HEADMASTER, gender: randomElement([GENDER.MALE, GENDER.FEMALE]), districtId: getWeightedDistrictId(), index: idx++ };
  }
  // Teachers — distributed by district weight
  let assigned = 0;
  for (let di = 0; di < ids.districtIds.length; di++) {
    const w = ids.districtWeightById.get(ids.districtIds[di])!;
    const count = di === ids.districtIds.length - 1
      ? SCALE.teachers - assigned
      : Math.floor((w / totalWeight) * SCALE.teachers);
    for (let t = 0; t < count; t++) {
      yield { role: USER_ROLES.TEACHER, gender: randomElement([GENDER.MALE, GENDER.FEMALE]), districtId: ids.districtIds[di], index: idx++ };
    }
    assigned += count;
  }
  // IE Resource Persons
  for (let i = 0; i < SCALE.ieResourcePersons; i++) {
    yield { role: USER_ROLES.IE_RESOURCE_PERSON, gender: randomElement([GENDER.MALE, GENDER.FEMALE]), districtId: getWeightedDistrictId(), index: idx++ };
  }
  // KGBV Wardens
  for (let i = 0; i < SCALE.kgbvWardens; i++) {
    yield { role: USER_ROLES.KGBV_WARDEN, gender: randomElement([GENDER.MALE, GENDER.FEMALE]), districtId: getWeightedDistrictId(), index: idx++ };
  }
  // NSCBAV Wardens
  for (let i = 0; i < SCALE.nscbavWardens; i++) {
    yield { role: USER_ROLES.NSCBAV_WARDEN, gender: randomElement([GENDER.MALE, GENDER.FEMALE]), districtId: getWeightedDistrictId(), index: idx++ };
  }
  // Junior Engineers
  for (let i = 0; i < SCALE.juniorEngineers; i++) {
    yield { role: USER_ROLES.JUNIOR_ENGINEER, gender: randomElement([GENDER.MALE, GENDER.FEMALE]), districtId: getWeightedDistrictId(), index: idx++ };
  }
}

function seedBulkUsers(): void {
  console.log(`👥 Creating ${SCALE.headmasters + SCALE.teachers + SCALE.ieResourcePersons + SCALE.kgbvWardens + SCALE.nscbavWardens + SCALE.juniorEngineers} users...`);

  // Helper: pick N random responsibilities
  const pickResponsibilities = (n: number = randomInt(3, 6)): string[] => {
    const shuffled = [...responsibilitiesList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  for (const u of userGenerator()) {
    const id = newId('users');
    const profileUrl = getProfilePic(u.gender);

    // Base user fields — active users have completed profiles, inactive ones haven't
    const isActive = randomBool(0.95);
    const userDoc: Record<string, unknown> = {
      id, name: generateName(), email: generateEmail(u.index), password: '12345678',
      phone: generatePhone(u.index), role: u.role, gender: u.gender,
      is_active: isActive,
      has_completed_profile: isActive,
      ...(profileUrl ? { profile_image_url: profileUrl } : {}),
      created_at: TS(),
    };

    // Role-specific fields
    switch (u.role) {
      case USER_ROLES.HEADMASTER:
      case USER_ROLES.TEACHER:
        userDoc.responsibilities = pickResponsibilities();
        break;

      case USER_ROLES.IE_RESOURCE_PERSON:
        userDoc.district_id = u.districtId;
        userDoc.qualification = randomElement(qualifications);
        userDoc.rci_number = `RCI${String(randomInt(10000, 99999))}`;
        userDoc.ebrc = randomElement(ebrcNames);
        userDoc.years_of_experience = randomInt(1, 25);
        userDoc.date_of_joining = admin.firestore.Timestamp.fromDate(generateDate(2010, 2024));
        userDoc.aadhaar_number = String(randomInt(100000000000, 999999999999));
        break;

      case USER_ROLES.KGBV_WARDEN:
        userDoc.kgbv_type = randomElement(kgbvTypes);
        userDoc.residential_location = randomElement(residentialLocations);
        userDoc.district_id = u.districtId;
        userDoc.ebrc = randomElement(ebrcNames);
        userDoc.years_of_experience = randomInt(1, 25);
        userDoc.date_of_joining = admin.firestore.Timestamp.fromDate(generateDate(2010, 2024));
        userDoc.aadhaar_number = String(randomInt(100000000000, 999999999999));
        break;

      case USER_ROLES.NSCBAV_WARDEN:
        userDoc.qualification = randomElement(nscbavQualifications);
        userDoc.residential_location = randomElement(residentialLocations);
        userDoc.district_id = u.districtId;
        userDoc.ebrc = randomElement(ebrcNames);
        userDoc.years_of_experience = randomInt(1, 25);
        userDoc.date_of_joining = admin.firestore.Timestamp.fromDate(generateDate(2010, 2024));
        userDoc.aadhaar_number = String(randomInt(100000000000, 999999999999));
        break;

      case USER_ROLES.JUNIOR_ENGINEER:
        userDoc.district_id = u.districtId;
        userDoc.responsibilities = pickResponsibilities(randomInt(2, 4));
        userDoc.years_of_experience = randomInt(1, 30);
        break;
    }

    writer.set(db.collection('users').doc(id), userDoc);
    addUser(u.role, id);
  }
  console.log(`✅ Users: HM=${ids.headmasterIds.length} T=${ids.teacherIds.length} IE=${ids.ieResourcePersonIds.length} KGBV=${ids.kgbvWardenIds.length} NSCBAV=${ids.nscbavWardenIds.length} JE=${ids.juniorEngineerIds.length}`);
}

// ────────────────────── 6. FACULTY (one per headmaster + one per teacher) ──────────────────────

function seedFaculty(): void {
  console.log('👨‍🏫 Creating faculty records...');
  let count = 0;

  // Headmaster faculties (1:1 with schools)
  const hmLimit = Math.min(ids.headmasterIds.length, ids.schoolIds.length);
  for (let i = 0; i < hmLimit; i++) {
    const fId = newId('faculties');
    writer.set(db.collection('faculties').doc(fId), {
      id: fId, user_id: ids.headmasterIds[i], school_id: ids.schoolIds[i],
      faculty_type: 'NON_TEACHING', designation: 'Principal',
      years_of_experience: randomInt(10, 35),
      is_profile_locked: randomBool(0.8),
      created_at: TS(), updated_at: TS(),
    });
    ids.facultySchoolMap.set(fId, ids.schoolIds[i]);
    count++;
  }

  // Teacher faculties (round-robin across schools)
  for (let i = 0; i < ids.teacherIds.length; i++) {
    const schoolId = ids.schoolIds[i % ids.schoolIds.length];
    const fId = newId('faculties');
    writer.set(db.collection('faculties').doc(fId), {
      id: fId, user_id: ids.teacherIds[i], school_id: schoolId,
      faculty_type: 'TEACHING',
      designation: randomElement(designations.filter(d => d !== 'Principal')),
      years_of_experience: randomInt(1, 30),
      is_profile_locked: randomBool(0.7),
      created_at: TS(), updated_at: TS(),
    });
    ids.teachingFacultyIds.push(fId);
    ids.facultySchoolMap.set(fId, schoolId);
    count++;
  }

  console.log(`✅ ${count} faculty records`);
}

// ────────────────────── 8. AUDIT LOGS ──────────────────────


function seedAuditLogs(): void {
  console.log(`📋 Creating ${SCALE.auditLogs} audit logs...`);
  const actions = [
    'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED', 'TASK_CREATED', 'TASK_UPDATED',
    'PROFILE_UPDATED', 'FACULTY_APPROVED', 'EVENT_CREATED', 'NOTICE_PUBLISHED',
  ];
  for (let i = 0; i < SCALE.auditLogs; i++) {
    const id = newId('audit_logs');
    writer.set(db.collection('audit_logs').doc(id), {
      id,
      user_id: randomBool(0.95) ? randomElement(ids.allUserIds) : null,
      action: randomElement(actions),
      entity_type: randomElement(['User', 'Task', 'Faculty', 'Event', 'Notice']),
      entity_id: randomElement(ids.allUserIds),
      ip_address: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
      created_at: TS(),
    });
  }
  console.log(`✅ ${SCALE.auditLogs} audit logs`);
}

// ────────────────────── 14. EVENTS ──────────────────────

function seedEvents(): void {
  console.log(`📅 Creating ${SCALE.events} events...`);
  for (let i = 0; i < SCALE.events; i++) {
    const isSchoolLevel = randomBool(0.7);
    const eventType = randomElement(SCHOOL_EVENT_TYPES);
    const eventDate = generateFutureDate(180);
    const eventEndDate = randomBool(0.3) ? new Date(eventDate.getTime() + randomInt(1, 3) * 86400000) : null;
    const districtId = getWeightedDistrictId();
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? '';

    const id = newId('events');
    writer.set(db.collection('events').doc(id), {
      id,
      title: `${randomElement(['Annual', 'Monthly', 'Special', 'District'])} ${eventType} ${i + 1}`,
      description: `Event description for ${eventType}. This event aims to enhance the educational experience.`,
      event_date: admin.firestore.Timestamp.fromDate(eventDate),
      event_end_date: eventEndDate ? admin.firestore.Timestamp.fromDate(eventEndDate) : null,
      event_time: `${randomInt(8, 17)}:${randomElement(['00', '30'])}`,
      location: `${randomElement(locations)}, ${districtName}`,
      event_type: eventType,
      activity_type: randomElement(activityTypes),
      flyer_url: randomBool(0.6) ? randomElement(unsplashEventPhotos) : null,
      male_participants: randomInt(5, 100),
      female_participants: randomInt(5, 120),
      is_active: randomBool(0.9),
      school_id: isSchoolLevel ? randomElement(ids.schoolIds) : null,
      district_id: !isSchoolLevel ? districtId : null,
      created_by: randomElement([...ids.headmasterIds.slice(0, 500), ...ids.adminIds]),
      created_at: TS(), updated_at: TS(),
    });
    ids.eventIds.push(id);
  }
  console.log(`✅ ${ids.eventIds.length} events`);
}

// ────────────────────── 15. EVENT INVITATIONS ──────────────────────

function seedEventInvitations(): void {
  console.log('✉️  Creating event invitations...');
  const seen = new Set<string>();
  let count = 0;
  const eventsSlice = ids.eventIds.slice(0, 800);

  for (const eventId of eventsSlice) {
    const n = randomInt(2, 5);
    for (let j = 0; j < n; j++) {
      const userId = randomElement([...ids.teacherIds.slice(0, 5000), ...ids.headmasterIds.slice(0, 1000)]);
      const key = `${eventId}-${userId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const id = newId('event_invitations');
      writer.set(db.collection('event_invitations').doc(id), {
        id, event_id: eventId, user_id: userId,
        status: randomElement(INVITATION_STATUSES),
        rejection_reason: randomBool(0.1) ? 'Unable to attend due to prior commitments' : null,
        responded_at: randomBool(0.7) ? TS() : null,
        created_at: TS(),
      });
      count++;
    }
  }
  console.log(`✅ ${count} event invitations`);
}

// ────────────────────── 16. NOTICES ──────────────────────

function seedNotices(): void {
  console.log(`📢 Creating ${SCALE.notices} notices...`);
  for (let i = 0; i < SCALE.notices; i++) {
    const type = randomElement(NOTICE_TYPES);
    const isSchoolLevel = randomBool(0.4);
    const id = newId('notices');
    writer.set(db.collection('notices').doc(id), {
      id,
      title: `${type} Notice ${i + 1} - ${randomElement(['Exam', 'Holiday', 'Meeting', 'Training', 'NBSE Update'])}`,
      content: `This is an important ${type.toLowerCase()} notice. Please read carefully.`,
      type,
      venue: type === 'INVITATION' ? `${randomElement(locations)}, ${nagalandDistricts[randomInt(0, 15)].name}` : null,
      event_time: type === 'INVITATION' ? `${randomInt(9, 16)}:00` : null,
      event_date: type === 'INVITATION' ? admin.firestore.Timestamp.fromDate(generateFutureDate(60)) : null,
      published_at: TS(),
      expires_at: randomBool(0.8) ? admin.firestore.Timestamp.fromDate(generateFutureDate(90)) : null,
      is_active: randomBool(0.95),
      is_targeted: randomBool(0.3),
      school_id: isSchoolLevel ? randomElement(ids.schoolIds) : null,
      created_by: randomElement(ids.adminIds),
      file_url: randomBool(0.3) ? `https://storage.example.com/notices/notice_${i}.pdf` : null,
      file_name: randomBool(0.3) ? `notice_${i}.pdf` : null,
      created_at: TS(), updated_at: TS(),
    });
    ids.noticeIds.push(id);
  }
  console.log(`✅ ${ids.noticeIds.length} notices`);
}

// ────────────────────── 17. NOTICE RECIPIENTS ──────────────────────

function seedNoticeRecipients(): void {
  console.log('📬 Creating notice recipients...');
  const pool = ids.noticeIds.slice(0, 500);
  const seen = new Set<string>();
  let count = 0;

  for (const noticeId of pool) {
    const n = randomInt(2, 6);
    for (let j = 0; j < n; j++) {
      const userId = randomElement([...ids.teacherIds.slice(0, 3000), ...ids.headmasterIds.slice(0, 1000)]);
      const key = `${noticeId}-${userId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isRead = randomBool(0.4);
      const id = newId('notice_recipients');
      writer.set(db.collection('notice_recipients').doc(id), {
        id, notice_id: noticeId, user_id: userId, is_read: isRead,
        read_at: isRead ? TS() : null,
      });
      count++;
    }
  }
  console.log(`✅ ${count} notice recipients`);
}

// ────────────────────── 18. CIRCULARS ──────────────────────

function seedCirculars(): void {
  console.log(`📄 Creating ${SCALE.circulars} circulars...`);
  for (let i = 0; i < SCALE.circulars; i++) {
    const isDistrictLevel = randomBool(0.3);
    const isMultiSchool = !isDistrictLevel && randomBool(0.4);
    const districtId = getWeightedDistrictId();
    const id = newId('circulars');

    writer.set(db.collection('circulars').doc(id), {
      id,
      circular_no: generateCircularNo(i + 1),
      title: `Circular ${i + 1} - ${randomElement(['Exam Schedule', 'Policy Update', 'Guidelines', 'Instructions', 'NBSE Notification'])}`,
      description: `Official circular regarding administrative and academic matters.`,
      file_url: randomBool(0.8) ? `https://storage.example.com/circulars/circular_${i}.pdf` : null,
      issued_by: randomElement(['NBSE', 'State Government', 'District Office', 'Education Department', 'Chief Secretary']),
      issued_date: admin.firestore.Timestamp.fromDate(generateDate(2024, 2025)),
      effective_date: admin.firestore.Timestamp.fromDate(generateFutureDate(30)),
      is_active: randomBool(0.95),
      district_id: isDistrictLevel ? districtId : null,
      school_id: (!isDistrictLevel && !isMultiSchool && randomBool(0.5)) ? randomElement(ids.schoolIds) : null,
      created_by: randomElement(ids.adminIds),
      created_at: TS(), updated_at: TS(),
    });
    ids.circularIds.push(id);
    ids.circularMeta.push({ id, isMultiSchool, districtId });
  }
  console.log(`✅ ${ids.circularIds.length} circulars`);
}

// ────────────────────── 19. CIRCULAR SCHOOLS (M2M) ──────────────────────

function seedCircularSchools(): void {
  console.log('🔗 Creating CircularSchool M2M entries...');
  let count = 0;
  for (const meta of ids.circularMeta) {
    if (!meta.isMultiSchool) continue;
    // Find schools in this district
    const districtSchools = ids.schoolIds.filter(sid => ids.schoolDistrictMap.get(sid) === meta.districtId);
    const n = Math.min(randomInt(3, 8), districtSchools.length);
    const shuffled = [...districtSchools].sort(() => 0.5 - Math.random());
    for (let j = 0; j < n; j++) {
      const docId = newId('circular_schools');
      writer.set(db.collection('circular_schools').doc(docId), {
        circular_id: meta.id, school_id: shuffled[j], created_at: TS(),
      });
      count++;
    }
  }
  console.log(`✅ ${count} circular-school M2M entries`);
}

// ────────────────────── 20. HELPDESK TICKETS ──────────────────────

function seedHelpdeskTickets(): void {
  console.log(`🎫 Creating ${SCALE.helpdeskTickets} helpdesk tickets...`);
  for (let i = 0; i < SCALE.helpdeskTickets; i++) {
    const userId = randomElement(ids.allUserIds);
    const id = newId('helpdesk_tickets');
    writer.set(db.collection('helpdesk_tickets').doc(id), {
      id, user_id: userId,
      full_name: generateName(), phone: generatePhone(i + 90000),
      message: `Help needed with ${randomElement(['login issue', 'profile update', 'password reset', 'data correction', 'technical problem', 'form submission error', 'certificate request'])}`,
      is_resolved: randomBool(0.5),
      created_at: TS(),
    });
  }
  console.log(`✅ ${SCALE.helpdeskTickets} helpdesk tickets`);
}

// ────────────────────── 21. NOTIFICATION LOGS ──────────────────────

function seedNotificationLogs(): void {
  console.log(`🔔 Creating ${SCALE.notificationLogs} notification logs...`);
  for (let i = 0; i < SCALE.notificationLogs; i++) {
    const id = newId('notification_logs');
    writer.set(db.collection('notification_logs').doc(id), {
      id, user_id: randomElement(ids.allUserIds),
      title: randomElement(['Task Update', 'Profile Approved', 'New Event', 'Important Notice', 'Exam Alert', 'Circular Published']),
      body: `You have a new notification regarding your ${randomElement(['task', 'profile', 'event', 'application', 'exam', 'school'])}`,
      type: randomElement(['TASK', 'PROFILE', 'NOTICE', 'EVENT', 'CIRCULAR']),
      is_read: randomBool(0.4),
      created_at: TS(),
    });
  }
  console.log(`✅ ${SCALE.notificationLogs} notification logs`);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ 23. USER STARS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function seedUserStars(): void {
  console.log(`â­ Creating ${SCALE.userStars} user stars...`);
  const seen = new Set<string>();
  let count = 0;
  for (let i = 0; i < SCALE.userStars; i++) {
    const adminId = randomElement(ids.adminIds);
    const starredId = randomElement([...ids.teacherIds.slice(0, 3000), ...ids.headmasterIds.slice(0, 1000)]);
    const key = `${adminId}-${starredId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = newId('user_stars');
    writer.set(db.collection('user_stars').doc(id), {
      id, admin_id: adminId, starred_user_id: starredId, created_at: TS(),
    });
    count++;
  }
  console.log(`âœ… ${count} user stars`);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PROJECT MANAGEMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€



const PROJECT_SCHOOL_CATEGORIES = [
  'Elementary', 'Secondary', 'Higher Secondary', 'PM Shri', 'NSCBAV', 'DA JGUA', 'KGBV-IV',
] as const;
const CATEGORY_WEIGHTS = [30, 25, 15, 10, 8, 7, 5]; // realistic distribution

const PROJECT_ACTIVITIES = [
  'New Government Primary School', 'Construction of New Building', 'Boys Toilet', 'Girls Toilet',
  'Boys Toilet (Rejuvenation)', 'Girls Toilet (Rejuvenation)', 'Additional Classroom',
  'Augmentation of EBRC', 'Boundary Wall', 'Boundary Wall (Rejuvenation)',
  'Dilapidated Classrooms (Primary)', 'Dilapidated Classroom (Upper Primary)',
  'Drinking Water Facility', 'Electrification', 'Electrification (Rejuvenation)',
  'Major Repair', 'Major Repair (Rejuvenation)', 'Rain Water Harvesting',
  'Upgradation of School (6-8)', 'Dilapidated Building (Primary)',
  'Dilapidated Building (Upper Primary)', 'Hostel', 'ICT Lab', 'Vocational Lab',
  'Library Room', 'Science Lab',
] as const;
// Activity weights — common activities get higher probability
const ACTIVITY_WEIGHTS = [
  3,  // New Govt Primary School
  5,  // Construction of New Building
  8,  // Boys Toilet
  8,  // Girls Toilet
  4,  // Boys Toilet (Rejuvenation)
  4,  // Girls Toilet (Rejuvenation)
  12, // Additional Classroom         ← very common
  2,  // Augmentation of EBRC
  9,  // Boundary Wall                ← common
  4,  // Boundary Wall (Rejuvenation)
  5,  // Dilapidated Classrooms (Primary)
  4,  // Dilapidated Classroom (Upper Primary)
  6,  // Drinking Water Facility
  5,  // Electrification
  3,  // Electrification (Rejuvenation)
  10, // Major Repair                 ← very common
  5,  // Major Repair (Rejuvenation)
  2,  // Rain Water Harvesting
  3,  // Upgradation of School (6-8)
  3,  // Dilapidated Building (Primary)
  3,  // Dilapidated Building (Upper Primary)
  1,  // Hostel                       ← rare, but expensive
  2,  // ICT Lab
  1,  // Vocational Lab
  2,  // Library Room
  2,  // Science Lab
];

const PAB_YEARS = ['2023 - 2024', '2024 - 2025', '2025 - 2026', '2026 - 2027'] as const;
const PAB_YEAR_WEIGHTS = [15, 30, 35, 20]; // favour recent years

const PROJECT_EBRC_NAMES = [
  'Dimapur EBRC', 'Kohima EBRC', 'Mokokchung EBRC', 'Tuensang EBRC', 'Mon EBRC',
  'Wokha EBRC', 'Zunheboto EBRC', 'Phek EBRC', 'Longleng EBRC', 'Peren EBRC',
  'Kiphire EBRC', 'Noklak EBRC', 'Chumoukedima EBRC', 'Niuland EBRC', 'Tseminyu EBRC',
] as const;

const PROJECT_SCHOOL_NAMES = [
  // —— Dimapur (largest district — 15 schools) ——
  'Govt. Primary School, Chumukedima', 'Govt. Middle School, Purana Bazaar', 'Govt. High School, Dimapur Town',
  'Govt. Higher Secondary, Signal Basti', 'Govt. Primary School, Niuland Road',
  'Govt. Higher Secondary, Dimapur Railway', 'Govt. Primary School, Burma Camp',
  'Govt. High School, Medziphema', 'Govt. Middle School, Kuhuboto',
  'Govt. Primary School, Diphupar', 'Govt. Middle School, Nagarjan', 'Govt. High School, Walford',
  'KGBV School, Dimapur', 'PM Shri School, Signal Angami', 'Model School, Dimapur Urban',
  // —— Kohima (14 schools) ——
  'Govt. Primary School, Kohima Village', 'Govt. Middle School, Jakhama', 'Govt. High School, Kohima Town',
  'Govt. Higher Secondary, Sechu-Zubza', 'Govt. Primary School, Chiephobozou',
  'Govt. Middle School, Jotsoma', 'Govt. High School, Viswema', 'Govt. Primary School, Kezocha',
  'Govt. Primary School, Gariphema', 'KGBV School, Kohima', 'Govt. High School, Dzukou Valley',
  'PM Shri School, Bayavu', 'Model School, Kohima Ward-5', 'Govt. Primary School, Kigwema',
  // —— Mokokchung (10 schools) ——
  'Govt. Primary School, Mokokchung Town', 'Govt. Middle School, Changtongya', 'Govt. High School, Mangkolemba',
  'Govt. Higher Secondary, Tuli', 'Govt. Higher Secondary, Mokokchung Ward',
  'Govt. Primary School, Longsa', 'Govt. High School, Impur', 'Govt. Middle School, Ongpangkong',
  'KGBV School, Mokokchung', 'Govt. Primary School, Ungma',
  // —— Tuensang (8 schools) ——
  'Govt. Primary School, Tuensang Town', 'Govt. Middle School, Longkhim', 'Govt. High School, Shamator',
  'Govt. Primary School, Chare', 'Govt. High School, Tuensang Ward',
  'Govt. Middle School, Sangsangnyu', 'Govt. Primary School, Chingmei', 'NSCBAV School, Tuensang',
  // —— Mon (8 schools) ——
  'Govt. Primary School, Mon Town', 'Govt. Middle School, Aboi', 'Govt. High School, Tobu',
  'Govt. Primary School, Tizit', 'Govt. Middle School, Naginimora', 'Govt. High School, Mon Ward',
  'KGBV School, Mon', 'Govt. Primary School, Wakching',
  // —— Wokha (7 schools) ——
  'Govt. Primary School, Wokha Town', 'Govt. Middle School, Sanis', 'Govt. High School, Bhandari',
  'Govt. Primary School, Changpang', 'Govt. Higher Secondary, Wokha Ward',
  'Govt. Middle School, Ralan', 'NSCBAV School, Wokha',
  // —— Zunheboto (7 schools) ——
  'Govt. Primary School, Zunheboto Town', 'Govt. Middle School, Aghunato', 'Govt. High School, Satakha',
  'Govt. Primary School, Akuluto', 'Govt. High School, Suruhoto',
  'Govt. Primary School, Tokiye', 'Govt. Middle School, Ghathashi',
  // —— Phek (6 schools) ——
  'Govt. Primary School, Pfutsero', 'Govt. Middle School, Meluri', 'Govt. High School, Phek Town',
  'Govt. Primary School, Chizami', 'Govt. Middle School, Khezhakeno', 'KGBV School, Phek',
  // —— Peren (6 schools) ——
  'Govt. Primary School, Jalukie', 'Govt. Middle School, Peren Town', 'Govt. High School, Athibung',
  'Govt. Middle School, Tening', 'Govt. Primary School, Nsong', 'Govt. Primary School, Gaili',
  // —— Longleng (5 schools) ——
  'Govt. Primary School, Longleng Town', 'Govt. Middle School, Tamlu',
  'Govt. High School, Longleng Ward', 'Govt. Primary School, Yachem', 'Govt. Primary School, Sakshi',
  // —— Kiphire (5 schools) ——
  'Govt. Primary School, Kiphire Town', 'Govt. Middle School, Pungro',
  'Govt. High School, Kiphire Ward', 'Govt. Primary School, Seyochung', 'Govt. Primary School, Thanamir',
  // —— Chumukedima (5 schools) ——
  'Govt. Primary School, Chumukedima Ward', 'Govt. Middle School, Dhansiripar',
  'Govt. High School, Chumukedima Town', 'Govt. Primary School, Sovima', 'PM Shri School, Chumukedima',
  // —— Noklak (4 schools) ——
  'Govt. Primary School, Noklak Town', 'Govt. Middle School, Thonoknyu',
  'Govt. High School, Noklak Ward', 'Govt. Primary School, Panso',
  // —— Shamator (4 schools) ——
  'Govt. Primary School, Shamator Town', 'Govt. Middle School, Kiusam',
  'Govt. High School, Shamator Ward', 'Govt. Primary School, Chessore',
  // —— Tseminyu (4 schools) ——
  'Govt. Primary School, Tseminyu Town', 'Govt. Middle School, Reguri',
  'Govt. High School, Tseminyu Ward', 'Govt. Primary School, Tesophenyu',
  // —— Niuland (3 schools) ——
  'Govt. Primary School, Niuland Town', 'Govt. Middle School, Razaphe', 'Govt. High School, Niuland Ward',
] as const;

// Map schools → district index based on comment groups above
const PROJECT_SCHOOL_DISTRICT_MAP: number[] = [
  // Dimapur (15)
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  // Kohima (14)
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  // Mokokchung (10)
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  // Tuensang (8)
  3, 3, 3, 3, 3, 3, 3, 3,
  // Mon (8)
  4, 4, 4, 4, 4, 4, 4, 4,
  // Wokha (7)
  5, 5, 5, 5, 5, 5, 5,
  // Zunheboto (7)
  6, 6, 6, 6, 6, 6, 6,
  // Phek (6)
  7, 7, 7, 7, 7, 7,
  // Peren (6)
  8, 8, 8, 8, 8, 8,
  // Longleng (5)
  9, 9, 9, 9, 9,
  // Kiphire (5)
  10, 10, 10, 10, 10,
  // Chumukedima (5)
  11, 11, 11, 11, 11,
  // Noklak (4)
  12, 12, 12, 12,
  // Shamator (4)
  13, 13, 13, 13,
  // Tseminyu (4)
  14, 14, 14, 14,
  // Niuland (3)
  15, 15, 15,
];

const CONTRACTORS = [
  'M/s Alpha Constructions', 'M/s Beta Builders', 'M/s Gamma Infrastructure', 'M/s Delta Engineering',
  'M/s Epsilon Projects', 'M/s Zeta Construction Co.', 'M/s Eta Builders Pvt. Ltd.', 'M/s Theta Enterprises',
  'M/s Iota Civil Works', 'M/s Kappa Construction Group', 'M/s Lambda Infra', 'M/s Naga Builders',
  'M/s Omega Developers', 'M/s Sigma Associates', 'M/s Nagaland Infrastructure Pvt. Ltd.',
  'M/s Eastern Constructions', 'M/s Highland Projects', 'M/s Unity Builders',
] as const;

// Financial ranges by activity type (in lakhs)
const ACTIVITY_COST_RANGES: Record<string, [number, number]> = {
  'Hostel': [100, 350],
  'Construction of New Building': [80, 300],
  'New Government Primary School': [60, 250],
  'Additional Classroom': [30, 120],
  'Major Repair': [25, 110],
  'Major Repair (Rejuvenation)': [20, 90],
  'Boundary Wall': [15, 80],
  'Boundary Wall (Rejuvenation)': [10, 60],
  'Dilapidated Building (Primary)': [35, 140],
  'Dilapidated Building (Upper Primary)': [40, 160],
  'Dilapidated Classrooms (Primary)': [20, 90],
  'Dilapidated Classroom (Upper Primary)': [25, 100],
  'Upgradation of School (6-8)': [30, 120],
  'ICT Lab': [20, 70],
  'Vocational Lab': [25, 85],
  'Science Lab': [18, 65],
  'Library Room': [12, 50],
  'Augmentation of EBRC': [15, 55],
  'Boys Toilet': [5, 35],
  'Girls Toilet': [5, 35],
  'Boys Toilet (Rejuvenation)': [3, 25],
  'Girls Toilet (Rejuvenation)': [3, 25],
  'Drinking Water Facility': [5, 40],
  'Electrification': [8, 45],
  'Electrification (Rejuvenation)': [5, 30],
  'Rain Water Harvesting': [4, 25],
};
const DEFAULT_COST_RANGE: [number, number] = [15, 100];

const projectSchoolIds: string[] = [];
const projectSchoolMeta: Array<{
  id: string;
  name: string;
  district_id: string;
  district_name: string;
  udise_code: string;
  category: string;
}> = [];

function seedProjectSchools(): void {
  let count = 0;
  for (let i = 0; i < PROJECT_SCHOOL_NAMES.length; i++) {
    const id = newId('project_schools');
    const distIdx = PROJECT_SCHOOL_DISTRICT_MAP[i];
    const districtId = ids.districtIds[distIdx];
    const districtName = nagalandDistricts[distIdx]?.name ?? `District ${distIdx}`;
    // Weighted category selection instead of round-robin
    const category = weightedRandom(PROJECT_SCHOOL_CATEGORIES, CATEGORY_WEIGHTS);
    // District-based UDISE code prefix for realism
    const udise_code = `${11200000000 + (distIdx + 1) * 1000 + i + 1}`;
    const ebrc = PROJECT_EBRC_NAMES[distIdx % PROJECT_EBRC_NAMES.length];

    const doc = {
      id,
      name: PROJECT_SCHOOL_NAMES[i],
      category,
      district_id: districtId,
      district_name: districtName,
      udise_code,
      ebrc,
      created_at: TS(),
      updated_at: TS(),
    };

    writer.set(db.collection('project_schools').doc(id), doc);
    projectSchoolIds.push(id);
    projectSchoolMeta.push({ id, name: PROJECT_SCHOOL_NAMES[i], district_id: districtId, district_name: districtName, udise_code, category });
    count++;
  }
  console.log(`✅ ${count} project schools`);
}

function seedProjects(): void {
  const TARGET = 500;
  const STATUSES = ['Not Started', 'In Progress', 'Completed'] as const;
  const STATUS_WEIGHTS = [25, 45, 30]; // weighted %

  // Status-specific remarks for realism
  const REMARKS_BY_STATUS: Record<string, string[]> = {
    'Not Started': ['', 'Fund Awaited', 'Site Survey Pending', 'DPR Under Preparation', 'Tender Process', 'Land Dispute', 'Pending Administrative Approval'],
    'In Progress': ['On Track', 'Delayed', 'Pending Material', 'Labour Shortage', 'Weather Delay', 'Slow Progress', 'Nearing Completion', 'Foundation Complete', '50% Work Done', 'Roof Level Reached'],
    'Completed': ['', 'Completed on time', 'Completed with delay', 'Handed over to school', 'Final inspection done', 'Utilization certificate submitted'],
  };

  const pickStatus = (): string => {
    const r = Math.random() * 100;
    if (r < STATUS_WEIGHTS[0]) return STATUSES[0];
    if (r < STATUS_WEIGHTS[0] + STATUS_WEIGHTS[1]) return STATUSES[1];
    return STATUSES[2];
  };

  // Build a pool: each school gets 1-8 projects (weighted towards 3-5)
  const pool: typeof projectSchoolMeta = [];
  for (const school of projectSchoolMeta) {
    const projectCount = weightedRandom([1, 2, 3, 4, 5, 6, 7, 8], [5, 10, 20, 25, 20, 10, 6, 4]);
    for (let j = 0; j < projectCount; j++) {
      pool.push(school);
    }
  }
  // Shuffle pool so projects aren't grouped by school
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let count = 0;
  for (let i = 0; i < TARGET; i++) {
    const school = pool[i % pool.length];
    const id = newId('projects');
    const pabYear = weightedRandom(PAB_YEARS, PAB_YEAR_WEIGHTS);
    const activity = weightedRandom(PROJECT_ACTIVITIES, ACTIVITY_WEIGHTS);
    const contractor = randomBool(0.85) ? randomElement(CONTRACTORS) : undefined;
    const status = pickStatus();

    // Activity-based financial ranges
    const [minCost, maxCost] = ACTIVITY_COST_RANGES[activity] ?? DEFAULT_COST_RANGE;
    const approved = parseFloat((Math.random() * (maxCost - minCost) + minCost).toFixed(2));
    const civilPct = 0.80 + Math.random() * 0.14; // 80-94% of approved goes to civil cost
    const civil_cost = parseFloat((approved * civilPct).toFixed(2));
    const contingency = parseFloat((approved - civil_cost).toFixed(2));

    // Physical progress: more realistic curves
    let physical: number;
    if (status === 'Completed') {
      physical = 1;
    } else if (status === 'In Progress') {
      // Beta-like distribution — more projects in 20-60% range than at extremes
      const raw = Math.pow(Math.random(), 0.7) * 0.95 + 0.05;
      physical = parseFloat(raw.toFixed(2));
    } else {
      physical = 0;
    }

    // Monthly expenditure with varied patterns
    const monthlyValues: Record<string, number> = {};
    const months = ['april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'january', 'february', 'march'];
    let totalSpent = 0;
    if (status !== 'Not Started') {
      const monthCount = status === 'Completed' ? 12 : randomInt(1, 10);
      const pattern = weightedRandom(
        ['balanced', 'front-loaded', 'back-loaded', 'stalled', 'burst'] as const,
        [30, 20, 20, 15, 15],
      );
      for (let m = 0; m < monthCount; m++) {
        let val: number;
        const monthBudget = approved / 12;
        switch (pattern) {
          case 'front-loaded':
            val = parseFloat((monthBudget * (2.5 - (m / monthCount) * 2) * Math.random()).toFixed(2));
            break;
          case 'back-loaded':
            val = parseFloat((monthBudget * ((m / monthCount) * 2 + 0.3) * Math.random()).toFixed(2));
            break;
          case 'stalled':
            val = m < Math.ceil(monthCount / 2) ? parseFloat((monthBudget * Math.random()).toFixed(2)) : 0;
            break;
          case 'burst':
            // Most spending in 2-3 random months
            val = randomBool(0.25) ? parseFloat((monthBudget * (2 + Math.random() * 2)).toFixed(2)) : parseFloat((monthBudget * 0.1 * Math.random()).toFixed(2));
            break;
          default: // balanced
            val = parseFloat((Math.random() * monthBudget * 2).toFixed(2));
        }
        monthlyValues[months[m]] = val;
        totalSpent += val;
      }
    }
    for (const m of months) {
      if (!(m in monthlyValues)) monthlyValues[m] = 0;
    }

    const balance = parseFloat((approved - totalSpent).toFixed(2));

    const doc: Record<string, unknown> = {
      id,
      project_school_id: school.id,
      school_name: school.name,
      district_name: school.district_name,
      udise_code: school.udise_code,
      pab_year: pabYear,
      category: school.category,
      activity,
      status,
      physical,
      approved,
      civil_cost,
      contingency,
      ...monthlyValues,
      balance,
      remarks: randomElement(REMARKS_BY_STATUS[status] ?? ['']),
      created_at: TS(),
      updated_at: TS(),
    };
    if (contractor) doc.contractor = contractor;

    writer.set(db.collection('projects').doc(id), doc);
    count++;
  }
  console.log(`✅ ${count} projects`);
}

// ────────────────────── ACTIVITY FORMS ──────────────────────

const ACTIVITY_FORM_NAMES = ['ICT', 'Library', 'Science Lab', 'Self Defence', 'Vocational Education', 'KGBV', 'NSCBAV'] as const;

function seedActivityForms(): void {
  console.log('📋 Creating activity forms...');
  let count = 0;

  // Current date for computing realistic windows
  const now = new Date();
  const dayMs = 86400000;

  // Define realistic date windows per form.
  // Firestore stores admin-set status ('Open'/'Closed').
  // The EFFECTIVE status is computed at read time:
  //   Active   = admin set 'Open' AND today is within [start, end]
  //   Inactive = admin set 'Open' AND today is BEFORE start
  //   Closed   = admin set 'Closed' OR today is AFTER end
  const formConfigs: { name: string; status: 'Open' | 'Closed'; startOffset: number; durationDays: number }[] = [
    { name: 'ICT', status: 'Open', startOffset: -5, durationDays: 20 },  // → Active
    { name: 'Library', status: 'Open', startOffset: -3, durationDays: 14 },  // → Active
    { name: 'Science Lab', status: 'Open', startOffset: 10, durationDays: 14 },  // → Inactive (future)
    { name: 'Self Defence', status: 'Open', startOffset: -30, durationDays: 10 },  // → Closed (expired)
    { name: 'Vocational Education', status: 'Closed', startOffset: 0, durationDays: 0 },  // → Closed (never opened)
    { name: 'KGBV', status: 'Open', startOffset: -2, durationDays: 7 },  // → Active
    { name: 'NSCBAV', status: 'Open', startOffset: -2, durationDays: 7 },  // → Active
  ];

  for (const cfg of formConfigs) {
    const id = newId('activity_forms');
    const startDate = new Date(now.getTime() + cfg.startOffset * dayMs);
    const endDate = new Date(startDate.getTime() + cfg.durationDays * dayMs);

    writer.set(db.collection('activity_forms').doc(id), {
      id,
      name: cfg.name,
      status: cfg.status,
      starting_date: cfg.status === 'Open' ? admin.firestore.Timestamp.fromDate(startDate) : null,
      ending_date: cfg.status === 'Open' ? admin.firestore.Timestamp.fromDate(endDate) : null,
      created_at: TS(),
      updated_at: TS(),
    });
    count++;
  }
  console.log(`✅ ${count} activity forms`);
}

// ────────────────────── ICT FORM DATA (submitted forms) ──────────────────────

const ICT_FORM_COUNT = Number(process.env.SEED_ICT_FORMS || 50);
const SMART_TV_LOCATIONS = ['Classrooms', 'Other Rooms'] as const;
const ICT_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&q=80',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80',
];

function seedICTFormData(): void {
  console.log(`📝 Creating ${ICT_FORM_COUNT} ICT form submissions...`);
  let count = 0;
  const teacherPool = [...ids.teacherIds.slice(0, 2000), ...ids.headmasterIds.slice(0, 500)];

  for (let i = 0; i < ICT_FORM_COUNT; i++) {
    const schoolIdx = randomInt(0, Math.min(ids.schoolIds.length - 1, 200));
    const schoolId = ids.schoolIds[schoolIdx];
    const districtId = ids.schoolDistrictMap.get(schoolId)!;
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';
    const userId = randomElement(teacherPool);
    const numPhotos = randomInt(1, 5);
    const photos = Array.from({ length: numPhotos }, () => randomElement(ICT_PHOTO_URLS));

    const id = newId('ict_form_data');
    writer.set(db.collection('ict_form_data').doc(id), {
      id,
      school_id: schoolId,
      school_name: `School #${schoolIdx + 1}, ${districtName}`,
      district: districtName,
      udise: `11${String(randomInt(10000000, 99999999))}`,
      submitted_by: userId,
      submitted_by_name: generateName(),
      submitted_by_role: randomElement(['TEACHER', 'HEADMASTER']),
      // Page 1
      have_smart_tvs: randomElement(['Yes', 'No']),
      have_ups: randomElement(['Yes', 'No']),
      have_pendrives: randomElement(['Yes', 'No']),
      ict_materials_working: randomElement(['Yes', 'No']),
      smart_tvs_wall_mounted: randomElement(['Yes', 'No']),
      smart_tvs_location: randomElement(SMART_TV_LOCATIONS),
      photos_of_materials: photos,
      // Page 2
      smart_class_in_routine: randomElement(['Yes', 'No']),
      school_routine: randomBool(0.6) ? `https://storage.example.com/ict-forms/routine_${i}.pdf` : '',
      weekly_smart_class: String(randomInt(1, 5)),
      has_logbook: randomElement(['Yes', 'No']),
      logbook: randomBool(0.5) ? `https://storage.example.com/ict-forms/logbook_${i}.pdf` : '',
      // Page 3
      students_benefited: String(randomInt(20, 500)),
      smart_tvs_other_purposes: randomElement(['Yes', 'No']),
      is_smart_class_benefiting: randomElement(['Yes', 'No']),
      benefit_comment: randomBool(0.5) ? 'Students are showing improved engagement and understanding' : '',
      noticed_impact: randomElement([
        'Significant improvement in student engagement',
        'Students show better conceptual understanding',
        'Attendance has improved since Smart Class introduction',
        'Teachers find it easier to explain complex topics',
        'No significant change noticed yet',
      ]),
      how_program_helped: randomElement([
        'Teachers can present visual content more effectively',
        'Digital resources supplement textbook learning',
        'Interactive lessons keep students focused',
        'Teachers use online resources for lesson planning',
        'Program has provided better teaching tools',
      ]),
      observations: randomElement([
        'Good infrastructure. Smart TVs are well maintained.',
        'Need additional training for teachers on ICT usage.',
        'UPS systems need replacement. Otherwise good condition.',
        'Students are enthusiastic about Smart Class sessions.',
        'Some equipment needs repair. Overall satisfactory.',
      ]),
      created_at: admin.firestore.Timestamp.fromDate(generateDate(2025, 2026)),
    });
    count++;
  }
  console.log(`✅ ${count} ICT form submissions`);
}

// ────────────────────── LIBRARY FORM DATA (submitted forms) ──────────────────────

const LIBRARY_FORM_COUNT = Number(process.env.SEED_LIBRARY_FORMS || 50);
const LIBRARY_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
  'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80',
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80',
  'https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=800&q=80',
  'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&q=80',
  'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&q=80',
];

const INNOVATIVE_INITIATIVES = [
  'Weekly storytelling sessions for younger students',
  'Reading challenge program with monthly awards',
  'Book donation drive involving local community',
  'Digital reading corner with tablets for e-books',
  'Student-run book club with monthly discussions',
  'Library ambassadors program among senior students',
  'Parent-child reading hour every Saturday',
  'Integration of library period with activity-based learning',
];

function seedLibraryFormData(): void {
  console.log(`📚 Creating ${LIBRARY_FORM_COUNT} Library form submissions...`);
  let count = 0;
  const teacherPool = [...ids.teacherIds.slice(0, 2000), ...ids.headmasterIds.slice(0, 500)];

  for (let i = 0; i < LIBRARY_FORM_COUNT; i++) {
    const schoolIdx = randomInt(0, Math.min(ids.schoolIds.length - 1, 200));
    const schoolId = ids.schoolIds[schoolIdx];
    const districtId = ids.schoolDistrictMap.get(schoolId)!;
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';
    const userId = randomElement(teacherPool);
    const numStudentPhotos = randomInt(1, 5);
    const numLogbookPhotos = randomInt(1, 3);
    const studentPhotos = Array.from({ length: numStudentPhotos }, () => randomElement(LIBRARY_PHOTO_URLS));
    const logbookPhotos = Array.from({ length: numLogbookPhotos }, () => randomElement(LIBRARY_PHOTO_URLS));

    const id = newId('library_form_data');
    writer.set(db.collection('library_form_data').doc(id), {
      id,
      school_id: schoolId,
      school_name: `School #${schoolIdx + 1}, ${districtName}`,
      district: districtName,
      udise: `11${String(randomInt(10000000, 99999999))}`,
      submitted_by: userId,
      submitted_by_name: generateName(),
      submitted_by_role: randomElement(['TEACHER', 'HEADMASTER']),
      is_library_available: randomElement(['Yes', 'No']),
      is_child_friendly: randomElement(['Yes', 'No']),
      has_proper_furniture: randomElement(['Yes', 'No']),
      has_management_committee: randomElement(['Yes', 'No']),
      library_teacher_name: generateName(),
      has_reading_corner: randomElement(['Yes', 'No']),
      number_of_reading_corners: String(randomInt(0, 5)),
      number_of_computers: String(randomInt(0, 10)),
      has_readers_club: randomElement(['Yes', 'No']),
      has_weekly_library_period: randomElement(['Yes', 'No']),
      library_periods_per_week: String(randomInt(1, 5)),
      received_books_from_samagra: randomElement(['Yes', 'No']),
      number_of_books_received: String(randomInt(0, 200)),
      innovative_initiative: randomElement(INNOVATIVE_INITIATIVES),
      suggestions_feedback: randomBool(0.5) ? 'More books and reading materials needed for lower classes' : '',
      student_photos: studentPhotos,
      logbook_photos: logbookPhotos,
      created_at: admin.firestore.Timestamp.fromDate(generateDate(2025, 2026)),
    });
    count++;
  }
  console.log(`✅ ${count} Library form submissions`);
}

// ────────────────────── SCIENCE LAB FORM DATA (submitted forms) ──────────────────────

const SCIENCE_LAB_FORM_COUNT = Number(process.env.SEED_SCIENCE_LAB_FORMS || 50);
const SCIENCE_LAB_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80',
  'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&q=80',
  'https://images.unsplash.com/photo-1564325724739-bae0bd08762c?w=800&q=80',
  'https://images.unsplash.com/photo-1581093458791-9d42e3c7e117?w=800&q=80',
  'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80',
  'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=800&q=80',
  'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&q=80',
  'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=800&q=80',
];

function seedScienceLabFormData(): void {
  console.log(`🔬 Creating ${SCIENCE_LAB_FORM_COUNT} Science Lab form submissions...`);
  let count = 0;
  const teacherPool = [...ids.teacherIds.slice(0, 2000), ...ids.headmasterIds.slice(0, 500)];

  for (let i = 0; i < SCIENCE_LAB_FORM_COUNT; i++) {
    const schoolIdx = randomInt(0, Math.min(ids.schoolIds.length - 1, 200));
    const schoolId = ids.schoolIds[schoolIdx];
    const districtId = ids.schoolDistrictMap.get(schoolId)!;
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';
    const userId = randomElement(teacherPool);
    const numStudentPhotos = randomInt(1, 5);
    const numLogbookPhotos = randomInt(1, 3);
    const studentPhotos = Array.from({ length: numStudentPhotos }, () => randomElement(SCIENCE_LAB_PHOTO_URLS));
    const logbookPhotos = Array.from({ length: numLogbookPhotos }, () => randomElement(SCIENCE_LAB_PHOTO_URLS));

    const id = newId('science_lab_form_data');
    writer.set(db.collection('science_lab_form_data').doc(id), {
      id,
      school_id: schoolId,
      school_name: `School #${schoolIdx + 1}, ${districtName}`,
      district: districtName,
      udise: `11${String(randomInt(10000000, 99999999))}`,
      submitted_by: userId,
      submitted_by_name: generateName(),
      submitted_by_role: randomElement(['TEACHER', 'HEADMASTER']),
      kit_teacher_name: generateName(),
      experiments_per_week: String(randomInt(1, 10)),
      student_photos: studentPhotos,
      logbook_photos: logbookPhotos,
      created_at: admin.firestore.Timestamp.fromDate(generateDate(2025, 2026)),
    });
    count++;
  }
  console.log(`✅ ${count} Science Lab form submissions`);
}

// ────────────────────── SELF DEFENSE FORM DATA (submitted forms) ──────────────────────

const SELF_DEFENSE_FORM_COUNT = Number(process.env.SEED_SELF_DEFENSE_FORMS || 50);
const SELF_DEFENSE_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  'https://images.unsplash.com/photo-1616279969862-40c1b6f2f238?w=800&q=80',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',
];

const INSTRUCTOR_NAMES = [
  'Ravi Kumar', 'Sanjay Thakur', 'Neha Sharma', 'Priya Devi',
  'Amit Singh', 'Anjali Verma', 'Rajesh Nair', 'Kavita Rao',
];

function seedSelfDefenseFormData(): void {
  console.log(`🥋 Creating ${SELF_DEFENSE_FORM_COUNT} Self Defense form submissions...`);
  let count = 0;
  const teacherPool = [...ids.teacherIds.slice(0, 2000), ...ids.headmasterIds.slice(0, 500)];

  for (let i = 0; i < SELF_DEFENSE_FORM_COUNT; i++) {
    const schoolIdx = randomInt(0, Math.min(ids.schoolIds.length - 1, 200));
    const schoolId = ids.schoolIds[schoolIdx];
    const districtId = ids.schoolDistrictMap.get(schoolId)!;
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';
    const userId = randomElement(teacherPool);

    const id = newId('self_defense_form_data');
    writer.set(db.collection('self_defense_form_data').doc(id), {
      id,
      school_id: schoolId,
      school_name: `School #${schoolIdx + 1}, ${districtName}`,
      district: districtName,
      udise: `11${String(randomInt(10000000, 99999999))}`,
      submitted_by: userId,
      submitted_by_name: generateName(),
      submitted_by_role: randomElement(['TEACHER', 'HEADMASTER']),
      photo: randomElement(SELF_DEFENSE_PHOTO_URLS),
      classes_per_week: String(randomInt(1, 5)),
      classes_per_month: String(randomInt(4, 20)),
      girl_participants: String(randomInt(10, 100)),
      girls_benefited: String(randomInt(10, 80)),
      instructor_name: randomElement(INSTRUCTOR_NAMES),
      contact_number: `9${String(randomInt(100000000, 999999999))}`,
      created_at: admin.firestore.Timestamp.fromDate(generateDate(2025, 2026)),
    });
    count++;
  }
  console.log(`✅ ${count} Self Defense form submissions`);
}

// ── KGBV Form Data ──

const KGBV_FORM_COUNT = Number(process.env.SEED_KGBV_FORMS || 40);
const KGBV_ACTIVITY_OPTIONS = [
  'Vocational Classes / Life Skills', 'Self Defence', 'Screening of the Film Komul',
  'Medical Camp', 'Remedial Classes', 'Awareness on Mental Health',
  'Community Services', 'Display of Vocational / Lifeskills Products', 'Sports Week',
  'Awareness on Menstrual Health and Hygiene',
  'Cultural Day - Folk Songs, Dances, Indigenous Food Preparation',
  'Parents Teachers Meet', 'Awareness on Cyber Bullying',
  'Remedial Classes for Class 10 / 11 / 12', 'Career Guidance for Class 10 / 12',
  'Orientation to New Hostellers', 'Awareness on Etiquettes',
  'Screening of the Film Tare Zameen Par', 'Literary Competitions',
  'Documentation of Best Practices',
];
const KGBV_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
];

function seedKGBVFormData(): void {
  console.log(`🏫 Creating ${KGBV_FORM_COUNT} KGBV form submissions...`);
  let count = 0;
  const wardenPool = ids.kgbvWardenIds;
  if (!wardenPool.length) {
    console.log('⚠️  No KGBV wardens found, skipping KGBV form data');
    return;
  }

  for (let i = 0; i < KGBV_FORM_COUNT; i++) {
    const userId = randomElement(wardenPool);
    const districtId = getWeightedDistrictId();
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';

    const id = newId('kgbv_form_data');
    writer.set(db.collection('kgbv_form_data').doc(id), {
      id,
      ebrc: randomElement(ebrcNames),
      district: districtName,
      kgbv_type: randomElement(kgbvTypes),
      submitted_by: userId,
      submitted_by_name: generateName(),
      submitted_by_role: 'KGBV_WARDEN',
      photo: randomElement(KGBV_PHOTO_URLS),
      activity: randomElement(KGBV_ACTIVITY_OPTIONS),
      girl_participants: String(randomInt(10, 80)),
      girls_benefited: String(randomInt(10, 60)),
      materials_used: randomElement(['Charts & Posters', 'Sports Equipment', 'Art Supplies', 'Computer & Projector', 'Books & Stationery', 'Music Instruments']),
      instructor_name: randomElement(INSTRUCTOR_NAMES),
      contact_number: `9${String(randomInt(100000000, 999999999))}`,
      best_practices: randomElement([
        'Regular schedule maintained for all activities',
        'Girls actively participate and show improvement',
        'Community involvement in activity planning',
        'Skill-based learning integrated into activities',
        'Monitoring and evaluation conducted regularly',
      ]),
      success_story: randomInt(0, 1) ? randomElement([
        'Several girls won district-level competitions',
        'Improved confidence and communication skills observed',
        'Girls developed leadership qualities through group activities',
        'Vocational skills helped girls become self-reliant',
      ]) : '',
      created_at: admin.firestore.Timestamp.fromDate(generateDate(2025, 2026)),
    });
    count++;
  }
  console.log(`✅ ${count} KGBV form submissions`);
}

// ── NSCBAV Form Data ──

const NSCBAV_FORM_COUNT = Number(process.env.SEED_NSCBAV_FORMS || 40);
const NSCBAV_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
];

function seedNSCBAVFormData(): void {
  console.log(`🏠 Creating ${NSCBAV_FORM_COUNT} NSCBAV form submissions...`);
  let count = 0;
  const wardenPool = ids.nscbavWardenIds;
  if (!wardenPool.length) {
    console.log('⚠️  No NSCBAV wardens found, skipping NSCBAV form data');
    return;
  }

  for (let i = 0; i < NSCBAV_FORM_COUNT; i++) {
    const userId = randomElement(wardenPool);
    const districtId = getWeightedDistrictId();
    const districtName = nagalandDistricts.find((_, idx) => ids.districtIds[idx] === districtId)?.name ?? 'Nagaland';

    const id = newId('nscbav_form_data');
    writer.set(db.collection('nscbav_form_data').doc(id), {
      id,
      ebrc: randomElement(ebrcNames),
      district: districtName,
      submitted_by: userId,
      submitted_by_name: generateName(),
      submitted_by_role: 'NSCBAV_WARDEN',
      photo: randomElement(NSCBAV_PHOTO_URLS),
      girl_participants: String(randomInt(10, 80)),
      girls_benefited: String(randomInt(10, 60)),
      materials_used: randomElement(['Charts & Posters', 'Sports Equipment', 'Art Supplies', 'Computer & Projector', 'Books & Stationery', 'Music Instruments']),
      instructor_name: randomElement(INSTRUCTOR_NAMES),
      contact_number: `9${String(randomInt(100000000, 999999999))}`,
      best_practices: randomElement([
        'Regular schedule maintained for all activities',
        'Girls actively participate and show improvement',
        'Community involvement in activity planning',
        'Skill-based learning integrated into activities',
        'Monitoring and evaluation conducted regularly',
      ]),
      success_story: randomInt(0, 1) ? randomElement([
        'Several girls won district-level competitions',
        'Improved confidence and communication skills observed',
        'Girls developed leadership qualities through group activities',
        'Vocational skills helped girls become self-reliant',
      ]) : '',
      created_at: admin.firestore.Timestamp.fromDate(generateDate(2025, 2026)),
    });
    count++;
  }
  console.log(`✅ ${count} NSCBAV form submissions`);
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main(): Promise<void> {
  const clearFirst = process.env.CLEAR_FIRST !== 'false';

  console.log(`\n[Firestore Seed] Project: ${projectId}`);
  console.log(`[Firestore Seed] Emulator: ${useEmulator ? process.env.FIRESTORE_EMULATOR_HOST : 'disabled'}`);
  console.log(`[Firestore Seed] Clear first: ${clearFirst}`);
  console.log(`[Firestore Seed] Scale: ${JSON.stringify(SCALE, null, 2)}\n`);

  if (clearFirst) {
    console.log('ðŸ—‘ï¸  Clearing existing data...');
    for (const name of ALL_COLLECTIONS) {
      await clearCollection(name);
    }
    console.log('âœ… Existing data cleared\n');
  }

  // â”€â”€ Seed in dependency order (sync writes buffered through streaming writer) â”€â”€

  seedDistricts();
  seedSchools();
  seedSubjects();

  seedCoreAdminUsers();
  seedBulkUsers();

  seedFaculty();

  seedAuditLogs();

  seedEvents();
  seedEventInvitations();

  seedNotices();
  seedNoticeRecipients();

  seedCirculars();
  seedCircularSchools();

  seedHelpdeskTickets();
  seedNotificationLogs();
  seedUserStars();

  seedProjectSchools();
  seedProjects();

  seedActivityForms();
  seedICTFormData();
  seedLibraryFormData();
  seedScienceLabFormData();
  seedSelfDefenseFormData();
  seedKGBVFormData();
  seedNSCBAVFormData();

  // â”€â”€ Flush all buffered writes â”€â”€
  await writer.close();

  // â”€â”€ Summary â”€â”€
  console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸ“Š SEEDING COMPLETE â€” LARGE SCALE NAGALAND DATASET SUMMARY');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log(`ðŸ‘¥ Users:                    ${ids.allUserIds.length}`);
  console.log(`   - ADMIN:                  ${ids.adminIds.length}`);
  console.log(`   - HEADMASTER:             ${ids.headmasterIds.length}`);
  console.log(`   - TEACHER:                ${ids.teacherIds.length}`);
  console.log(`   - IE_RESOURCE_PERSON:     ${ids.ieResourcePersonIds.length}`);
  console.log(`   - KGBV_WARDEN:            ${ids.kgbvWardenIds.length}`);
  console.log(`   - NSCBAV_WARDEN:          ${ids.nscbavWardenIds.length}`);
  console.log(`   - JUNIOR_ENGINEER:        ${ids.juniorEngineerIds.length}`);
  console.log(`ðŸ—ºï¸  Districts:                ${ids.districtIds.length}`);
  console.log(`ðŸ« Schools:                  ${ids.schoolIds.length}`);
  console.log(`ðŸ‘¨â€ðŸ« Faculty:                  ${ids.teachingFacultyIds.length + Math.min(ids.headmasterIds.length, ids.schoolIds.length)}`);

  console.log(`ðŸ“‹ Audit Logs:               ${SCALE.auditLogs}`);
  console.log(`ðŸ“… Events:                   ${ids.eventIds.length}`);
  console.log(`âœ‰ï¸  Event Invitations:        (see above)`);
  console.log(`ðŸ“¢ Notices:                  ${ids.noticeIds.length}`);
  console.log(`ðŸ“¬ Notice Recipients:        (see above)`);
  console.log(`ðŸ“„ Circulars:                ${ids.circularIds.length}`);
  console.log(`ðŸ”— Circular Schools:         (see above)`);
  console.log(`ðŸŽ« Helpdesk Tickets:         ${SCALE.helpdeskTickets}`);
  console.log(`ðŸ”” Notification Logs:        ${SCALE.notificationLogs}`);
  console.log(`â­ User Stars:               ${SCALE.userStars}`);
  console.log(`🏗️  Project Schools:          ${projectSchoolIds.length}`);
  console.log(`🔨 Projects:                 ${500}`);
  console.log(`📝 ICT Form Submissions:     ${ICT_FORM_COUNT}`);
  console.log(`📚 Library Form Submissions: ${LIBRARY_FORM_COUNT}`);
  console.log(`🔬 Science Lab Submissions:  ${SCIENCE_LAB_FORM_COUNT}`);
  console.log(`🥋 Self Defense Submissions: ${SELF_DEFENSE_FORM_COUNT}`);
  console.log(`🏫 KGBV Form Submissions:    ${KGBV_FORM_COUNT}`);
  console.log(`🏠 NSCBAV Form Submissions:  ${NSCBAV_FORM_COUNT}`);
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('\nðŸŽ‰ Firestore seeding completed successfully!');
  console.log('ðŸ“ Default password for all users: 12345678\n');
}

main()
  .catch((error) => {
    console.error('âŒ [Firestore Seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.app().delete();
  });

