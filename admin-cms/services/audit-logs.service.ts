/**
 * Audit Logs — React Query Hooks (Client-Side)
 *
 * Provides `useQuery` and `useInfiniteQuery` hooks for fetching audit logs
 * from Firestore. Uses the data access layer in `firebase/audit-logs.firestore.ts`.
 *
 * Usage:
 *   import { useGetAuditLogs, useGetRecentAuditLogs } from '@/services/audit-logs.service';
 *   const { data, isLoading } = useGetRecentAuditLogs(10);
 */

"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  auditLogsFirestore,
  AuditLogsResponse,
  CursorAuditLogsResponse,
} from "./firebase/audit-logs.firestore";

// ────────────────────── Query Keys ──────────────────────

/** Centralized query keys for cache management and invalidation */
export const auditLogKeys = {
  all: ["auditLogs"] as const,
  list: (limit: number, offset: number) => ["auditLogs", "list", { limit, offset }] as const,
  recent: (count: number) => ["auditLogs", "recent", count] as const,
  byAction: (action: string) => ["auditLogs", "byAction", action] as const,
  infinite: (pageSize: number) => ["auditLogs", "infinite", pageSize] as const,
};

// ────────────────────── Hooks ──────────────────────

/**
 * Fetch paginated audit logs.
 *
 * @param limit  Number of logs per page (default: 100)
 * @param offset Offset for pagination (default: 0)
 */
export const useGetAuditLogs = (limit = 100, offset = 0) => {
  return useQuery({
    queryKey: auditLogKeys.list(limit, offset),
    queryFn: () => auditLogsFirestore.getAll(limit, offset),
  });
};

/**
 * Fetch the N most recent audit logs.
 * Optimized for dashboard feeds — no pagination overhead.
 *
 * @param count Number of recent logs (default: 10)
 */
export const useGetRecentAuditLogs = (count = 10) => {
  return useQuery({
    queryKey: auditLogKeys.recent(count),
    queryFn: () => auditLogsFirestore.getRecent(count),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
};

/**
 * Fetch audit logs filtered by action type.
 *
 * @param action Action type to filter by
 * @param limit  Max results
 */
export const useGetAuditLogsByAction = (action: string, limit = 50) => {
  return useQuery({
    queryKey: auditLogKeys.byAction(action),
    queryFn: () => auditLogsFirestore.getByAction(action, limit),
    enabled: !!action, // Don't fetch if action is empty
  });
};

/**
 * Infinite scrolling for audit logs (offset-based — legacy).
 * Each page fetches `pageSize` logs using offset-based pagination.
 *
 * @param pageSize Number of logs per page (default: 50)
 */
export const useGetAuditLogsInfinite = (pageSize = 50) => {
  return useInfiniteQuery<AuditLogsResponse>({
    queryKey: auditLogKeys.infinite(pageSize),
    queryFn: ({ pageParam = 0 }) =>
      auditLogsFirestore.getAll(pageSize, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
  });
};

/**
 * Cursor-based infinite scrolling for audit logs (Firestore).
 * Uses compound cursor (timestamp + docId) for efficient pagination.
 *
 * @param pageSize Number of logs per page (default: 50)
 */
export const useGetAuditLogsCursorInfinite = (pageSize = 50) => {
  return useInfiniteQuery<CursorAuditLogsResponse>({
    queryKey: ['auditLogs', 'cursor', pageSize],
    queryFn: ({ pageParam }) =>
      auditLogsFirestore.getAllCursor(pageSize, pageParam as string | undefined),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
    initialPageParam: undefined as string | undefined,
  });
};
