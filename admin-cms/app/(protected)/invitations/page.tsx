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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MailOpen, Calendar, MapPin, FileText, Loader2, Trash2, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticeFirestore, getFileURL } from '@/services/firebase/notice.firestore';
import { useDebounceValue } from 'usehooks-ts';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

// ────────────── Types ──────────────

interface InvitationRow {
  notice_id: string;
  recipient_id: string;
  user_id: string;
  user_name: string;
  title: string;
  venue: string | null;
  event_time: string | null;
  event_date: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  reject_reason: string | null;
  responded_at: string | null;
  created_at: string;
}

interface InvitationsFilters {
  search?: string;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

interface InvitationsResponse {
  data: InvitationRow[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

// ────────────── Constants ──────────────

const INVITATIONS_QUERY_KEY = 'invitations';

// ────────────── Animation variants ──────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: Math.min(i * 0.02, 0.3), duration: 0.2, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
  hover: { backgroundColor: 'rgba(51, 65, 85, 0.3)', transition: { duration: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  ACCEPTED: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

// ────────────── Sub-components ──────────────

function DeleteInvitationButton({ recipientId, userName }: { recipientId: string; userName: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => noticeFirestore.deleteInvitationRecipient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY] });
    },
  });

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={deleteMutation.isPending}
        className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
        title="Delete Invitation"
      >
        {deleteMutation.isPending ? (
          <div className="size-5 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-red-600 rounded-full animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </button>

      <AlertDialog open={showDialog} onOpenChange={(open) => !deleteMutation.isPending && setShowDialog(open)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              Delete Invitation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Remove invitation for &quot;{userName}&quot;?
              <br />
              <span className="text-red-500 dark:text-red-400 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                deleteMutation.mutate(recipientId, {
                  onSuccess: () => showSuccessToast(`Invitation for "${userName}" deleted`),
                  onError: () => showErrorToast('Failed to delete invitation'),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ViewFileButton({ fileUrl }: { fileUrl: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const url = await getFileURL(fileUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      showErrorToast('Failed to open file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
      View File
    </button>
  );
}

// ────────────── Main Page ──────────────

export default function InvitationsPage() {
  const [selectedNotice, setSelectedNotice] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useDebounceValue('', 500);

  const pageSize = 50;
  const queryClient = useQueryClient();

  // Build filter — if a specific notice is selected, use its title as search
  const searchFilter = selectedNotice !== 'all' ? selectedNotice : searchQuery || undefined;

  const filters: InvitationsFilters = { search: searchFilter, status: statusFilter };

  // ── useInfiniteQuery: server-side cursor pagination ──
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<InvitationsResponse>({
    queryKey: [INVITATIONS_QUERY_KEY, 'cursor', filters],
    queryFn: ({ pageParam }) =>
      noticeFirestore.getInvitations(filters, pageSize, pageParam as string | undefined),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor ?? undefined;
    },
    initialPageParam: undefined as string | undefined,
  });

  // Flatten pages
  const allRows = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const total = data?.pages[0]?.total ?? 0;

  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (allRows.length > 0 || (!isLoading && data)) {
      hasLoadedOnce.current = true;
    }
  }, [allRows.length, isLoading, data]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 400) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    // Already in HH:mm format
    return timeString;
  };

  // Stats
  const statusCounts = {
    pending: allRows.filter((r) => r.status === 'PENDING').length,
    accepted: allRows.filter((r) => r.status === 'ACCEPTED').length,
    rejected: allRows.filter((r) => r.status === 'REJECTED').length,
  };

  if (isError && allRows.length === 0) {
    return (
      <motion.div className="space-y-8 p-2" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <MailOpen className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invitations</h1>
          </div>
        </motion.div>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="flex flex-col items-center justify-center py-12 text-red-400">
            <MailOpen className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Failed to load invitations</p>
            <p className="text-sm text-slate-500 mt-1">{(error as Error)?.message || 'Unknown error'}</p>
            <button
              className="mt-4 px-4 py-2 text-sm text-blue-400 border border-blue-400 rounded-lg hover:bg-blue-400/10"
              onClick={() => queryClient.invalidateQueries({ queryKey: [INVITATIONS_QUERY_KEY], exact: false })}
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
    <motion.div className="space-y-8 p-2" variants={containerVariants} initial={false} animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <MailOpen className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invitations</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Track invitation notice responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-1">
              {statusCounts.pending} Pending
            </Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1">
              {statusCounts.accepted} Accepted
            </Badge>
            <Badge className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-1">
              {statusCounts.rejected} Rejected
            </Badge>
            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 px-3 py-1">
              {total} Total
            </Badge>
            <RefreshTableButton
              queryKey={[INVITATIONS_QUERY_KEY, 'cursor', filters]}
              isFetching={isFetching && !isFetchingNextPage}
            />
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
              Search Invitations
            </label>
            <Input
              placeholder="Search by notice title..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchQuery(e.target.value);
                setSelectedNotice('all');
              }}
              className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Status</label>
            <Select
              value={statusFilter ?? 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as any)}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50 border-blue-400 dark:border-blue-500 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Statuses</SelectItem>
                <SelectItem value="PENDING" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Pending</SelectItem>
                <SelectItem value="ACCEPTED" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Accepted</SelectItem>
                <SelectItem value="REJECTED" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <ClearFiltersButton
            hasActiveFilters={!!(searchInput || statusFilter || selectedNotice !== 'all')}
            onClear={() => {
              setSearchInput('');
              setSearchQuery('');
              setSelectedNotice('all');
              setStatusFilter(undefined);
            }}
          />
        </div>
      </motion.div>

      {/* Invitations Table */}
      <motion.div
        className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-lg dark:shadow-xl"
        variants={cardVariants}
      >
        <div ref={tableContainerRef} className="relative max-h-[600px] overflow-y-auto" onScroll={handleScroll}>
          <table className="w-full">
            <thead>
              <tr className="bg-blue-700 dark:bg-blue-800 text-white sticky top-0 z-10">
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Sl.</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">Full Name</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">
                  <FileText className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                  Message
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">
                  <Calendar className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                  Date & Time
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">
                  <MapPin className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                  Venue
                </th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">File</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">Reject Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider border-l border-blue-500/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !hasLoadedOnce.current ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 className="h-10 w-10 text-blue-500" />
                      </motion.div>
                      <span className="text-slate-400">Loading invitations...</span>
                    </div>
                  </td>
                </tr>
              ) : (isLoading && hasLoadedOnce.current) || (isFetching && !isFetchingNextPage) ? (
                <TableRowsSkeleton rows={15} columns={9} />
              ) : allRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <MailOpen className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <div className="text-slate-500 dark:text-slate-400 text-lg">No invitations found</div>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your filters or send invitation notices to users</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {allRows.map((row: InvitationRow, index: number) => (
                    <motion.tr
                      key={row.recipient_id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover="hover"
                      layout
                      className="border-b border-slate-100 dark:border-slate-800/50"
                    >
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{row.user_name}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{row.title}</span>
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex flex-col">
                          <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                            {formatDate(row.event_date)}
                          </span>
                          {row.event_time && (
                            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatTime(row.event_time)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 max-w-[180px]">
                        <span className="text-slate-600 dark:text-slate-400 text-sm">{row.venue || '—'}</span>
                      </td>
                      <td className="py-4 px-5">
                        {row.file_url ? (
                          <ViewFileButton fileUrl={row.file_url} />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <Badge className={`${statusStyles[row.status] || statusStyles.PENDING} font-semibold`}>
                          {row.status === 'ACCEPTED' ? 'Accepted' : row.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 max-w-[220px]">
                        {row.status === 'REJECTED' && row.reject_reason ? (
                          <span className="text-xs text-red-600 dark:text-red-400 italic leading-relaxed" title={row.reject_reason}>
                            {row.reject_reason.length > 80
                              ? row.reject_reason.slice(0, 80) + '…'
                              : row.reject_reason}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <DeleteInvitationButton recipientId={row.recipient_id} userName={row.user_name} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Section */}
        {allRows.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
            {isError ? (
              <p className="text-red-500 dark:text-red-400 text-center text-sm">
                {(error as Error)?.message || 'Failed to load invitations'}
              </p>
            ) : isFetchingNextPage ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 text-blue-500 animate-spin" />
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
                Load More ({total - allRows.length} remaining)
              </motion.button>
            ) : (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Showing all {allRows.length} records
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
