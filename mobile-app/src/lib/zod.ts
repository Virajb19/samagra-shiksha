/**
 * Zod Validation Schemas
 * 
 * Form validation schemas for the mobile app.
 */

import { z } from 'zod';

/**
 * Trims leading and trailing whitespace before validation runs,
 * preventing form errors caused by accidental spaces.
 */
const trimmedString = z.string().transform(v => v.trim());

/**
 * Gender options
 */
export const GenderEnum = z.enum(['MALE', 'FEMALE']);
export type Gender = z.infer<typeof GenderEnum>;

/**
 * Registration roles available for mobile app users.
 */
export const RegistrationRoleEnum = z.enum([
    'HEADMASTER',
    'TEACHER',
    'IE_RESOURCE_PERSON',
    'KGBV_WARDEN',
    'NSCBAV_WARDEN',
    'JUNIOR_ENGINEER',
]);
export type RegistrationRole = z.infer<typeof RegistrationRoleEnum>;

/**
 * Registration form schema
 */
export const RegisterSchema = z.object({
    profileImage: z.string().min(1, 'Please upload a profile photo'),
    gender: GenderEnum,
    fullName: trimmedString.pipe(z.string().min(2, 'Full name must be at least 2 characters')),
    email: trimmedString.pipe(z.string().email('Please enter a valid email address')),
    password: trimmedString.pipe(
        z.string()
            .min(8, 'Password must be at least 8 characters')
            .max(15, 'Password cannot exceed 15 characters')
    ),
    confirmPassword: trimmedString.pipe(z.string().min(1, 'Please confirm your password')),
    role: RegistrationRoleEnum,
    phone: trimmedString.pipe(
        z.string().refine(
            (val) => /^\+?[\d\s\-().]{7,20}$/.test(val) && val.replace(/\D/g, '').length >= 10 && val.replace(/\D/g, '').length <= 15,
            'Please enter a valid phone number (10-15 digits)'
        )
    ),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof RegisterSchema>;

/**
 * Login form schema
 */
export const LoginSchema = z.object({
    email: trimmedString.pipe(z.string().min(1, 'Please enter your email address').email('Please enter a valid email address')),
    password: trimmedString.pipe(z.string().min(8, 'Password must be 8-15 characters').max(15, 'Password must be 8-15 characters')),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

// ── Complete Profile Schemas ──────────────────────────────

/**
 * Teacher / Headmaster Complete Profile schema
 * Fields: districtId, schoolId, yearsOfExperience, responsibilities
 */
export const HMTeacherProfileSchema = z.object({
    districtId: z.string().min(1, 'Please select a district'),
    schoolId: z.string().min(1, 'Please select a school'),
    yearsOfExperience: z
        .string()
        .min(1, 'Please enter years of experience')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 60;
        }, 'Experience must be between 0 and 60'),
    responsibilities: z.array(z.string()),
});

export type HMTeacherProfileFormData = z.infer<typeof HMTeacherProfileSchema>;

/**
 * IE Resource Person Complete Profile schema
 * Fields: districtId, qualification, yearsOfExperience, rciNumber, ebrc
 */
export const IEResourcePersonProfileSchema = z.object({
    districtId: z.string().min(1, 'Please select a district'),
    qualification: z.string().min(1, 'Please enter your qualification'),
    yearsOfExperience: z
        .string()
        .min(1, 'Please enter years of experience')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 60;
        }, 'Experience must be between 0 and 60'),
    rciNumber: z.string().min(1, 'Please enter your RCI number'),
    ebrc: z.string().min(1, 'Please enter your EBRC'),
    dateOfJoining: z
        .string()
        .min(1, 'Please enter date of joining')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    aadhaarNumber: z.string().length(12, 'Aadhaar number must be 12 digits').regex(/^\d{12}$/, 'Aadhaar number must contain only digits'),
});

export type IEResourcePersonProfileFormData = z.infer<typeof IEResourcePersonProfileSchema>;

/**
 * KGBV Type enum
 */
export const KGBVTypeEnum = z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']);

