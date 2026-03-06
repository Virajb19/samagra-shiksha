import { z } from "zod";

// Valid class groups for SUBJECT_COORDINATOR
export const CLASS_GROUPS = ['8-10', '11-12'] as const;
export type ClassGroup = typeof CLASS_GROUPS[number];

// Predefined subjects list
export const SUBJECTS = [
  'Assamese',
  'English',
  'Hindi',
  'Mathematics',
  'General Science',
  'Social Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'Political Science',
  'History',
  'Geography',
  'Sanskrit',
  'Bengali',
  'Bodo',
  'Nepali',
  'Manipuri',
] as const;

export const loginSchema = z.object({
  email: z.email({ message: 'Please enter a valid email' }).trim(),
  password: z.string().min(8, { message: 'Password must be atleast 8 letters long' }).max(15, { message: 'Password cannot exceed 15 characters' }),
  phone: z.string().min(1, { message: "Phone number is required" }).regex(/^[+]?[\d\s-]{10,15}$/, { message: 'Invalid phone number format' }),
  // SUBJECT_COORDINATOR specific fields (optional)
  subject: z.string().optional(),
  classGroup: z.enum(CLASS_GROUPS).optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// File validation constants for circulars
const CIRCULAR_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CIRCULAR_ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

// Circular file validation
const circularFileValidation = z
  .instanceof(File)
  .optional()
  .refine(
    (file) => !file || file.size <= CIRCULAR_MAX_FILE_SIZE,
    'File size must be less than 10MB'
  )
  .refine(
    (file) => !file || CIRCULAR_ALLOWED_FILE_TYPES.includes(file.type),
    'Only PNG, JPG, or PDF files are allowed'
  );

// Form validation schema for circulars - supports multiple schools
export const circularFormSchema = z.object({
  title: z.string().min(1, 'Circular title is required'),
  description: z.string().optional(),
  issued_by: z.string().min(1, 'Issued by is required'),
  issued_date: z.string().min(1, 'Issued date is required'),
  effective_date: z.string().optional(),
  district_id: z.string().optional(),
  school_ids: z.array(z.string()).optional(), // Multiple schools support
  file: circularFileValidation,
});

export type CircularFormSchema = z.infer<typeof circularFormSchema>;

// Notification types
export const notificationTypes = ['General', 'Invitation', 'Push Notification'] as const;
export type NotificationType = typeof notificationTypes[number];

// File validation for notifications
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

// Common file validation
const fileValidation = z
  .instanceof(File)
  .optional()
  .refine(
    (file) => !file || file.size <= MAX_FILE_SIZE,
    'File size must be less than 5MB'
  )
  .refine(
    (file) => !file || ALLOWED_FILE_TYPES.includes(file.type),
    'Only PNG, JPG, or PDF files are allowed'
  );

// Base schema for all notification types
const baseNotificationSchema = z.object({
  type: z.enum(notificationTypes),
  file: fileValidation,
});

// General notification schema
export const generalNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('General'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message cannot exceed 2000 characters'),
});

// Invitation notification schema
export const invitationNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Invitation'),
  heading: z.string().min(1, 'Heading is required').max(500, 'Heading cannot exceed 500 characters'),
  venue: z.string().min(1, 'Venue is required'),
  eventTime: z.string().min(1, 'Event time is required'),
  eventDate: z.string().min(1, 'Event date is required'),
});

// Push Notification schema
export const pushNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('Push Notification'),
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message cannot exceed 2000 characters'),
});

// Union of all notification schemas
export const sendNotificationSchema = z.discriminatedUnion('type', [
  generalNotificationSchema,
  invitationNotificationSchema,
  pushNotificationSchema,
]);

export type SendNotificationSchema = z.infer<typeof sendNotificationSchema>;
export type GeneralNotificationSchema = z.infer<typeof generalNotificationSchema>;
export type InvitationNotificationSchema = z.infer<typeof invitationNotificationSchema>;
export type PushNotificationSchema = z.infer<typeof pushNotificationSchema>;

// ── Project Management Schemas ──

export const PROJECT_SCHOOL_CATEGORIES = [
  'Elementary', 'Secondary', 'Higher Secondary', 'PM Shri', 'NSCBAV', 'DA JGUA', 'KGBV-IV',
] as const;

export const EBRC_OPTIONS = [
  'Aghunato', 'Akuluto', 'Athibung', 'Chiephobozou', 'Chumukedima',
  'Dhansaripar', 'Dimapur', 'Jakhama', 'Kohima', 'Kohima Town',
  'Kuhuboto', 'L. Khel', 'Medziphema', 'Mokokchung', 'Mon',
  'Niuland', 'Noklak', 'Peren', 'Phek', 'Pungro',
  'Sanis', 'Satakha', 'Sechu-Zubza', 'Shamator', 'Suruhoto',
  'Thonoknyu', 'Tizit', 'Tobu', 'Tseminyu', 'Tuensang',
  'Wokha', 'Zunheboto', 'Kiphire', 'Longleng',
] as const;

export const PROJECT_ACTIVITIES = [
  'New Government Primary School',
  'Construction of New Building',
  'Boys Toilet',
  'Girls Toilet',
  'Boys Toilet (Rejuvenation)',
  'Girls Toilet (Rejuvenation)',
  'Additional Classroom',
  'Augmentation of EBRC',
  'Boundary Wall',
  'Boundary Wall (Rejuvenation)',
  'Dilapidated Classrooms (Primary)',
  'Dilapidated Classroom (Upper Primary)',
  'Drinking Water Facility',
  'Electrification',
  'Electrification (Rejuvenation)',
  'Major Repair',
  'Major Repair (Rejuvenation)',
  'Rain Water Harvesting',
  'Upgradation of School (6-8)',
  'Dilapidated Building (Primary)',
  'Dilapidated Building (Upper Primary)',
  'Hostel',
  'ICT Lab',
  'Vocational Lab',
  'Library Room',
  'Science Lab',
] as const;

export const PAB_YEARS = [
  '2023 - 2024',
  '2024 - 2025',
  '2025 - 2026',
  '2026 - 2027',
] as const;

// Project School form schema
export const projectSchoolFormSchema = z.object({
  name: z.string().min(1, 'School / Hostel name is required'),
  district_id: z.string().min(1, 'District is required'),
  category: z.string().min(1, 'Category is required'),
  udise_code: z.string().min(1, 'UDISE / Hostel ID is required'),
  ebrc: z.string().min(1, 'EBRC is required'),
});

export type ProjectSchoolFormValues = z.infer<typeof projectSchoolFormSchema>;

// Project form schema
export const projectFormSchema = z.object({
  udise_code: z.string().min(1, 'UDISE / Hostel ID is required'),
  pab_year: z.string().min(1, 'PAB Year is required'),
  category: z.string().min(1, 'Category is required'),
  activity: z.string().min(1, 'Activity is required'),
  contractor: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

// ── Activity Form Date Schema (Admin open-form dialog) ──

export const activityFormDateSchema = z.object({
  starting_date: z.string().min(1, 'Starting date is required'),
  ending_date: z.string().min(1, 'Ending date is required'),
}).refine(
  (data) => new Date(data.ending_date) >= new Date(data.starting_date),
  { message: 'Ending date must be after starting date', path: ['ending_date'] }
);

export type ActivityFormDateSchema = z.infer<typeof activityFormDateSchema>;

