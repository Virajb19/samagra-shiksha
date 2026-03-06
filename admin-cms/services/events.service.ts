'use client';

import axios from 'axios';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

// ── Axios instance (same config as the old api.ts) ──────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Types ────────────────────────────────────────────────────────────────────

export type SchoolEventType =
  | 'MEETING'
  | 'EXAM'
  | 'HOLIDAY'
  | 'SEMINAR'
  | 'WORKSHOP'
  | 'SPORTS'
  | 'CULTURAL'
  | 'OTHER';

export interface EventFilterParams {
  from_date?: string;
  to_date?: string;
  district_id?: string;
  event_type?: SchoolEventType;
  search?: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  event_type: SchoolEventType;
  event_date: string;
  event_end_date?: string;
  event_time?: string;
  location?: string;
  activity_type?: string;
  male_participants?: number;
  female_participants?: number;
  district_id?: string;
  school_id?: string;
  invited_user_ids?: string[];
}

export interface EventWithStats {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  location: string | null;
  event_type: SchoolEventType;
  activity_type: string | null;
  flyer_url: string | null;
  male_participants: number | null;
  female_participants: number | null;
  is_active: boolean;
  created_at: string;
  creator: { id: string; name: string } | null;
  school: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  invitation_stats: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
}

export interface EventInvitation {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  rejection_reason: string | null;
  responded_at: string | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: string;
  };
}

export interface EventDetails extends EventWithStats {
  invitations: EventInvitation[];
}

export interface InvitableUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  faculty: {
    school: {
      id: string;
      name: string;
      district: { id: string; name: string } | null;
    } | null;
  } | null;
}

export interface EventsResponse {
  data: EventWithStats[];
  total: number;
  hasMore: boolean;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const eventsApi = {
  getAll: async (filters?: EventFilterParams, limit = 20, offset = 0): Promise<EventsResponse> => {
    const params: Record<string, string> = {};
    if (filters?.from_date) params.from_date = filters.from_date;
    if (filters?.to_date) params.to_date = filters.to_date;
    if (filters?.district_id) params.district_id = filters.district_id;
    if (filters?.event_type) params.event_type = filters.event_type;
    if (filters?.search) params.search = filters.search;
    params.limit = limit.toString();
    params.offset = offset.toString();
    const response = await api.get<EventsResponse>('/admin/events', { params });
    return response.data;
  },

  getById: async (eventId: string): Promise<EventDetails> => {
    const response = await api.get<EventDetails>(`/admin/events/${eventId}`);
    return response.data;
  },

  create: async (data: CreateEventPayload, flyer?: File): Promise<EventDetails> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('event_type', data.event_type);
    formData.append('event_date', data.event_date);
    if (data.description) formData.append('description', data.description);
    if (data.event_time) formData.append('event_time', data.event_time);
    if (data.location) formData.append('location', data.location);
    if (data.district_id) formData.append('district_id', data.district_id);
    if (data.school_id) formData.append('school_id', data.school_id);
    if (data.invited_user_ids && data.invited_user_ids.length > 0) {
      formData.append('invited_user_ids', JSON.stringify(data.invited_user_ids));
    }
    if (flyer) formData.append('flyer', flyer);
    const response = await api.post<EventDetails>('/admin/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (eventId: string, data: Partial<CreateEventPayload>, flyer?: File): Promise<EventDetails> => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.event_type) formData.append('event_type', data.event_type);
    if (data.event_date) formData.append('event_date', data.event_date);
    if (data.description !== undefined) formData.append('description', data.description || '');
    if (data.event_time !== undefined) formData.append('event_time', data.event_time || '');
    if (data.location !== undefined) formData.append('location', data.location || '');
    if (flyer) formData.append('flyer', flyer);
    const response = await api.patch<EventDetails>(`/admin/events/${eventId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (eventId: string): Promise<void> => {
    await api.delete(`/admin/events/${eventId}`);
  },

  inviteUsers: async (
    eventId: string,
    userIds: string[]
  ): Promise<{ invited_count: number; already_invited_count: number }> => {
    const response = await api.post(`/admin/events/${eventId}/invite`, { user_ids: userIds });
    return response.data;
  },

  getInvitableUsers: async (filters?: {
    role?: string;
    district_id?: string;
    school_id?: string;
    exclude_event_id?: string;
  }): Promise<InvitableUser[]> => {
    const response = await api.get<InvitableUser[]>('/admin/events/invitable-users', { params: filters });
    return response.data;
  },
};

// ── React Query hooks ──────────────────────────────────────────────────────────

export const useGetEvents = (filters?: EventFilterParams, limit = 20, offset = 0) => {
  return useQuery<EventsResponse>({
    queryKey: ['events', filters, limit, offset],
    queryFn: () => eventsApi.getAll(filters, limit, offset),
    refetchOnMount: 'always',
  });
};

export const useGetEventsInfinite = (filters?: EventFilterParams, pageSize = 20) => {
  return useInfiniteQuery<EventsResponse>({
    queryKey: ['events-infinite', filters],
    queryFn: ({ pageParam = 0 }) => eventsApi.getAll(filters, pageSize, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    refetchOnMount: 'always',
  });
};

export const useGetEventById = (eventId?: string) => {
  return useQuery<EventDetails>({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId!),
    enabled: !!eventId,
  });
};

export const useGetInvitableUsers = (filters?: {
  role?: string;
  district_id?: string;
  school_id?: string;
  exclude_event_id?: string;
}) => {
  return useQuery<InvitableUser[]>({
    queryKey: ['invitable-users', filters],
    queryFn: () => eventsApi.getInvitableUsers(filters),
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, flyer }: { data: CreateEventPayload; flyer?: File }) =>
      eventsApi.create(data, flyer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      data,
      flyer,
    }: {
      eventId: string;
      data: Partial<CreateEventPayload>;
      flyer?: File;
    }) => eventsApi.update(eventId, data, flyer),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['delete-event'],
    mutationFn: async (eventId: string) => eventsApi.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events-infinite'], exact: false });
    },
    onError: (error: any) => {
      throw new Error(error?.response?.data?.message || 'Failed to delete event');
    },
  });
};

export const useInviteUsersToEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, userIds }: { eventId: string; userIds: string[] }) =>
      eventsApi.inviteUsers(eventId, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
};
