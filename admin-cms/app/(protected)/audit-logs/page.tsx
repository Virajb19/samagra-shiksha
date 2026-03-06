'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Shield, Clock, User, Activity, Globe } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CursorAuditLogsResponse, auditLogsFirestore } from '@/services/firebase/audit-logs.firestore';
import { Badge } from '@/components/ui/badge';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { RetryButton } from '@/components/RetryButton';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: Math.min(i * 0.03, 0.3), duration: 0.3 }
  }),
  hover: {
    transition: { duration: 0.2 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 }
  }
};

// Action type colors - unique color for each action
const actionColors: Record<string, { bg: string; text: string }> = {
  // User actions
  'USER_LOGIN': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'USER_LOGOUT': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'USER_LOGIN_FAILED': { bg: 'bg-rose-600/20', text: 'text-rose-400' },
  'USER_CREATED': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'USER_UPDATED': { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  'USER_DELETED': { bg: 'bg-pink-600/20', text: 'text-pink-400' },
  'USER_ACTIVATED': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'USER_DEACTIVATED': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  // Password actions
  'PASSWORD_CHANGED': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'PASSWORD_RESET': { bg: 'bg-amber-600/20', text: 'text-amber-300' },
  // Task actions
  'TASK_CREATED': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'TASK_UPDATED': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'TASK_DELETED': { bg: 'bg-fuchsia-600/20', text: 'text-fuchsia-400' },
  'TASK_COMPLETED': { bg: 'bg-purple-600/20', text: 'text-purple-300' },
  // Event actions  
  'EVENT_CREATED': { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  'EVENT_UPDATED': { bg: 'bg-indigo-600/20', text: 'text-indigo-300' },
  'EVENT_DELETED': { bg: 'bg-indigo-700/20', text: 'text-indigo-300' },
  'EVENT_UPLOADED': { bg: 'bg-lime-500/20', text: 'text-lime-400' },
  // Notice actions
  'NOTICE_CREATED': { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  'NOTICE_UPDATED': { bg: 'bg-teal-600/20', text: 'text-teal-300' },
  'NOTICE_DELETED': { bg: 'bg-teal-700/20', text: 'text-teal-300' },
  // Circular actions
  'CIRCULAR_CREATED': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'CIRCULAR_UPDATED': { bg: 'bg-cyan-600/20', text: 'text-cyan-300' },
  'CIRCULAR_DELETED': { bg: 'bg-cyan-700/20', text: 'text-cyan-300' },
  // Form actions
  'FORM_SUBMITTED': { bg: 'bg-blue-400/20', text: 'text-blue-300' },
  'FORM_APPROVED': { bg: 'bg-green-400/20', text: 'text-green-300' },
  'FORM_REJECTED': { bg: 'bg-red-400/20', text: 'text-red-300' },
  'FORM_UPDATED': { bg: 'bg-blue-600/20', text: 'text-blue-300' },
  // Bank details actions
  'BANK_DETAILS_CREATED': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'BANK_DETAILS_UPDATED': { bg: 'bg-amber-600/20', text: 'text-amber-300' },
  // Star actions
  'USER_STARRED': { bg: 'bg-yellow-400/20', text: 'text-yellow-400' },
  'USER_UNSTARRED': { bg: 'bg-yellow-600/20', text: 'text-yellow-300' },
  // Helpdesk actions
  'TICKET_CREATED': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'TICKET_RESOLVED': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'TICKET_DELETED': { bg: 'bg-red-600/20', text: 'text-red-300' },
  // Notification actions
  'NOTIFICATION_SENT': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
};

export default function AuditLogsPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageSize = 50;

  // ── Cursor-based infinite query (Firestore) ──
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    isError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<CursorAuditLogsResponse>({
    queryKey: ['auditLogs'],
    queryFn: ({ pageParam }) =>
      auditLogsFirestore.getAllCursor(pageSize, pageParam as string | undefined),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
    initialPageParam: undefined as string | undefined,
  });

  // ── Old offset-based infinite query (commented out) ──
  // const {
  //   data,
  //   isLoading,
  //   isFetching,
  //   isFetchingNextPage,
  //   error,
  //   isError,
  //   hasNextPage,
  //   fetchNextPage,
  // } = useInfiniteQuery<AuditLogsResponse>({
  //   queryKey: ['auditLogs'],
  //   queryFn: ({ pageParam = 0 }) => auditLogsApi.getAll(pageSize, pageParam as number),
  //   getNextPageParam: (lastPage, allPages) => {
  //     if (!lastPage.hasMore) return undefined;
  //     return allPages.length * pageSize;
  //   },
  //   initialPageParam: 0,
  //   maxPages: 5,
  // });

  // Flatten all pages into single array
  const allLogs = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Get total from first page
  const total = data?.pages[0]?.total ?? 0;

  // Track previous length for animations
  const [previousLength, setPreviousLength] = useState(0);
  useEffect(() => {
    if (allLogs.length > previousLength) {
      setPreviousLength(allLogs.length);
    }
  }, [allLogs.length, previousLength]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      if (isNearBottom) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Auto-load next page if content does not overflow the container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || allLogs.length === 0) return;

    const timer = setTimeout(() => {
      const { scrollHeight, clientHeight } = container;
      const isNotScrollable = scrollHeight <= clientHeight;

      if (isNotScrollable && hasNextPage && !isFetchingNextPage) {
        loadMore();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [data, hasNextPage, isFetchingNextPage, loadMore, allLogs.length]);



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionStyle = (action: string) => {
    return actionColors[action] || { bg: 'bg-slate-700', text: 'text-slate-300' };
  };

  return (
    <motion.div
      className="space-y-8 p-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-linear-to-br from-amber-500 to-orange-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Immutable system activity and security logs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/20 text-amber-400 text-lg hover:bg-amber-500/20 px-3 py-1">
              <FileText className="h-6 w-6 mr-1" />
              {total} Records
            </Badge>
            <RefreshTableButton queryKey={['auditLogs']} isFetching={isFetching && !isFetchingNextPage} />
          </div>
        </div>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        {allLogs.length === 0 && !isLoading ? (
          <motion.div
            className="text-center py-16 bg-white dark:bg-transparent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Shield className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
            <div className="text-slate-600 dark:text-slate-400 text-lg">No audit logs found</div>
            <p className="text-slate-500 text-sm mt-2">System activity will appear here</p>
          </motion.div>
        ) : (
          <div ref={scrollContainerRef} className="max-h-[70vh] overflow-y-auto relative">
            {/* Inline loader when refetching with existing data */}
            {isFetching && !isFetchingNextPage && allLogs.length > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                  <div className='size-5 border-2 border-t-[3px] border-slate-300 dark:border-white/20 border-t-amber-400 rounded-full animate-spin' />
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Refreshing...</span>
                </div>
              </div>
            )}
            <table className="w-full">
              <thead className="sticky top-0 z-10 backdrop-blur-md bg-slate-100/80 dark:bg-slate-800/80">
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Timestamp
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Activity className="h-4 w-4 inline mr-1" />
                    Action
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Entity Type
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">Entity ID</th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    User ID
                  </th>
                  <th className="text-left py-4 px-5 text-slate-600 dark:text-slate-400 font-medium text-sm">
                    <Globe className="h-4 w-4 inline mr-1" />
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {allLogs.map((log, index) => {
                    const actionStyle = getActionStyle(log.action);
                    const isNew = index >= previousLength;
                    return (
                      <motion.tr
                        key={log.id}
                        custom={isNew ? index - previousLength : index}
                        variants={tableRowVariants}
                        initial={isNew ? "hidden" : false}
                        animate="visible"
                        whileHover="hover"
                        className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="py-4 px-5">
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{formatDate(log.created_at)}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-slate-700 dark:text-slate-300 text-sm">{log.entity_type}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">{log.ip_address || '-'}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Loading / Status */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-transparent">
          {isLoading && allLogs.length === 0 ? (
            <div className="flex items-center justify-center gap-3">
              <div className='size-5 border-2 border-t-[3px] border-slate-300 dark:border-white/20 border-t-amber-400 rounded-full animate-spin' />
              <span className="text-slate-600 dark:text-slate-400 text-sm">Loading logs...</span>
            </div>
          ) : isError ? (
            <RetryButton queryKey={['auditLogs']} message={(error as Error)?.message || 'Failed to load audit logs'} />
          ) : isFetchingNextPage ? (
            <div className="flex items-center justify-center gap-2">
              <div className='size-4 border-2 border-t-[3px] border-slate-300 dark:border-white/20 border-t-amber-400 rounded-full animate-spin' />
              <span className="text-slate-600 dark:text-slate-400 text-sm">Loading more...</span>
            </div>
          ) : hasNextPage ? (
            <p className="text-center text-sm text-slate-500">Scroll down to load more</p>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Showing all {allLogs.length} records
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