/**
 * KGBV Warden Complete Profile schema
 */
export const KGBVProfileSchema = z.object({
    kgbvType: KGBVTypeEnum.refine((v) => v.length > 0, 'Please select KGBV Type'),
    kgbvLocation: z.string().min(1, 'Please enter KGBV location'),
    districtId: z.string().min(1, 'Please select a district'),
    dateOfJoining: z
        .string()
        .min(1, 'Please enter date of joining')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    qualification: z.string().min(1, 'Please enter your qualification'),
    yearsOfExperience: z
        .string()
        .min(1, 'Please enter years of experience')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 60;
        }, 'Experience must be between 0 and 60'),
    ebrc: z.string().min(1, 'Please enter EBRC'),
    aadhaarNumber: z.string().length(12, 'Aadhaar number must be 12 digits').regex(/^\d{12}$/, 'Aadhaar number must contain only digits'),
});

export type KGBVProfileFormData = z.infer<typeof KGBVProfileSchema>;

/**
 * NSCBAV Warden Complete Profile schema
 */
export const NSCBAVProfileSchema = z.object({
    hostelLocation: z.string().min(1, 'Please enter NSCBAV hostel location'),
    districtId: z.string().min(1, 'Please select a district'),
    dateOfJoining: z
        .string()
        .min(1, 'Please enter date of joining')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    qualification: z.string().min(1, 'Please enter your qualification'),
    yearsOfExperience: z
        .string()
        .min(1, 'Please enter years of experience')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 60;
        }, 'Experience must be between 0 and 60'),
    ebrc: z.string().min(1, 'Please enter EBRC'),
    aadhaarNumber: z.string().length(12, 'Aadhaar number must be 12 digits').regex(/^\d{12}$/, 'Aadhaar number must contain only digits'),
});

export type NSCBAVProfileFormData = z.infer<typeof NSCBAVProfileSchema>;

/**
 * Junior Engineer Complete Profile schema
 * Fields: districtId, yearsOfExperience, ebrc
 * Note: No responsibilities for Junior Engineers
 */
export const JuniorEngineerProfileSchema = z.object({
    districtId: z.string().min(1, 'Please select a district'),
    yearsOfExperience: z
        .string()
        .min(1, 'Please enter years of experience')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 60;
        }, 'Experience must be between 0 and 60'),
    ebrc: z.string().min(1, 'Please enter your EBRC'),
});

export type JuniorEngineerProfileFormData = z.infer<typeof JuniorEngineerProfileSchema>;

// ── Create Event Schema ──────────────────────────────────

/**
 * Activity options for events.
 */
export const EVENT_ACTIVITY_OPTIONS = [
    'SMC Meeting',
    'Block Level Community Training',
    'Teachers Training Program',
    'Parent-Teacher Meeting',
    'Annual Day Celebration',
    'Sports Day',
    'Science Exhibition',
    'Cultural Festival',
    'Workshop on NEP 2020',
    'Orientation Program',
    'Career Guidance Seminar',
    'Health Camp',
    'Other',
] as const;

/**
 * Create Event form schema (Headmaster only).
 * Fields: eventName, description, startDate, endDate, activity, venue, districtId, maleParticipants, femaleParticipants
 */
export const CreateEventSchema = z.object({
    eventName: z.string().min(1, 'Please enter event name'),
    description: z.string().min(1, 'Please enter event description'),
    startDate: z
        .string()
        .min(1, 'Please select starting date')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    endDate: z
        .string()
        .min(1, 'Please select ending date')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    activity: z.string().min(1, 'Please select an activity'),
    venue: z.string().min(1, 'Please enter venue / place'),
    districtId: z.string().min(1, 'Please select a district'),
    maleParticipants: z
        .string()
        .min(1, 'Please enter male participants')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    femaleParticipants: z
        .string()
        .min(1, 'Please enter female participants')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
});

export type CreateEventFormData = z.infer<typeof CreateEventSchema>;

// ── ICT Activity Form Schema ──────────────────────────────

/**
 * Smart TV location options
 */
