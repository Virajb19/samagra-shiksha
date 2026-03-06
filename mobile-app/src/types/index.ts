/**
 * Type Definitions
 * 
 * These types MUST match the backend API contracts exactly.
 * Any deviation could cause security issues.
 */

/**
 * User roles as defined in backend.
 */
export type UserRole =
    | 'SUPER_ADMIN'
    | 'ADMIN'
    | 'HEADMASTER'
    | 'TEACHER'
    | 'IE_RESOURCE_PERSON'
    | 'KGBV_WARDEN'
    | 'NSCBAV_WARDEN'
    | 'JUNIOR_ENGINEER';

/**
 * Gender enum.
 */
export type Gender = 'MALE' | 'FEMALE';

/**
 * Faculty type.
 */
export type FacultyType = 'TEACHING' | 'NON_TEACHING';



/**
 * District object.
 */
export interface District {
    id: string;
    name: string;
    state: string;
}

/**
 * School object.
 */
export interface School {
    id: string;
    name: string;
    registration_code: string;
    district_id: string;
}

/**
 * Faculty profile.
 */
export interface Faculty {
    id: string;
    user_id: string;
    school_id: string;
    faculty_type: FacultyType;
    designation: string;

    years_of_experience: number;
    is_profile_locked: boolean;
    school?: School;
}

/**
 * KGBV type enum.
 */
export type KGBVType = 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4';

/**
 * Responsibility options for HM/Teacher/JE.
 */
export const RESPONSIBILITY_OPTIONS = [
    'Civil Works',
    'Self Defence',
    'Sanitary Vending Machine & Incinerator',
    'Library',
    'Science Lab',
    'ICT',
    'Vocational Education',
] as const;

/**
 * User object returned from login.
 */
export interface User {
    id: string;
    name: string;
    email?: string;
    phone: string;
    role: UserRole;
    gender?: Gender;
    profile_image_url?: string;
    is_active: boolean;
    has_completed_profile?: boolean;

    faculty?: Faculty;

    // Role-specific fields (stored on Firestore user doc)
    district_id?: string;                // KGBV, NSCBAV, JE (also used by HM/Teacher via faculty)
    responsibilities?: string[];         // HM, TEACHER, JE
    kgbv_type?: KGBVType;               // KGBV_WARDEN
    residential_location?: string;       // KGBV_WARDEN, NSCBAV_WARDEN
    ebrc?: string;                       // KGBV_WARDEN, NSCBAV_WARDEN, IE_RESOURCE_PERSON
    qualification?: string;              // NSCBAV_WARDEN, IE_RESOURCE_PERSON
    rci_number?: string;                 // IE_RESOURCE_PERSON
    years_of_experience?: number;        // KGBV, NSCBAV, JE, IE_RESOURCE_PERSON
    date_of_joining?: string;            // KGBV_WARDEN, NSCBAV_WARDEN, IE_RESOURCE_PERSON
    aadhaar_number?: string;             // KGBV_WARDEN, NSCBAV_WARDEN, IE_RESOURCE_PERSON
}

/**
 * Login request payload.
 * Sent to POST /auth/login
 */
export interface LoginRequest {
    email?: string;
    password?: string;
}

/**
 * Login response from backend.
 * Backend returns snake_case.
 */
export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: User;
}

/**
 * Task status as defined in backend.
 * PENDING: Task created but not started
 * IN_PROGRESS: Delivery has begun (PICKUP event received)
 * COMPLETED: Delivery finished successfully (FINAL event received)
 * SUSPICIOUS: Delivery flagged due to time window violation
 */
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPICIOUS';

/**
 * Task event type.
 * Follows strict progression: PICKUP → TRANSIT → FINAL
 */
// Updated EventType - 5-Step Tracking for Exam Papers
export type EventType =
    | 'PICKUP_POLICE_STATION'    // Step 1: Pickup from Police Station
    | 'ARRIVAL_EXAM_CENTER'      // Step 2: Arrival at Exam Center
    | 'OPENING_SEAL'             // Step 3: Opening Seal
    | 'SEALING_ANSWER_SHEETS'    // Step 4: Sealing Answer Sheets
    | 'SUBMISSION_POST_OFFICE';  // Step 5: Submission at Post Office

/**
 * Task object from backend.
 * Matches backend Task entity structure.
 */
export interface Task {
    id: string;
    sealed_pack_code: string;
    source_location: string;
    destination_location: string;
    assigned_user_id: string;
    start_time: string;
    end_time: string;
    status: TaskStatus;
    created_at: string;
    // Double shift fields
    is_double_shift?: boolean;
    shift_type?: 'MORNING' | 'AFTERNOON';
    expected_travel_time?: number;
    // Geo-fence coordinates for attendance
    pickup_latitude?: number;
    pickup_longitude?: number;
    destination_latitude?: number;
    destination_longitude?: number;
    geofence_radius?: number;
}

/**
 * Attendance record from backend.
 */
export interface Attendance {
    id: string;
    task_id: string;
    user_id: string;
    location_type: 'PICKUP' | 'DESTINATION';
    is_within_geofence: boolean;
    distance_from_target?: string;
    timestamp: string;
}

/**
 * Task event object from backend.
 * Represents an immutable evidence record.
 */
export interface TaskEvent {
    id: string;
    task_id: string;
    event_type: EventType;
    image_url: string;
    image_hash: string;
    latitude: number;
    longitude: number;
    server_timestamp: string;
    created_at: string;
}

/**
 * Create event request payload.
 * Sent as multipart/form-data.
 */
export interface CreateEventRequest {
    event_type: EventType;
    latitude: number;
    longitude: number;
}

/**
 * API Error response structure.
 */
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
    errorCode?: string;
}

/**
 * Auth context state.
 */
export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
