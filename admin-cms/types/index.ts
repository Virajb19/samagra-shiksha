// Type definitions for Secure Tracking Admin CMS
// Aligned with backend entities

// ========================================
// ENUMS
// ========================================

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    HEADMASTER = 'HEADMASTER',
    TEACHER = 'TEACHER',
    IE_RESOURCE_PERSON = 'IE_RESOURCE_PERSON',
    KGBV_WARDEN = 'KGBV_WARDEN',
    NSCBAV_WARDEN = 'NSCBAV_WARDEN',
    JUNIOR_ENGINEER = 'JUNIOR_ENGINEER',
}

export enum FacultyType {
    TEACHING = 'TEACHING',
    NON_TEACHING = 'NON_TEACHING',
}



export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
}

// ========================================
// ENTITIES
// ========================================

export enum KGBVType {
    TYPE_I = 'TYPE_I',
    TYPE_II = 'TYPE_II',
    TYPE_III = 'TYPE_III',
    TYPE_IV = 'TYPE_IV',
}

export interface User {
    id: string;
    name: string;
    email?: string;
    phone: string;
    role: UserRole;
    gender?: Gender;
    profile_image_url?: string;
    is_active: boolean;

    created_at: string;
    coordinator_subject?: string;
    coordinator_class_group?: string;
    faculty?: Faculty;

    // Role-specific fields
    district_id?: string;                // KGBV_WARDEN, NSCBAV_WARDEN, JUNIOR_ENGINEER
    responsibilities?: string[];         // HEADMASTER, TEACHER, JUNIOR_ENGINEER
    kgbv_type?: KGBVType;               // KGBV_WARDEN
    residential_location?: string;       // KGBV_WARDEN, NSCBAV_WARDEN
    ebrc?: string;                       // KGBV_WARDEN, NSCBAV_WARDEN, IE_RESOURCE_PERSON
    qualification?: string;              // NSCBAV_WARDEN, IE_RESOURCE_PERSON
    rci_number?: string;                 // IE_RESOURCE_PERSON
    years_of_experience?: number;        // KGBV_WARDEN, NSCBAV_WARDEN, JUNIOR_ENGINEER, IE_RESOURCE_PERSON
    date_of_joining?: string;            // KGBV_WARDEN, NSCBAV_WARDEN
    aadhaar_number?: string;             // KGBV_WARDEN, NSCBAV_WARDEN
    has_completed_profile?: boolean;
}

export interface District {
    id: string;
    name: string;
    state: string;
    created_at: string;
}

export interface School {
    id: string;
    name: string;
    registration_code: string;
    district_id: string;
    district?: District;
    created_at: string;
}

export interface Faculty {
    id: string;
    user_id: string;
    school_id: string;
    faculty_type: FacultyType;
    designation: string;

    years_of_experience: number;
    is_profile_locked: boolean;
    created_at: string;
    updated_at: string;
    school?: School;
}

export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    ip_address: string | null;
    created_at: string;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface LoginResponse {
    access_token: string;
    user: Partial<User> & { role: UserRole };
}

export interface AuthState {
    token: string | null;
    role: UserRole | null;
    isAuthenticated: boolean;
    loading: boolean;
}

// ========================================
// CIRCULAR TYPES
// ========================================

export type CircularVisibilityLevel = 'GLOBAL' | 'DISTRICT' | 'SCHOOL';

export interface Circular {
    id: string;
    circular_no: string;
    title: string;
    description?: string;
    file_url?: string;
    issued_by: string;
    issued_date: string;
    effective_date?: string;
    is_active: boolean;
    visibility_level: CircularVisibilityLevel;
    district_id?: string;
    school_id?: string;
    school_ids?: string[];
    target_roles?: string[];
    target_subject?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    district?: { name: string };
    school?: { name: string };
    creator?: { name: string };
}

