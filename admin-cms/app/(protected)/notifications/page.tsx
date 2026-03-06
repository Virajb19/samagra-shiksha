'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Bell, FileText, Calendar, Tag, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { DeleteNoticeButton } from '@/components/DeleteNoticeButton';
import { ViewNoticeButton } from '@/components/ViewNoticeButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import { useQueryClient } from '@tanstack/react-query';
import noticesApi, { type Notice, type NoticeType, type CursorNoticesResponse, noticeTypeLabels, NOTICES_QUERY_KEY, useGetNoticesCursorInfinite } from '@/services/notices.service';
import { useDebounceValue } from 'usehooks-ts';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
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
    transition: {
      // Cap delay at 0.3s max for better UX when loading more records
      delay: Math.min(i * 0.02, 0.3),
      duration: 0.2,
      ease: 'easeOut' as const
    }
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  },
  hover: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
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

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'GENERAL', label: 'General' },
  { value: 'INVITATION', label: 'Invitation' },
  { value: 'PUSH_NOTIFICATION', label: 'Push Notification' },
];


const typeStyles: Record<string, string> = {
  'GENERAL': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'INVITATION': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'PUSH_NOTIFICATION': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useDebounceValue('', 500);

  const pageSize = 50;

  const queryClient = useQueryClient();

  // Build the type filter - only pass to API if not 'all'
  const typeFilter = selectedType === 'all' ? undefined : selectedType;

  // useInfiniteQuery for fetching notices (cursor-based pagination)
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
  } = useGetNoticesCursorInfinite({ type: typeFilter, search: searchQuery || undefined }, pageSize);

  // ── Old offset-based infinite query (commented out) ──
  // const {
  //   data,
  //   isLoading,
  //   isFetching,
  //   isFetchingNextPage,
  //   isError,
  //   error,
  //   hasNextPage,
  //   fetchNextPage,
  // } = useGetNoticesInfinite({ type: typeFilter, search: searchQuery || undefined }, pageSize);

  // Flatten all pages into single array
  const allNotices = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Get total from first page
  const total = data?.pages[0]?.total ?? 0;

  // Track if initial data has ever been loaded (for showing loader in table vs skeleton)
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (allNotices.length > 0 || (!isLoading && data)) {
      hasLoadedOnce.current = true;
    }
  }, [allNotices.length, isLoading, data]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Ref for the table container to track scroll position
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Prefetch next page when user scrolls near bottom
  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Prefetch when within 400px of bottom
    if (distanceFromBottom < 400) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll listener
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);



  // Stats
  const withFileCount = allNotices.filter((n: Notice) => n.file_url).length;
  const typeCounts = {
    general: allNotices.filter((n: Notice) => n.type === 'GENERAL').length,
    invitation: allNotices.filter((n: Notice) => n.type === 'INVITATION').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Prefetch records of a type when user hovers over a type
  const handleSelectHover = (typeValue: string) => {
    // Don't prefetch 'all' - it's already loaded or will be the default
    if (typeValue === 'all' || typeValue === selectedType) return;

    const filters = { type: typeValue };
    
    // queryClient.prefetchInfiniteQuery({
    //     queryKey: [NOTICES_QUERY_KEY, 'infinite', filters],
    //     queryFn: ({ pageParam = 0 }) =>
    //       noticesApi.getAll(filters, pageSize, pageParam as number),
    //     getNextPageParam: (
    //       lastPage: { hasMore: boolean },
    //       allPages: unknown[]
    //     ) => {
    //       if (!lastPage.hasMore) return undefined;
    //       return allPages.length * pageSize;
    //     },
    //     initialPageParam: 0,
    //     staleTime: 1000 * 60 * 7, // Already set in queryClient globally
    // });

    queryClient.prefetchInfiniteQuery({
      queryKey: [NOTICES_QUERY_KEY, 'cursor', filters],
      queryFn: ({ pageParam }) =>
        noticesApi.getAllCursor(filters, pageSize, pageParam as string | undefined),
      getNextPageParam: (lastPage: CursorNoticesResponse) => {
        if (!lastPage.hasMore) return undefined;
        return lastPage.nextCursor ?? undefined;
      },
      initialPageParam: undefined as string | undefined,
      staleTime: 1000 * 60 * 7,
    });
  };

  if (isError && allNotices.length === 0) {
    return (
      <motion.div
        className="space-y-8 p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="flex flex-col items-center justify-center py-12 text-red-400">
            <Bell className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Failed to load notices</p>
            <p className="text-sm text-slate-500 mt-1">{(error as Error)?.message || 'Unknown error'}</p>
            <button
              className="mt-4 px-4 py-2 text-sm text-blue-400 border border-blue-400 rounded-lg hover:bg-blue-400/10"
              onClick={() => queryClient.invalidateQueries({ queryKey: [NOTICES_QUERY_KEY], exact: false })}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }


  return (
    <motion.div
      className="space-y-8 p-2"
      variants={containerVariants}
      initial={false}
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">View and manage all system notices</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1">
              {typeCounts.general} General
            </Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1">
              {withFileCount} With Files
            </Badge>
            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 px-3 py-1">
              {total} Total
            </Badge>
            <RefreshTableButton queryKey={[NOTICES_QUERY_KEY, 'cursor', { type: typeFilter }]} isFetching={isFetching && !isFetchingNextPage} />
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg dark:shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Notices
            </label>
            <Input
              placeholder="Enter exact notice title..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setSearchQuery(e.target.value); }}
              className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                {typeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                    onMouseEnter={() => handleSelectHover(option.value)}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Notices Table */}
      <motion.div
        className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-lg dark:shadow-xl"
        variants={cardVariants}
      >
        <div ref={tableContainerRef} className="relative max-h-[600px] overflow-y-auto" onScroll={handleScroll}>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Sl No.</th>
                <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Title
                </th>
                <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  <Tag className="h-4 w-4 inline mr-1" />
                  Type
                </th>
                <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Message
                </th>
                <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date
                </th>
                <th className="text-left py-4 px-5 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Show loader in table for first-ever load */}
              {isLoading && !hasLoadedOnce.current ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="h-10 w-10 text-blue-500" />
                      </motion.div>
                      <span className="text-slate-400">Loading notices...</span>
                    </div>
                  </td>
                </tr>
              ) : /* Show skeleton rows when refetching (search, filter, refresh) but not load more */
                ((isLoading && hasLoadedOnce.current) || (isFetching && !isFetchingNextPage)) ? (
                  <TableRowsSkeleton rows={15} columns={6} />
                ) : allNotices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Bell className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                      <div className="text-slate-500 dark:text-slate-400 text-lg">No notices found</div>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {allNotices.map((notice: Notice, index: number) => (
                      <motion.tr
                        key={notice.id}
                        custom={index}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        whileHover="hover"
                        layout
                        className="border-b border-slate-100 dark:border-slate-800/50"
                      >
                        <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-mono text-sm">{index + 1}</td>
                        <td className="py-4 px-5">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {notice.title}
                          </span>
                        </td>
                        <td className="py-4 px-5 min-w-[160px] whitespace-nowrap">
                          <Badge className={typeStyles[notice.type] || typeStyles['GENERAL']}>
                            {noticeTypeLabels[notice.type as NoticeType] || 'General'}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 max-w-[300px]">
                          <span className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">
                            {notice.content}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-600 dark:text-slate-400 min-w-[100px] whitespace-nowrap">{formatDate(notice.created_at)}</td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1">
                            <ViewNoticeButton notice={notice} />
                            <DeleteNoticeButton noticeId={notice.id} noticeTitle={notice.title} />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
            </tbody>
          </table>
        </div>

        {/* Load More Section */}
        {allNotices.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
            {isError ? (
              <p className="text-red-500 dark:text-red-400 text-center text-sm">{(error as Error)?.message || 'Failed to load notices'}</p>
            ) : isFetchingNextPage ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className='size-4 text-blue-500 animate-spin' />
                <span className="text-slate-500 dark:text-slate-400 text-sm">Loading more...</span>
              </div>
            ) : hasNextPage ? (
              <motion.button
                onClick={loadMore}
                disabled={isFetchingNextPage}
                className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/5 hover:bg-blue-100 dark:hover:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-all font-medium disabled:opacity-70"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Load More ({total - allNotices.length} remaining)
              </motion.button>
            ) : (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Showing all {allNotices.length} records
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