export const SmartTvLocationEnum = z.enum(['Classrooms', 'Other Rooms']);

/**
 * ICT Activity Form — Page 1 (Equipment & Photos)
 */
export const ICTFormPage1Schema = z.object({
    haveSmartTvs: z.enum(['Yes', 'No'], { message: 'Please select whether Smart TVs are provided' }),
    haveUps: z.enum(['Yes', 'No'], { message: 'Please select whether UPS are provided' }),
    havePendrives: z.enum(['Yes', 'No'], { message: 'Please select whether e-Content Pendrives are provided' }),
    ictMaterialsWorking: z.enum(['Yes', 'No'], { message: 'Please select whether ICT materials are in working condition' }),
    smartTvsWallMounted: z.enum(['Yes', 'No'], { message: 'Please select whether Smart TVs are wall mounted' }),
    smartTvsLocation: z.enum(['Classrooms', 'Other Rooms'], { message: 'Please select where Smart TVs are installed' }),
    ictMaterialPhotos: z.array(z.string()).min(1, 'Please upload at least 1 photo of ICT materials').max(10, 'You can upload a maximum of 10 photos'),
});

export type ICTFormPage1Data = z.infer<typeof ICTFormPage1Schema>;

/**
 * ICT Activity Form — Page 2 (Smart Class & Logbook)
 *
 * Note: The 5 MB file-size limit for PDFs is enforced at the component
 * level (PdfUploadField) since Zod only receives the URI string after
 * the picker has already validated the size.
 */
export const ICTFormPage2Schema = z.object({
    smartClassInRoutine: z.enum(['Yes', 'No'], { message: 'Please select whether Smart Class is in school routine' }),
    schoolRoutinePdf: z.string({ message: 'Please upload school routine PDF' }).min(1, 'Please upload school routine PDF (max 5 MB)'),
    weeklySmartClassDays: z
        .string()
        .min(1, 'Please enter number of days')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0 && n <= 7;
        }, 'Must be between 0 and 7 days'),
    hasLogbook: z.enum(['Yes', 'No'], { message: 'Please select whether logbook is maintained' }),
    logbookPdf: z.string({ message: 'Please upload logbook PDF' }).min(1, 'Please upload logbook PDF (max 5 MB)'),
});

export type ICTFormPage2Data = z.infer<typeof ICTFormPage2Schema>;

/**
 * ICT Activity Form — Page 3 (Impact & Observations)
 */
export const ICTFormPage3Schema = z.object({
    studentsBenefited: z
        .string()
        .min(1, 'Please enter number of students benefited')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    smartTvsOtherPurposes: z.enum(['Yes', 'No'], { message: 'Please select whether Smart TVs are used for other purposes' }),
    isSmartClassBenefiting: z.enum(['Yes', 'No'], { message: 'Please select whether Smart Class is benefiting students' }),
    benefitComment: z.string().optional(),
    teacherImpact: z.string().min(1, 'Please describe the impact on students\' performance'),
    howProgramHelped: z.string().min(1, 'Please describe how the program helped teachers'),
    observations: z.string().min(1, 'Please describe the basic observations'),
});

export type ICTFormPage3Data = z.infer<typeof ICTFormPage3Schema>;

/**
 * Complete ICT Activity Form schema (all 3 pages combined).
 * Used for final submission validation.
 */
export const ICTFormSchema = ICTFormPage1Schema.extend(ICTFormPage2Schema.shape).extend(ICTFormPage3Schema.shape);

export type ICTFormData = z.infer<typeof ICTFormSchema>;

// ── Library Activity Form Schema ──────────────────────────────

/**
 * Library Activity Form — Single page form.
 *
 * Fields based on the official Library inspection checklist:
 * availability, infrastructure, management, reading culture,
 * ICT in library, Samagra Shiksha support, feedback, and photos.
 */
