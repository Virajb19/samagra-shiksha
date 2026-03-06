'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { circularFirestore, CircularsResponse } from './firebase/circular.firestore';
import type { Circular, District, School } from '@/types';
import { masterDataFirestore } from './firebase/master-data.firestore';

/* =========================
   Circular Queries
========================= */

// Get all circulars (with pagination)
export const useGetCirculars = (limit = 20, cursor: string | null = null, search?: string) => {
  return useQuery<CircularsResponse>({
    queryKey: ['circulars', limit, cursor, search],
    queryFn: () => circularFirestore.getAll(limit, cursor, search),
  });
};

// Get single circular by ID
export const useGetCircularById = (circularId?: string) => {
  return useQuery<Circular | null>({
    queryKey: ['circular', circularId],
    queryFn: () => circularFirestore.getById(circularId!),
    enabled: !!circularId,
  });
};

/* =========================
   Create / Mutate Circulars
========================= */

export interface CircularFormValues {
  title: string;
  description?: string;
  issued_by: string;
  issued_date: string;
  effective_date?: string | null;
  school_id?: string | 'all';
}

export const useCreateCircular = (selectedFile?: File | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CircularFormValues) => {
      const payload = {
        title: data.title,
        description: data.description,
        issued_by: data.issued_by,
        issued_date: data.issued_date,
        effective_date: data.effective_date || undefined,
        school_id: data.school_id !== 'all' ? data.school_id : undefined,
      };

      // TODO: pass real userId from auth context
      return circularFirestore.create('admin', payload, selectedFile || undefined);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulars'] });
    },
  });
};

/* =========================
   Master Data (Shared)
========================= */

// Districts
export const useGetDistricts = () => {
  return useQuery<District[]>({
    queryKey: ['districts'],
    queryFn: masterDataFirestore.getDistricts,
  });
};

// Schools (optionally filtered by district)
export const useGetSchools = (districtId?: string) => {
  return useQuery<School[]>({
    queryKey: ['schools', districtId],
    queryFn: () => masterDataFirestore.getSchools(districtId),
    enabled: !!districtId && districtId !== 'all',
  });
};