export interface CreateCircularDto {
    title: string;
    description?: string;
    issued_by: string;
    issued_date: string;
    effective_date?: string;
    district_id?: string;
    school_ids?: string[]; // Support multiple schools
    recipient_type?: 'ALL' | 'TEACHER' | 'HEADMASTER'; // Recipient filtering
    target_subject?: string; // When recipient_type is TEACHER, optionally filter by subject
}

// ========================================
// SUBJECT TYPES
// ========================================

export interface Subject {
    id: string;
    name: string;
    class_level: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ========================================
// HELPDESK TYPES
// ========================================

export interface HelpdeskTicket {
    id: string;
    user_id: string;
    full_name: string;
    phone: string;
    message: string;
    is_resolved: boolean;
    created_at: string;
    user?: {
        name: string;
        phone: string;
        email?: string;
        role: UserRole;
    };
}

// ========================================
// PROJECT MANAGEMENT TYPES
// ========================================

export type ProjectSchoolCategory =
    | 'Elementary'
    | 'Secondary'
    | 'Higher Secondary'
    | 'PM Shri'
    | 'NSCBAV'
    | 'DA JGUA'
    | 'KGBV-IV';

export type ProjectActivity =
    | 'New Government Primary School'
    | 'Construction of New Building'
    | 'Boys Toilet'
    | 'Girls Toilet'
    | 'Boys Toilet (Rejuvenation)'
    | 'Girls Toilet (Rejuvenation)'
    | 'Additional Classroom'
    | 'Augmentation of EBRC'
    | 'Boundary Wall'
    | 'Boundary Wall (Rejuvenation)'
    | 'Dilapidated Classrooms (Primary)'
    | 'Dilapidated Classroom (Upper Primary)'
    | 'Drinking Water Facility'
    | 'Electrification'
    | 'Electrification (Rejuvenation)'
    | 'Major Repair'
    | 'Major Repair (Rejuvenation)'
    | 'Rain Water Harvesting'
    | 'Upgradation of School (6-8)'
    | 'Dilapidated Building (Primary)'
    | 'Dilapidated Building (Upper Primary)'
    | 'Hostel'
    | 'ICT Lab'
    | 'Vocational Lab'
    | 'Library Room'
    | 'Science Lab';

export type PABYear =
    | '2023 - 2024'
    | '2024 - 2025'
    | '2025 - 2026'
    | '2026 - 2027';

export interface ProjectSchool {
    id: string;
    name: string;
    category: ProjectSchoolCategory;
    district_id: string;
    district_name: string;
    udise_code: string;
    ebrc: string;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    project_school_id: string;
    school_name: string;
    district_name: string;
    udise_code: string;
    pab_year: PABYear;
    category: ProjectSchoolCategory;
    activity: ProjectActivity;
    contractor?: string;
    // Editable fields
    status: 'Not Started' | 'In Progress' | 'Completed';
    physical: number;
    approved: number;
    civil_cost: number;
    contingency: number;
    april: number;
    may: number;
    june: number;
    july: number;
    august: number;
    september: number;
    october: number;
    november: number;
    december: number;
    january: number;
    february: number;
    march: number;
    balance: number;
    remarks: string;
    // Updated by Junior Engineer from mobile app
    progress: number;
    photos: string[];
    created_at: string;
    updated_at: string;
}

export interface ProjectUpdate {
    id: string;
    project_id: string;
    user_id: string;
    user_name: string;
    completion_status: number;
    comment?: string | null;
    photos: string[];
    location_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    created_at: string;
}

// ========================================
// ACTIVITY FORM TYPES
// ========================================

export type ActivityFormType =
    | 'ICT' | 'Library' | 'Science Lab' | 'Self Defence'
    | 'Vocational Education' | 'KGBV' | 'NSCBAV';

export interface ActivityForm {
    id: string;
    name: ActivityFormType;
    status: 'Active' | 'Inactive' | 'Closed';
    starting_date?: string | null;
    ending_date?: string | null;
    created_at: string;
    updated_at: string;
}