export const LibraryFormSchema = z.object({
    // Library availability & condition
    isLibraryAvailable: z.enum(['Yes', 'No'], { message: 'Please select whether library is available' }),
    isChildFriendly: z.enum(['Yes', 'No'], { message: 'Please select whether library is child friendly' }),
    hasProperFurniture: z.enum(['Yes', 'No'], { message: 'Please select whether library has proper furniture' }),
    hasManagementCommittee: z.enum(['Yes', 'No'], { message: 'Please select whether management committee is constituted' }),

    // Teacher in-charge
    libraryTeacherName: z.string().min(1, 'Please enter Library Teacher In-charge name'),

    // Reading corner
    hasReadingCorner: z.enum(['Yes', 'No'], { message: 'Please select whether school has reading corner' }),
    numberOfReadingCorners: z
        .string()
        .min(1, 'Please enter number of reading corners')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),

    // Computers in library
    numberOfComputers: z
        .string()
        .min(1, 'Please enter number of functional computers')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),

    // Readers club & library period
    hasReadersClub: z.enum(['Yes', 'No'], { message: 'Please select whether school has readers club' }),
    hasWeeklyLibraryPeriod: z.enum(['Yes', 'No'], { message: 'Please select whether classes have library period' }),
    libraryPeriodsPerWeek: z
        .string()
        .min(1, 'Please enter number of library periods')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),

    // Samagra Shiksha support
    receivedBooksFromSamagra: z.enum(['Yes', 'No'], { message: 'Please select whether books were received' }),
    numberOfBooksReceived: z
        .string()
        .min(1, 'Please enter number of books received')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),

    // Initiatives & feedback
    innovativeInitiative: z.string().min(1, 'Please describe the innovative initiative'),
    suggestionsFeedback: z.string().optional(),

    // Photos
    studentPhotos: z.array(z.string()).min(1, 'Please upload at least 1 photo of students utilising library books').max(10, 'Maximum 10 photos allowed'),
    logbookPhotos: z.array(z.string()).min(1, 'Please upload at least 1 photo of Library Logbook').max(10, 'Maximum 10 photos allowed'),
});

export type LibraryFormData = z.infer<typeof LibraryFormSchema>;

// ── Science Lab Activity Form Schema ──────────────────────────────

/**
 * Science Lab Activity Form — Single page form.
 *
 * Fields based on the screenshots:
 * - Kit teacher in-charge name
 * - Number of experiments per week
 * - Photos of students using kits
 * - Photos of logbook maintained for kits
 */
export const ScienceLabFormSchema = z.object({
    kitTeacherName: z.string().min(1, 'Please enter Kit Teacher In-charge name'),
    experimentsPerWeek: z
        .string()
        .min(1, 'Please enter number of experiments per week')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    studentPhotos: z.array(z.string()).min(1, 'Please upload at least 1 photo of students using kits').max(10, 'Maximum 10 photos allowed'),
    logbookPhotos: z.array(z.string()).min(1, 'Please upload at least 1 photo of Logbook').max(10, 'Maximum 10 photos allowed'),
});

export type ScienceLabFormData = z.infer<typeof ScienceLabFormSchema>;

// ── Self Defense Activity Form Schema ──────────────────────────────

/**
 * Self Defense Activity Form — Single page form.
 *
 * Fields based on the screenshots:
 * - Photo (selfie/proof photo)
 * - Number of classes in a week
 * - Number of classes in a month
 * - Number of girl participants
 * - Number of girls benefited
 * - Instructor's name
 * - Contact number
 */
export const SelfDefenseFormSchema = z.object({
    photo: z.string().min(1, 'Please upload a photo'),
    classesPerWeek: z
        .string()
        .min(1, 'Please enter number of classes per week')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    classesPerMonth: z
        .string()
        .min(1, 'Please enter number of classes per month')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    girlParticipants: z
        .string()
        .min(1, 'Please enter number of girl participants')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    girlsBenefited: z
        .string()
        .min(1, 'Please enter number of girls benefited')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    instructorName: z.string().min(1, 'Please enter Instructor\'s name'),
    contactNumber: z.string().min(1, 'Please enter contact number').refine(
        (v) => /^\d{10}$/.test(v.replace(/\s/g, '')),
        'Please enter a valid 10-digit contact number',
    ),
});

