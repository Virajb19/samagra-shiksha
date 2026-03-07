import { z } from "zod";

// Firestore auto-generated doc IDs are NOT UUIDs — accept any non-empty string
const uuid = z.string().min(1);
const isoDateTime = z.iso.datetime();
const bool = z.boolean();

const FirestoreTimestampLike = z.union([
  z.date(),
  z.object({ seconds: z.number(), nanoseconds: z.number() }),
]);

const dateTimeLike = z.union([isoDateTime, FirestoreTimestampLike]);
const decimalLike = z.union([z.number(), z.string()]);

export const UserRoleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "HEADMASTER",
  "TEACHER",
  "IE_RESOURCE_PERSON",
  "KGBV_WARDEN",
  "NSCBAV_WARDEN",
  "JUNIOR_ENGINEER",
]);

export const FacultyTypeSchema = z.enum(["TEACHING", "NON_TEACHING"]);
export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const InvitationStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);
export const GenderSchema = z.enum(["MALE", "FEMALE"]);
export const NoticeTypeSchema = z.enum(["GENERAL", "INVITATION", "PUSH_NOTIFICATION"]);
export const SchoolEventTypeSchema = z.enum(["MEETING", "EXAM", "HOLIDAY", "SEMINAR", "WORKSHOP", "SPORTS", "CULTURAL", "OTHER"]);
export const ExamTrackerEventTypeSchema = z.enum([
  "TREASURY_ARRIVAL",
  "CUSTODIAN_HANDOVER",
  "OPENING_MORNING",
  "PACKING_MORNING",
  "DELIVERY_MORNING",
  "OPENING_AFTERNOON",
  "PACKING_AFTERNOON",
  "DELIVERY_AFTERNOON",
]);
export const SubjectCategorySchema = z.enum(["CORE", "VOCATIONAL"]);
export const ExamClassSchema = z.enum(["CLASS_10", "CLASS_12"]);

export const KGBVTypeSchema = z.enum(["TYPE_I", "TYPE_II", "TYPE_III", "TYPE_IV"]);

export const UserDocSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  email: z.email().nullable().optional(),
  password: z.string().min(1),
  phone: z.string().min(1),
  role: UserRoleSchema.default("TEACHER"),
  gender: GenderSchema.nullable().optional(),
  profile_image_url: z.string().nullable().optional(),
  is_active: bool.default(true),
  push_token: z.string().nullable().optional(),
  coordinator_subject: z.string().nullable().optional(),
  coordinator_class_group: z.string().nullable().optional(),

  created_at: dateTimeLike,

  // ── Role-specific optional fields ──

  // Direct district link (KGBV_WARDEN, NSCBAV_WARDEN, JUNIOR_ENGINEER)
  district_id: uuid.nullable().optional(),

  // Responsibilities list (HEADMASTER, TEACHER, JUNIOR_ENGINEER)
  responsibilities: z.array(z.string()).nullable().optional(),

  // KGBV Warden fields
  kgbv_type: KGBVTypeSchema.nullable().optional(),

  // KGBV & NSCBAV Warden & IE Resource Person fields
  residential_location: z.string().nullable().optional(),
  ebrc: z.string().nullable().optional(),

  // NSCBAV Warden & IE Resource Person fields
  qualification: z.string().nullable().optional(),

  // IE Resource Person fields
  rci_number: z.string().nullable().optional(),

  // Experience for roles without faculty records (KGBV, NSCBAV, JE, IE)
  years_of_experience: z.number().int().nullable().optional(),

  // Date of joining (KGBV_WARDEN, NSCBAV_WARDEN, IE_RESOURCE_PERSON)
  date_of_joining: dateTimeLike.nullable().optional(),

  // Aadhaar number (KGBV_WARDEN, NSCBAV_WARDEN, IE_RESOURCE_PERSON)
  aadhaar_number: z.string().nullable().optional(),

  // Profile completion flag
  has_completed_profile: bool.default(false),
});

