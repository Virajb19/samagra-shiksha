'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  projectManagementFirestore,
  ProjectSchoolsResponse,
  ProjectsResponse,
} from './firebase/project-management.firestore';
import type {
  ProjectSchool,
  Project,
  ProjectSchoolCategory,
  ProjectActivity,
  PABYear,
} from '@/types';
import { masterDataFirestore } from './firebase/master-data.firestore';
import type { District } from '@/types';
import { showErrorToast, showSuccessToast } from '@/components/ui/custom-toast';

/* =========================
   Project Schools Queries
========================= */

export const useGetProjectSchools = (
  limit = 20,
  cursor: string | null = null,
  districtFilter?: string,
  categoryFilter?: string,
) => {
  return useQuery<ProjectSchoolsResponse>({
    queryKey: ['project-schools', limit, cursor, districtFilter, categoryFilter],
    queryFn: () =>
      projectManagementFirestore.getProjectSchools(limit, cursor, districtFilter, categoryFilter),
  });
};

export const useGetAllProjectSchools = () => {
  return useQuery<ProjectSchool[]>({
    queryKey: ['project-schools-all'],
    queryFn: () => projectManagementFirestore.getAllProjectSchools(),
  });
};

export const useCreateProjectSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      category: ProjectSchoolCategory;
      district_id: string;
      district_name: string;
      udise_code: string;
      ebrc: string;
    }) => {
      return projectManagementFirestore.createProjectSchool(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schools'] });
      queryClient.invalidateQueries({ queryKey: ['project-schools-all'] });
    },
  });
};

export const useDeleteProjectSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schoolId: string) =>
      projectManagementFirestore.deleteProjectSchool(schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-schools'] });
      queryClient.invalidateQueries({ queryKey: ['project-schools-all'] });
    },
  });
};

/* =========================
   Projects Queries
========================= */

export const useGetProjects = (
  limit = 20,
  cursor: string | null = null,
  pabYearFilter?: string,
  activityFilter?: string,
  districtFilter?: string,
  categoryFilter?: string,
  statusFilter?: string,
) => {
  return useQuery<ProjectsResponse>({
    queryKey: ['projects', limit, cursor, pabYearFilter, activityFilter, districtFilter, categoryFilter, statusFilter],
    queryFn: () =>
      projectManagementFirestore.getProjects(limit, cursor, pabYearFilter, activityFilter, districtFilter, categoryFilter, statusFilter),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_school_id: string;
      school_name: string;
      district_name: string;
      udise_code: string;
      pab_year: PABYear;
      category: ProjectSchoolCategory;
      activity: ProjectActivity;
      contractor?: string;
    }) => {
      return projectManagementFirestore.createProject(input);
    },
    onSuccess: () => {
      showSuccessToast('Project created successfully'); // Show success toast on project creation
    },
    onError: (error: any) => {
      console.error('Error creating project:', error);
      showErrorToast('Failed to create project. Please try again.'); // Show error toast on failure
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      projectManagementFirestore.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, updates }: {
      projectId: string;
      updates: Partial<{
        status: string;
        physical: number;
        approved: number;
        civil_cost: number;
        contingency: number;
        april: number; may: number; june: number; july: number;
        august: number; september: number; october: number; november: number;
        december: number; january: number; february: number; march: number;
        balance: number;
        remarks: string;
        contractor: string;
      }>;
    }) => projectManagementFirestore.updateProject(projectId, updates),
    onSuccess: () => {
      // Toast is handled by handleSubmitAll for batch updates
    },
    onError: (error: any) => {
      console.error('Error updating project:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

/* =========================
   Cumulative Data
========================= */

export const useGetCumulativeData = (
  pabYearFilter?: string,
  districtFilter?: string,
  categoryFilter?: string,
) => {
  return useQuery({
    queryKey: ['cumulative-data', pabYearFilter, districtFilter, categoryFilter],
    queryFn: () => projectManagementFirestore.getCumulativeData(pabYearFilter, districtFilter, categoryFilter),
    placeholderData: keepPreviousData,
  });
};

/* =========================
   Master Data (Shared)
========================= */

export const useGetDistricts = () => {
  return useQuery<District[]>({
    queryKey: ['districts'],
    queryFn: masterDataFirestore.getDistricts,
  });
};