export type SelfDefenseFormData = z.infer<typeof SelfDefenseFormSchema>;

// ── KGBV Warden Activity Form Schema ──────────────────────────────

/**
 * KGBV activity options for the Activities dropdown.
 */
export const KGBV_ACTIVITY_OPTIONS = [
    'Vocational Classes / Life Skills',
    'Self Defence',
    'Screening of the Film Komul',
    'Medical Camp',
    'Remedial Classes',
    'Awareness on Mental Health',
    'Community Services',
    'Display of Vocational / Lifeskills Products',
    'Sports Week',
    'Awareness on Menstrual Health and Hygiene',
    'Cultural Day - Folk Songs, Dances, Indigenous Food Preparation',
    'Parents Teachers Meet',
    'Awareness on Cyber Bullying',
    'Remedial Classes for Class 10 / 11 / 12',
    'Career Guidance for Class 10 / 12',
    'Orientation to New Hostellers',
    'Awareness on Etiquettes',
    'Screening of the Film Tare Zameen Par',
    'Literary Competitions',
    'Documentation of Best Practices',
] as const;

/**
 * KGBV Warden Activity Form — Single page form.
 *
 * Fields:
 * - Photo (proof image)
 * - Activities (dropdown)
 * - Number of girl participants
 * - Number of girls benefited
 * - Materials used (text area)
 * - Instructor's name
 * - Contact number
 * - Best practices (text area)
 * - Success story (text area)
 */
export const KGBVFormSchema = z.object({
    photo: z.string().min(1, 'Please upload a photo'),
    activity: z.string().min(1, 'Please select an activity'),
    girlParticipants: z
        .string()
        .min(1, 'Please enter number of girl participants')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    girlsBenefited: z
        .string()
        .min(1, 'Please enter number of girls benefited')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    materialsUsed: z.string().min(1, 'Please enter materials used'),
    instructorName: z.string().min(1, 'Please enter Instructor\'s name'),
    contactNumber: z.string().min(1, 'Please enter contact number').refine(
        (v) => /^\d{10}$/.test(v.replace(/\s/g, '')),
        'Please enter a valid 10-digit contact number',
    ),
    bestPractices: z.string().min(1, 'Please enter best practices'),
    successStory: z.string().optional(),
});

export type KGBVFormData = z.infer<typeof KGBVFormSchema>;

// ── NSCBAV Warden Activity Form Schema ──────────────────────────────

/**
 * NSCBAV Warden Activity Form — Single page form.
 *
 * Fields:
 * - Photo (proof image)
 * - Number of girl participants
 * - Number of girls benefited
 * - Materials used (text area)
 * - Instructor's name
 * - Contact number
 * - Best practices (text area)
 * - Success story (text area)
 */
export const NSCBAVFormSchema = z.object({
    photo: z.string().min(1, 'Please upload a photo'),
    girlParticipants: z
        .string()
        .min(1, 'Please enter number of girl participants')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    girlsBenefited: z
        .string()
        .min(1, 'Please enter number of girls benefited')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 0;
        }, 'Must be a valid number'),
    materialsUsed: z.string().min(1, 'Please enter materials used'),
    instructorName: z.string().min(1, 'Please enter Instructor\'s name'),
    contactNumber: z.string().min(1, 'Please enter contact number').refine(
        (v) => /^\d{10}$/.test(v.replace(/\s/g, '')),
        'Please enter a valid 10-digit contact number',
    ),
    bestPractices: z.string().min(1, 'Please enter best practices'),
    successStory: z.string().optional(),
});

export type NSCBAVFormData = z.infer<typeof NSCBAVFormSchema>;

// ── IE School Visit Form Schema ──────────────────────────────

/**
 * IE School Visit Form — Single page form.
 *
 * Fields based on the screenshots:
 * - Name of CwSN
 * - Type of Disability
 * - District (dropdown)
 * - School (dropdown, filtered by district)
 * - Gender (radio)
 * - Age
 * - Activities / Topics covered
 * - Type of Therapy (optional)
 * - Explain Activities / Therapy (in brief)
 * - Expected Outcome (for the child)
 * - Was the desired goal for the child achieved? (radio Yes/No)
 * - Geo-tagged Photos (at least 1 image)
 */