export const AuditLogDocSchema = z.object({
  id: uuid,
  user_id: uuid.nullable().optional(),
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: uuid.nullable().optional(),
  ip_address: z.string().nullable().optional(),
  created_at: dateTimeLike,
});

export const DistrictDocSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  state: z.string().min(1),
  created_at: dateTimeLike,
});

export const SchoolDocSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  registration_code: z.string().min(1),
  district_id: uuid,
  created_at: dateTimeLike,
});

export const FacultyDocSchema = z.object({
  id: uuid,
  user_id: uuid,
  school_id: uuid,
  faculty_type: FacultyTypeSchema,
  designation: z.string().min(1),
  years_of_experience: z.number().int().nullable().optional(),
  is_profile_locked: bool.default(false),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

export const EventDocSchema = z.object({
  id: uuid,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  event_date: dateTimeLike,
  event_end_date: dateTimeLike.nullable().optional(),
  event_time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  event_type: SchoolEventTypeSchema.default("OTHER"),
  activity_type: z.string().nullable().optional(),
  flyer_url: z.string().nullable().optional(),
  male_participants: z.number().int().nullable().optional(),
  female_participants: z.number().int().nullable().optional(),
  is_active: bool.default(true),
  school_id: uuid.nullable().optional(),
  district_id: uuid.nullable().optional(),
  created_by: uuid.nullable().optional(),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

export const EventInvitationDocSchema = z.object({
  id: uuid,
  event_id: uuid,
  user_id: uuid,
  status: InvitationStatusSchema.default("PENDING"),
  rejection_reason: z.string().nullable().optional(),
  responded_at: dateTimeLike.nullable().optional(),
  created_at: dateTimeLike,
});

export const NoticeDocSchema = z.object({
  id: uuid,
  title: z.string().min(1),
  content: z.string().min(1),
  type: NoticeTypeSchema.default("GENERAL"),
  subject: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  event_time: z.string().nullable().optional(),
  event_date: dateTimeLike.nullable().optional(),
  published_at: dateTimeLike,
  expires_at: dateTimeLike.nullable().optional(),
  is_active: bool.default(true),
  is_targeted: bool.default(false),
  school_id: uuid.nullable().optional(),
  created_by: uuid.nullable().optional(),
  file_url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

export const NoticeRecipientDocSchema = z.object({
  id: uuid,
  notice_id: uuid,
  user_id: uuid,
  is_read: bool.default(false),
  read_at: dateTimeLike.nullable().optional(),
});

export const CircularDocSchema = z.object({
  id: uuid,
  circular_no: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  issued_by: z.string().min(1),
  issued_date: dateTimeLike,
  effective_date: dateTimeLike.nullable().optional(),
  is_active: bool.default(true),
  district_id: uuid.nullable().optional(),
  school_id: uuid.nullable().optional(),
  created_by: uuid.nullable().optional(),
  target_subject: z.string().nullable().optional(),
  target_role: z.string().nullable().optional(),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

export const CircularSchoolDocSchema = z.object({
  circular_id: uuid,
  school_id: uuid,
  created_at: dateTimeLike,
});

export const HelpdeskDocSchema = z.object({
  id: uuid,
  user_id: uuid,
  full_name: z.string().min(1),
  phone: z.string().min(1),
  message: z.string().min(1),
  is_resolved: bool.default(false),
  created_at: dateTimeLike,
});

export const NotificationLogDocSchema = z.object({
  id: uuid,
  user_id: uuid,
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.string().nullable().optional(),
  is_read: bool.default(false),
  created_at: dateTimeLike,
});

export const UserStarDocSchema = z.object({
  id: uuid,
  admin_id: uuid,
  starred_user_id: uuid,
  created_at: dateTimeLike,
});

export const SubjectDocSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  class_level: z.number().int(),
  is_active: bool.default(true),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

export const FacultyAttendanceDocSchema = z.object({
  id: uuid,
  user_id: uuid,
  image_url: z.string().min(1),
  image_hash: z.string().min(1),
  latitude: decimalLike,
  longitude: decimalLike,
  date: dateTimeLike,
  created_at: dateTimeLike,
});

// ── Project Management ──

export const ProjectSchoolCategorySchema = z.enum([
  "Elementary",
  "Secondary",
  "Higher Secondary",
  "PM Shri",
  "NSCBAV",
  "DA JGUA",
  "KGBV-IV",
]);

export const ProjectActivitySchema = z.enum([
  "New Government Primary School",
  "Construction of New Building",
  "Boys Toilet",
  "Girls Toilet",
  "Boys Toilet (Rejuvenation)",
  "Girls Toilet (Rejuvenation)",
  "Additional Classroom",
  "Augmentation of EBRC",
  "Boundary Wall",
  "Boundary Wall (Rejuvenation)",
  "Dilapidated Classrooms (Primary)",
  "Dilapidated Classroom (Upper Primary)",
  "Drinking Water Facility",
  "Electrification",
  "Electrification (Rejuvenation)",
  "Major Repair",
  "Major Repair (Rejuvenation)",
  "Rain Water Harvesting",
  "Upgradation of School (6-8)",
  "Dilapidated Building (Primary)",
  "Dilapidated Building (Upper Primary)",
  "Hostel",
  "ICT Lab",
  "Vocational Lab",
  "Library Room",
  "Science Lab",
]);

export const PABYearSchema = z.enum([
  "2023 - 2024",
  "2024 - 2025",
  "2025 - 2026",
  "2026 - 2027",
]);

export const ProjectSchoolDocSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  category: ProjectSchoolCategorySchema,
  district_id: uuid,
  district_name: z.string().min(1),
  udise_code: z.string().min(1),
  ebrc: z.string().min(1),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

export const ProjectStatusSchema = z.enum(["Not Started", "In Progress", "Completed"]);

export const ProjectDocSchema = z.object({
  id: uuid,
  project_school_id: uuid,
  school_name: z.string().min(1),
  district_name: z.string().min(1),
  udise_code: z.string().min(1),
  pab_year: PABYearSchema,
  category: ProjectSchoolCategorySchema,
  activity: ProjectActivitySchema,
  contractor: z.string().nullable().optional(),
  // Editable fields
  status: ProjectStatusSchema.default("Not Started"),
  physical: z.number().default(0),
  approved: z.number().default(0),
  civil_cost: z.number().default(0),
  contingency: z.number().default(0),
  april: z.number().default(0),
  may: z.number().default(0),
  june: z.number().default(0),
  july: z.number().default(0),
  august: z.number().default(0),
  september: z.number().default(0),
  october: z.number().default(0),
  november: z.number().default(0),
  december: z.number().default(0),
  january: z.number().default(0),
  february: z.number().default(0),
  march: z.number().default(0),
  balance: z.number().default(0),
  remarks: z.string().nullable().optional(),
  // Updated by Junior Engineer from mobile app
  progress: z.number().min(0).max(100).default(0),
  photos: z.array(z.string()).default([]),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

// ── Activity Forms ──

export const ActivityFormTypeSchema = z.enum([
  "ICT", "Library", "Science Lab", "Self Defence",
  "Vocational Education", "KGBV", "NSCBAV",
]);

/** Stored in Firestore as admin-set value */
export const ActivityFormStatusSchema = z.enum(["Open", "Closed"]);

/** Computed at read time from the date window */
export const ActivityFormEffectiveStatusSchema = z.enum(["Active", "Inactive", "Closed"]);

export const ActivityFormDocSchema = z.object({
  id: uuid,
  name: ActivityFormTypeSchema,
  /**
   * Admin-set status. The **effective** status is computed at read time:
   * a form is active only when status === "Open" AND today falls between
   * `starting_date` and `ending_date` (inclusive).
   */
  status: ActivityFormStatusSchema.default("Closed"),
  starting_date: dateTimeLike.nullable().optional(),
  ending_date: dateTimeLike.nullable().optional(),
  created_at: dateTimeLike,
  updated_at: dateTimeLike,
});

// ── ICT Form Data (submitted from mobile app) ──

export const ICTFormDataDocSchema = z.object({
  id: uuid,
  // School info
  school_id: uuid,
  school_name: z.string().min(1),
  district: z.string().min(1),
  udise: z.string().min(1),
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  submitted_by_role: z.string().min(1),
  // Page 1 — Equipment & Photos
  have_smart_tvs: z.string(),
  have_ups: z.string(),
  have_pendrives: z.string(),
  ict_materials_working: z.string(),
  smart_tvs_wall_mounted: z.string(),
  smart_tvs_location: z.string(),
  photos_of_materials: z.array(z.string()),
  // Page 2 — Smart Class & Logbook
  smart_class_in_routine: z.string(),
  school_routine: z.string(),
  weekly_smart_class: z.string(),
  has_logbook: z.string(),
  logbook: z.string(),
  // Page 3 — Impact & Observations
  students_benefited: z.string(),
  smart_tvs_other_purposes: z.string(),
  is_smart_class_benefiting: z.string(),
  benefit_comment: z.string().nullable().optional(),
  noticed_impact: z.string(),
  how_program_helped: z.string(),
  observations: z.string(),
  // Metadata
  created_at: dateTimeLike,
});

// ── Library Form Data (submitted from mobile app) ──

export const LibraryFormDataDocSchema = z.object({
  id: uuid,
  // School info
  school_id: uuid,
  school_name: z.string().min(1),
  district: z.string().min(1),
  udise: z.string().min(1),
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  submitted_by_role: z.string().min(1),
  // Library fields
  is_library_available: z.string(),
  is_child_friendly: z.string(),
  has_proper_furniture: z.string(),
  has_management_committee: z.string(),
  library_teacher_name: z.string(),
  has_reading_corner: z.string(),
  number_of_reading_corners: z.string(),
  number_of_computers: z.string(),
  has_readers_club: z.string(),
  has_weekly_library_period: z.string(),
  library_periods_per_week: z.string(),
  received_books_from_samagra: z.string(),
  number_of_books_received: z.string(),
  innovative_initiative: z.string(),
  suggestions_feedback: z.string().nullable().optional(),
  student_photos: z.array(z.string()),
  logbook_photos: z.array(z.string()),
  // Metadata
  created_at: dateTimeLike,
});

// ── Science Lab Form Data (submitted from mobile app) ──

export const ScienceLabFormDataDocSchema = z.object({
  id: uuid,
  // School info
  school_id: uuid,
  school_name: z.string().min(1),
  district: z.string().min(1),
  udise: z.string().min(1),
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  submitted_by_role: z.string().min(1),
  // Science Lab fields
  kit_teacher_name: z.string(),
  experiments_per_week: z.string(),
  student_photos: z.array(z.string()),
  logbook_photos: z.array(z.string()),
  // Metadata
  created_at: dateTimeLike,
});

// ── Self Defense Form Data (submitted from mobile app) ──

export const SelfDefenseFormDataDocSchema = z.object({
  id: uuid,
  // School info
  school_id: uuid,
  school_name: z.string().min(1),
  district: z.string().min(1),
  udise: z.string().min(1),
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  submitted_by_role: z.string().min(1),
  // Self Defense fields
  photo: z.string(),
  classes_per_week: z.string(),
  classes_per_month: z.string(),
  girl_participants: z.string(),
  girls_benefited: z.string(),
  instructor_name: z.string(),
  contact_number: z.string(),
  // Metadata
  created_at: dateTimeLike,
});

// ── KGBV Form Data (submitted by KGBV wardens from mobile app) ──

export const KGBVFormDataDocSchema = z.object({
  id: uuid,
  // Warden info
  ebrc: z.string().min(1),
  district: z.string().min(1),
  kgbv_type: z.string().min(1),
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  submitted_by_role: z.string().min(1),
  // Form fields
  photo: z.string(),
  activity: z.string().min(1),
  girl_participants: z.string(),
  girls_benefited: z.string(),
  materials_used: z.string(),
  instructor_name: z.string(),
  contact_number: z.string(),
  best_practices: z.string(),
  success_story: z.string().nullable().optional(),
  // Metadata
  created_at: dateTimeLike,
});

// ── NSCBAV Form Data (submitted by NSCBAV wardens from mobile app) ──

export const NSCBAVFormDataDocSchema = z.object({
  id: uuid,
  // Warden info
  ebrc: z.string().min(1),
  district: z.string().min(1),
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  submitted_by_role: z.string().min(1),
  // Form fields
  photo: z.string(),
  girl_participants: z.string(),
  girls_benefited: z.string(),
  materials_used: z.string(),
  instructor_name: z.string(),
  contact_number: z.string(),
  best_practices: z.string(),
  success_story: z.string().nullable().optional(),
  // Metadata
  created_at: dateTimeLike,
});

// ── IE School Visit Data (submitted by IE Resource Persons from mobile app) ──

export const IESchoolVisitDataDocSchema = z.object({
  id: uuid,
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  rci_number: z.string().min(1),
  ebrc: z.string().min(1),
  district: z.string().min(1),
  district_id: uuid,
  school: z.string().min(1),
  school_id: uuid,
  name_of_cwsn: z.string().min(1),
  type_of_disability: z.string().min(1),
  gender: GenderSchema,
  age: z.number().int(),
  activities_topics: z.string().min(1),
  therapy_type: z.string().nullable().optional(),
  therapy_brief: z.string().min(1),
  expected_outcome: z.string().min(1),
  was_goal_achieved: z.enum(["Yes", "No"]),
  photos: z.array(z.string()),
  created_at: dateTimeLike,
});

// ── IE Home Visit Data (submitted by IE Resource Persons from mobile app) ──

export const IEHomeVisitDataDocSchema = z.object({
  id: uuid,
  submitted_by: uuid,
  submitted_by_name: z.string().min(1),
  rci_number: z.string().min(1),
  ebrc: z.string().min(1),
  district: z.string().min(1),
  name_of_cwsn: z.string().min(1),
  type_of_disability: z.string().min(1),
  gender: GenderSchema,
  age: z.number().int(),
  activities_topics: z.string().min(1),
  therapy_type: z.string().nullable().optional(),
  therapy_brief: z.string().min(1),
  expected_outcome: z.string().min(1),
  was_goal_achieved: z.enum(["Yes", "No"]),
  photos: z.array(z.string()),
  created_at: dateTimeLike,
});

export const CollectionSchemas = {
  users: UserDocSchema,
  audit_logs: AuditLogDocSchema,
  districts: DistrictDocSchema,
  schools: SchoolDocSchema,
  faculties: FacultyDocSchema,
  events: EventDocSchema,
  event_invitations: EventInvitationDocSchema,
  notices: NoticeDocSchema,
  notice_recipients: NoticeRecipientDocSchema,
  circulars: CircularDocSchema,
  circular_schools: CircularSchoolDocSchema,
  helpdesk_tickets: HelpdeskDocSchema,
  notification_logs: NotificationLogDocSchema,
  user_stars: UserStarDocSchema,
  subjects: SubjectDocSchema,
  faculty_attendances: FacultyAttendanceDocSchema,
  project_schools: ProjectSchoolDocSchema,
  projects: ProjectDocSchema,
  activity_forms: ActivityFormDocSchema,
  ict_form_data: ICTFormDataDocSchema,
  library_form_data: LibraryFormDataDocSchema,
  science_lab_form_data: ScienceLabFormDataDocSchema,
  self_defense_form_data: SelfDefenseFormDataDocSchema,
  kgbv_form_data: KGBVFormDataDocSchema,
  nscbav_form_data: NSCBAVFormDataDocSchema,
  ie_school_visit_data: IESchoolVisitDataDocSchema,
  ie_home_visit_data: IEHomeVisitDataDocSchema,
} as const;

type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

type RelationDef = {
  from: keyof typeof CollectionSchemas;
  to: keyof typeof CollectionSchemas;
  type: RelationType;
  foreignKey: string;
  note?: string;
};

export const Relations: RelationDef[] = [
  { from: "users", to: "districts", type: "one-to-many", foreignKey: "district_id", note: "DirectDistrict (KGBV/NSCBAV/JE)" },
  { from: "schools", to: "districts", type: "one-to-many", foreignKey: "district_id" },
  { from: "faculties", to: "users", type: "one-to-one", foreignKey: "user_id" },
  { from: "faculties", to: "schools", type: "one-to-many", foreignKey: "school_id" },
  { from: "events", to: "schools", type: "one-to-many", foreignKey: "school_id" },
  { from: "events", to: "districts", type: "one-to-many", foreignKey: "district_id" },
  { from: "events", to: "users", type: "one-to-many", foreignKey: "created_by", note: "EventCreator" },
  { from: "event_invitations", to: "events", type: "one-to-many", foreignKey: "event_id" },
  { from: "event_invitations", to: "users", type: "one-to-many", foreignKey: "user_id" },
  { from: "notices", to: "schools", type: "one-to-many", foreignKey: "school_id" },
  { from: "notices", to: "users", type: "one-to-many", foreignKey: "created_by", note: "NoticeCreator" },
  { from: "notice_recipients", to: "notices", type: "one-to-many", foreignKey: "notice_id" },
  { from: "notice_recipients", to: "users", type: "one-to-many", foreignKey: "user_id" },
  { from: "circulars", to: "districts", type: "one-to-many", foreignKey: "district_id" },
  { from: "circulars", to: "schools", type: "one-to-many", foreignKey: "school_id" },
  { from: "circulars", to: "users", type: "one-to-many", foreignKey: "created_by", note: "CircularCreator" },
  { from: "circular_schools", to: "circulars", type: "many-to-many", foreignKey: "circular_id" },
  { from: "circular_schools", to: "schools", type: "many-to-many", foreignKey: "school_id" },
  { from: "helpdesk_tickets", to: "users", type: "one-to-many", foreignKey: "user_id" },
  { from: "notification_logs", to: "users", type: "one-to-many", foreignKey: "user_id" },
  { from: "user_stars", to: "users", type: "many-to-many", foreignKey: "admin_id", note: "StarringAdmin" },
  { from: "user_stars", to: "users", type: "many-to-many", foreignKey: "starred_user_id", note: "StarredUser" },
  { from: "faculty_attendances", to: "users", type: "one-to-many", foreignKey: "user_id" },
  { from: "project_schools", to: "districts", type: "one-to-many", foreignKey: "district_id" },
  { from: "projects", to: "project_schools", type: "one-to-many", foreignKey: "project_school_id" },
  { from: "ict_form_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "library_form_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "science_lab_form_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "self_defense_form_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "kgbv_form_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "nscbav_form_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "ie_school_visit_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
  { from: "ie_school_visit_data", to: "schools", type: "one-to-many", foreignKey: "school_id" },
  { from: "ie_school_visit_data", to: "districts", type: "one-to-many", foreignKey: "district_id" },
  { from: "ie_home_visit_data", to: "users", type: "one-to-many", foreignKey: "submitted_by" },
];

export function parseDoc<K extends keyof typeof CollectionSchemas>(
  collection: K,
  value: unknown,
) {
  return CollectionSchemas[collection].parse(value);
}
