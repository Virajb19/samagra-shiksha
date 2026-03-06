/**
 * Profile Completion Firestore Service
 *
 * Profile completion flows for all mobile-app roles:
 * HM/Teacher, KGBV Warden, NSCBAV Warden, IE Resource Person.
 */

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { User, KGBVType } from '../../types';
import { storeUserData } from '../../utils/storage';

const db = getFirebaseDb();

// ── HM / Teacher ──

/** Complete profile for Headmaster / Teacher. Creates a faculty doc + updates user. */
export async function completeHMTeacherProfile(params: {
    userId: string;
    schoolId: string;
    yearsOfExperience: number;
    responsibilities: string[];
    role: 'HEADMASTER' | 'TEACHER';
    currentUser: User;
}): Promise<User> {
    const { userId, schoolId, yearsOfExperience, responsibilities, role, currentUser } = params;

    const facultyRef = doc(collection(db, 'faculties'));
    await setDoc(facultyRef, {
        id: facultyRef.id,
        user_id: userId,
        school_id: schoolId,
        faculty_type: role === 'HEADMASTER' ? 'NON_TEACHING' : 'TEACHING',
        designation: role === 'HEADMASTER' ? 'Headmaster' : 'Teacher',

        years_of_experience: yearsOfExperience,
        is_profile_locked: false,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
    });

    await updateDoc(doc(db, 'users', userId), {
        responsibilities,
        has_completed_profile: true,
        updated_at: Timestamp.now(),
    });

    const updatedUser: User = { ...currentUser, responsibilities, has_completed_profile: true };
    await storeUserData(updatedUser);
    return updatedUser;
}

// ── KGBV Warden ──

/** Complete profile for KGBV Warden. */
export async function completeKGBVWardenProfile(params: {
    userId: string;
    kgbvType: KGBVType;
    residentialLocation: string;
    districtId: string;
    dateOfJoining: string;
    qualification: string;
    yearsOfExperience: number;
    ebrc: string;
    aadhaarNumber: string;
    currentUser: User;
}): Promise<User> {
    const { userId, kgbvType, residentialLocation, districtId, dateOfJoining, qualification, yearsOfExperience, ebrc, aadhaarNumber, currentUser } = params;
    await updateDoc(doc(db, 'users', userId), {
        kgbv_type: kgbvType,
        residential_location: residentialLocation,
        district_id: districtId,
        date_of_joining: Timestamp.fromDate(new Date(dateOfJoining)),
        qualification,
        years_of_experience: yearsOfExperience,
        ebrc,
        aadhaar_number: aadhaarNumber,
        has_completed_profile: true,
        updated_at: Timestamp.now(),
    });
    const updatedUser: User = {
        ...currentUser, kgbv_type: kgbvType, residential_location: residentialLocation,
        district_id: districtId, date_of_joining: dateOfJoining, qualification,
        years_of_experience: yearsOfExperience, ebrc, aadhaar_number: aadhaarNumber,
        has_completed_profile: true,
    };
    await storeUserData(updatedUser);
    return updatedUser;
}

// ── NSCBAV Warden ──

/** Complete profile for NSCBAV Warden. */
export async function completeNSCBAVWardenProfile(params: {
    userId: string;
    residentialLocation: string;
    districtId: string;
    dateOfJoining: string;
    qualification: string;
    yearsOfExperience: number;
    ebrc: string;
    aadhaarNumber: string;
    currentUser: User;
}): Promise<User> {
    const { userId, residentialLocation, districtId, dateOfJoining, qualification, yearsOfExperience, ebrc, aadhaarNumber, currentUser } = params;
    await updateDoc(doc(db, 'users', userId), {
        residential_location: residentialLocation,
        district_id: districtId,
        date_of_joining: Timestamp.fromDate(new Date(dateOfJoining)),
        qualification,
        years_of_experience: yearsOfExperience,
        ebrc,
        aadhaar_number: aadhaarNumber,
        has_completed_profile: true,
        updated_at: Timestamp.now(),
    });
    const updatedUser: User = {
        ...currentUser, residential_location: residentialLocation, district_id: districtId,
        date_of_joining: dateOfJoining, qualification, years_of_experience: yearsOfExperience,
        ebrc, aadhaar_number: aadhaarNumber, has_completed_profile: true,
    };
    await storeUserData(updatedUser);
    return updatedUser;
}

// ── IE Resource Person ──

/** Complete profile for IE Resource Person. */
export async function completeIEResourcePersonProfile(params: {
    userId: string;
    districtId: string;
    qualification: string;
    yearsOfExperience: number;
    rciNumber: string;
    ebrc: string;
    dateOfJoining: string;
    aadhaarNumber: string;
    currentUser: User;
}): Promise<User> {
    const { userId, districtId, qualification, yearsOfExperience, rciNumber, ebrc, dateOfJoining, aadhaarNumber, currentUser } = params;
    await updateDoc(doc(db, 'users', userId), {
        district_id: districtId,
        qualification,
        years_of_experience: yearsOfExperience,
        rci_number: rciNumber,
        ebrc,
        date_of_joining: Timestamp.fromDate(new Date(dateOfJoining)),
        aadhaar_number: aadhaarNumber,
        has_completed_profile: true,
        updated_at: Timestamp.now(),
    });
    const updatedUser: User = {
        ...currentUser,
        district_id: districtId,
        qualification,
        years_of_experience: yearsOfExperience,
        rci_number: rciNumber,
        ebrc,
        date_of_joining: dateOfJoining,
        aadhaar_number: aadhaarNumber,
        has_completed_profile: true,
    };
    await storeUserData(updatedUser);
    return updatedUser;
}
