import { useQuery, useQueryClient, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { noticeFirestore } from './firebase/notice.firestore';
import { getFirebaseAuth } from '@/lib/firebase';

// NoticeType enum values match the backend Prisma enum
export type NoticeType = 'GENERAL' | 'INVITATION' | 'PUSH_NOTIFICATION';

// Display labels for the enum values
export const noticeTypeLabels: Record<NoticeType, string> = {
  'GENERAL': 'General',
  'INVITATION': 'Invitation',
  'PUSH_NOTIFICATION': 'Push Notification',
};

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: NoticeType;
  subject: string | null;
  venue: string | null;
  event_time: string | null;
  event_date: string | null;
  published_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_targeted: boolean;
  school_id: string | null;
  created_by: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  school?: {
    id: string;
    name: string;
    district?: {
      id: string;
      name: string;
    };
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    recipients: number;
  };
  recipients?: Array<{
    user: {
      id: string;
      name: string;
      email: string | null;
      phone: string;
      role: string;
    };
    is_read: boolean;
    read_at: string | null;
  }>;
}

export interface CreateNoticePayload {
  title: string;
  content: string;
  type?: NoticeType;
  subject?: string;
  venue?: string;
  event_time?: string;
  event_date?: string;
  expires_at?: string;
  school_id?: string;
  created_by?: string;
  file_url?: string;
  file_name?: string;
}

export interface UpdateNoticePayload {
  title?: string;
  content?: string;
  type?: NoticeType;
  subject?: string;
  venue?: string;
  event_time?: string;
  event_date?: string;
  expires_at?: string;
  is_active?: boolean;
  school_id?: string;
  file_url?: string;
  file_name?: string;
}

export interface NoticesFilters {
  type?: string;
  school_id?: string;
  search?: string;
}

// ── Helper: get current admin ID from Firebase Auth ──
export function getAdminId(): string {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// React Query Hooks
export const NOTICES_QUERY_KEY = 'notices';

export interface NoticesResponse {
  data: Notice[];
  total: number;
  hasMore: boolean;
}

export interface CursorNoticesResponse {
  data: Notice[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export function useGetNotices(filters?: NoticesFilters, limit = 50, offset = 0) {
  return useQuery({
    queryKey: [NOTICES_QUERY_KEY, filters, limit, offset],
    queryFn: () => noticeFirestore.getAll(filters, limit, null),
  });
}

export function useGetNoticesInfinite(filters?: NoticesFilters, pageSize = 50) {
  return useInfiniteQuery<NoticesResponse>({
    queryKey: [NOTICES_QUERY_KEY, 'infinite', filters],
    queryFn: ({ pageParam = 0 }) => noticeFirestore.getAll(filters, pageSize, null),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    maxPages: 5,
    placeholderData: prev => prev
  });
}

export function useGetNoticesCursorInfinite(filters?: NoticesFilters, pageSize = 50) {
  return useInfiniteQuery<CursorNoticesResponse>({
    queryKey: [NOTICES_QUERY_KEY, 'cursor', filters],
    queryFn: ({ pageParam }) => noticeFirestore.getAllCursor(filters, pageSize, pageParam as string | undefined),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
    initialPageParam: undefined as string | undefined,
  });
}

export function useGetNoticeById(id: string) {
  return useQuery({
    queryKey: [NOTICES_QUERY_KEY, id],
    queryFn: () => noticeFirestore.getById(id),
    enabled: !!id,
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticeFirestore.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTICES_QUERY_KEY] });
    },
  });
}

export function useToggleNoticeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticeFirestore.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTICES_QUERY_KEY] });
    },
  });
}