export const IESchoolVisitFormSchema = z.object({
    nameOfCwSN: z.string().min(1, 'Please enter name of CwSN'),
    typeOfDisability: z.string().min(1, 'Please enter type of disability'),
    districtId: z.string().min(1, 'Please select a district'),
    schoolId: z.string().min(1, 'Please select a school'),
    gender: GenderEnum,
    age: z
        .string()
        .min(1, 'Please enter age')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 1 && n <= 100;
        }, 'Age must be between 1 and 100'),
    activitiesTopics: z.string().min(1, 'Please enter activities / topics covered'),
    therapyType: z.string().optional(),
    therapyBrief: z.string().min(1, 'Please explain activities / therapy'),
    expectedOutcome: z.string().min(1, 'Please enter expected outcome'),
    wasGoalAchieved: z.enum(['Yes', 'No'], { message: 'Please select whether the goal was achieved' }),
    geoTaggedPhotos: z.array(z.string()).min(1, 'Please upload at least 1 geo-tagged photo').max(10, 'Maximum 10 photos allowed'),
});

export type IESchoolVisitFormData = z.infer<typeof IESchoolVisitFormSchema>;

// ── IE Home Visit Form Schema ──────────────────────────────

/**
 * IE Home Visit Form — Single page form.
 *
 * Similar to School Visit but without School/District fields.
 * Fields:
 * - Name of CwSN
 * - Type of Disability
 * - Gender (radio)
 * - Age
 * - Activities / Topics covered
 * - Type of Therapy (optional)
 * - Explain Activities / Therapy (in brief)
 * - Expected Outcome (for the child)
 * - Was the desired goal for the child achieved? (radio Yes/No)
 * - Geo-tagged Photos (at least 1 image)
 */
export const IEHomeVisitFormSchema = z.object({
    nameOfCwSN: z.string().min(1, 'Please enter name of CwSN'),
    typeOfDisability: z.string().min(1, 'Please enter type of disability'),
    gender: GenderEnum,
    age: z
        .string()
        .min(1, 'Please enter age')
        .refine((v) => {
            const n = parseInt(v, 10);
            return !isNaN(n) && n >= 1 && n <= 100;
        }, 'Age must be between 1 and 100'),
    activitiesTopics: z.string().min(1, 'Please enter activities / topics covered'),
    therapyType: z.string().optional(),
    therapyBrief: z.string().min(1, 'Please explain activities / therapy'),
    expectedOutcome: z.string().min(1, 'Please enter expected outcome'),
    wasGoalAchieved: z.enum(['Yes', 'No'], { message: 'Please select whether the goal was achieved' }),
    geoTaggedPhotos: z.array(z.string()).min(1, 'Please upload at least 1 geo-tagged photo').max(10, 'Maximum 10 photos allowed'),
});

export type IEHomeVisitFormData = z.infer<typeof IEHomeVisitFormSchema>;

// ── Project Status Update Schema ──────────────────────────────

/**
 * Completion status options for project updates.
 * Values start from 10 and increment by 10 up to 100.
 */
export const PROJECT_COMPLETION_OPTIONS = [
    '10', '20', '30', '40', '50', '60', '70', '80', '90', '100',
] as const;

/**
 * Project Status Update form schema.
 * Used by Junior Engineers to submit progress updates on assigned projects.
 *
 * Fields:
 * - completionStatus: percentage of project completion (10%-100%)
 * - comment: optional comment about the update
 * - photos: at least 1 photo of project status (max 10)
 */
export const ProjectStatusUpdateSchema = z.object({
    completionStatus: z.string().min(1, 'Please select project completion status'),
    comment: z.string().optional(),
    photos: z.array(z.string()).min(1, 'Please upload at least 1 photo of project status').max(10, 'Maximum 10 photos allowed'),
});

export type ProjectStatusUpdateFormData = z.infer<typeof ProjectStatusUpdateSchema>;
