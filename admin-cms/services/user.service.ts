"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Subject } from "@/types";
import { firebaseAdminManageApi, firebaseMasterDataApi } from "@/services/firebase/master-data.firestore";
import { firebaseUsersAdminApi } from "@/services/firebase/users-admin.firestore";
import { PaginatedSchoolsResponse, UserFilterParams } from "@/services/contracts";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getFirebaseStorage, getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import { auditLogsFirestore } from "./firebase/audit-logs.firestore";

// Always use Firestore directly — no backend needed
const masterDataApi = firebaseMasterDataApi;
const adminManageApi = firebaseAdminManageApi;

// ========================================
// USERS API (Firebase — no backend)
// ========================================

export const usersApi = {
  getAll: firebaseUsersAdminApi.getAll,
  createUser: firebaseUsersAdminApi.createUser.bind(firebaseUsersAdminApi),
  toggleStatus: firebaseUsersAdminApi.toggleStatus.bind(firebaseUsersAdminApi),
  updateProfilePhoto: firebaseUsersAdminApi.updateProfilePhoto.bind(firebaseUsersAdminApi),
  updateUser: firebaseUsersAdminApi.updateUser.bind(firebaseUsersAdminApi),
};

export const useGetUsers = (filters?: UserFilterParams) => {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => usersApi.getAll(filters),
    placeholderData: keepPreviousData,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      email?: string;
      phone: string;
      password: string;
      role: string;
      gender?: string;
    }) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["coordinators"], exact: false });
    },
  });
}

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await usersApi.toggleStatus(userId, isActive);
      // Await invalidation so isPending stays true until fresh data arrives
      // await Promise.all([
      //   queryClient.invalidateQueries({ queryKey: ["users"], exact: false }),
      //   queryClient.invalidateQueries({ queryKey: ["coordinators"], exact: false }),
      // ]);
        queryClient.invalidateQueries({ queryKey: ["users"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["coordinators"], exact: false })
    },
  });
}


export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: {
      userId: string;
      data: {
        name?: string;
        email?: string;
        phone?: string;
        gender?: string;
        role?: string;
      };
    }) => usersApi.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["coordinators"], exact: false });
    },
  });
}

// ========================================
// PROFILE PHOTO UPLOAD (Firebase Storage)
// ========================================

/**
 * Upload a profile photo to Firebase Storage and update the user's Firestore doc.
 * Path: profile-photos/{userId}/{timestamp}.{ext}
 * Returns the public download URL.
 */
export async function uploadProfilePhoto(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Derive file extension from MIME type
  const ext = file.type === "image/png" ? "png" : "jpg";
  const storage = getFirebaseStorage();
  const userPhotosFolder = ref(storage, `profile-photos/${currentUser.uid}`);

  // Delete all previous profile photos from storage
  try {
    const existingFiles = await listAll(userPhotosFolder);
    await Promise.all(existingFiles.items.map((item) => deleteObject(item)));
  } catch {
    // Folder may not exist yet for first upload — ignore
  }

  const storagePath = `profile-photos/${currentUser.uid}/${Date.now()}.${ext}`;

  const storageRef = ref(getFirebaseStorage(), storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  // Wait for upload to complete, reporting progress along the way
  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      resolve
    );
  });

  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

  // Sync photo URL to Firebase Auth profile (persists across logout/login)
  await updateProfile(currentUser, { photoURL: downloadUrl });

  // Update Firestore user document with new photo URL
  const db = getFirebaseFirestore();
  const usersQuery = await getDocs(
    query(collection(db, "users"), where("email", "==", currentUser.email))
  );
  if (!usersQuery.empty) {
    const docRef = usersQuery.docs[0].ref;
    await updateDoc(docRef, { profile_image_url: downloadUrl });
  }

  // Audit log: profile photo updated
  await auditLogsFirestore.create({
    user_id: currentUser.uid,
    action: "PROFILE_PHOTO_UPDATED",
    entity_type: "User",
    entity_id: currentUser.uid,
  });

  return downloadUrl;
}

// ========================================
// DISTRICTS, SCHOOLS, SUBJECTS
// ========================================

export const useGetDistricts = () => {
  return useQuery({
    queryKey: ["districts"],
    queryFn: masterDataApi.getDistricts,
  });
}

export const useGetSchools = (districtId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["schools", districtId],
    queryFn: () => masterDataApi.getSchools(districtId),
    enabled,
  });
}

export const useGetSchoolsInfinite = (params: {
  pageSize?: number;
  districtId?: string;
  search?: string;
} = {}) => {
  const { pageSize = 50, districtId, search } = params;
  return useInfiniteQuery<PaginatedSchoolsResponse>({
    queryKey: ['schools-paginated', districtId, search],
    queryFn: ({ pageParam = 0 }) =>
      masterDataApi.getSchoolsPaginated({
        limit: pageSize,
        offset: pageParam as number,
        districtId,
        search: search || undefined,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    maxPages: 5,
  });
}

export const useGetClasses = () => {
  return useQuery({
    queryKey: ["classes"],
    queryFn: masterDataApi.getClasses,
  });
}

export const useGetSubjects = () => {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: () => masterDataApi.getSubjects(),
  });
}

// ========================================
// SUBJECTS DETAILED (for management page)
// ========================================

export const useGetSubjectsDetailed = (classLevel?: number) => {
  return useQuery({
    queryKey: ["subjects-detailed", classLevel],
    queryFn: () => masterDataApi.getSubjectsDetailed(classLevel),
  });
}

// ========================================
// SCHOOL MANAGEMENT HOOKS
// ========================================

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; registration_code: string; district_id: string }) =>
      adminManageApi.createSchool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["schools-paginated"], exact: false });
    },
  });
}

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; registration_code?: string; district_id?: string } }) =>
      adminManageApi.updateSchool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["schools-paginated"], exact: false });
    },
  });
}

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminManageApi.deleteSchool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["schools-paginated"], exact: false });
    },
  });
}

// ========================================
// SUBJECT MANAGEMENT HOOKS
// ========================================

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; class_level: number }) =>
      adminManageApi.createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}

export const useCreateSubjectBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; class_levels: number[] }) =>
      adminManageApi.createSubjectBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; class_level?: number; is_active?: boolean } }) =>
      adminManageApi.updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminManageApi.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["subjects-detailed"], exact: false });
    },
  });
}