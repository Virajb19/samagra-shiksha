'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { CheckCircle, Loader2, Headphones, Hash, User, MessageSquare, Phone, Calendar, HelpCircle, Search, Filter, X } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { helpdeskFirestore, HelpdeskResponse } from '@/services/firebase/helpdesk.firestore';
import { Badge } from '@/components/ui/badge';
import { DeleteTicketButton } from '@/components/DeleteTicketButton';
import { ToggleTicketStatusButton } from '@/components/ToggleTicketStatusButton';
import { ExpandableText } from '@/components/ExpandableText';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { GoToTopButton } from '@/components/GoToTopButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import { useDebounceValue } from 'usehooks-ts';

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
    transition: { delay: Math.min(i * 0.02, 0.3), duration: 0.3, ease: 'easeOut' as const }
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  },
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const ordinal = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  return `${day}${ordinal} ${month}, ${year}`;
}

const PAGE_SIZE = 20;

export default function HelpdeskPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 500);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | undefined>(undefined);

  // Fetch helpdesk tickets with infinite query
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<HelpdeskResponse>({
    queryKey: ['helpdesk-tickets', statusFilter, debouncedSearch],
    queryFn: ({ pageParam = null }) => helpdeskFirestore.getAll(PAGE_SIZE, pageParam as string | null, statusFilter, debouncedSearch || undefined),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor;
    },
    initialPageParam: null as string | null,
    placeholderData: prev => prev
  });

  // Flatten all pages into single array
  const allTickets = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Get total from first page (it's the same across all pages)
  const total = data?.pages[0]?.total ?? 0;

  // Track if initial data has ever been loaded (for showing loader in table vs skeleton)
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (allTickets.length > 0 || (!isLoading && data)) {
      hasLoadedOnce.current = true;
    }
  }, [allTickets.length, isLoading, data]);

  // Server-side search — no client-side filtering needed
  const filteredTickets = allTickets;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };


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
              className="p-2 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <HelpCircle className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Helpdesk</h1>
                <Badge className="bg-linear-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 px-3 py-0.5 text-xs font-semibold shadow-md shadow-pink-500/20">
                  {total} Total
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage support tickets from users</p>
            </div>
          </div>
          <RefreshTableButton queryKey={['helpdesk-tickets', statusFilter, debouncedSearch]} isFetching={isFetching && !isFetchingNextPage} />
        </div>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        variants={itemVariants}
      >
        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Enter full name or phone number..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setDebouncedSearch(e.target.value);
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
              }}
              className="absolute right-3 top-1/2 p-2 rounded-full hover:bg-red-500/30 duration-200 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2">
          <motion.button
            onClick={() => setStatusFilter(undefined)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${statusFilter === undefined
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            All
          </motion.button>
          <motion.button
            onClick={() => setStatusFilter('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${statusFilter === 'pending'
              ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="h-4 w-4" />
            Pending
          </motion.button>
          <motion.button
            onClick={() => setStatusFilter('resolved')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${statusFilter === 'resolved'
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle className="h-4 w-4" />
            Resolved
          </motion.button>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl relative"
        variants={cardVariants}
      >
        <div className="relative">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <Hash className="h-4 w-4 inline mr-1" />
                  Sl No.
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <User className="h-4 w-4 inline mr-1" />
                  Full Name
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Message
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Status</th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Show error state */}
              {error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-white dark:bg-transparent">
                    <RetryButton
                      queryKey={['helpdesk-tickets', statusFilter, debouncedSearch]}
                      message="Failed to load tickets"
                    />
                  </td>
                </tr>
              ) : /* Show loader in table for first-ever load */
                isLoading && !hasLoadedOnce.current ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="h-10 w-10 text-blue-500" />
                        </motion.div>
                        <span className="text-slate-400">Loading tickets...</span>
                      </div>
                    </td>
                  </tr>
                ) : /* Show skeleton rows when refetching (filter, refresh) but not load more */
                  ((isLoading && hasLoadedOnce.current) || (isFetching && !isFetchingNextPage)) ? (
                    <TableRowsSkeleton rows={15} columns={7} />
                  ) : filteredTickets.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {filteredTickets.map((ticket, index) => (
                        <motion.tr
                          key={ticket.id}
                          custom={index}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          whileHover="hover"
                          layout
                          className="border-b border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="py-4 px-5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{ticket.full_name}</span>
                          </td>
                          <td className="py-4 px-5 max-w-xs">
                            <ExpandableText
                              text={ticket.message}
                              maxLength={60}
                              className="text-slate-700 dark:text-slate-300 text-sm"
                            />
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-slate-700 dark:text-slate-300 font-mono text-sm bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">
                              {ticket.phone}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-slate-600 dark:text-slate-400 text-sm">
                            {formatDate(ticket.created_at)}
                          </td>
                          <td className="py-4 px-5">
                            {ticket.is_resolved ? (
                              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-0">
                                Resolved
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="bg-yellow-500/20 text-yellow-400 border-0">
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <ToggleTicketStatusButton ticketId={ticket.id} isResolved={ticket.is_resolved} />
                              <DeleteTicketButton ticketId={ticket.id} />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-16 text-center bg-white dark:bg-transparent">
                        <Headphones className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                        <div className="text-slate-600 dark:text-slate-400 text-lg">
                          {searchInput ? 'No matching tickets found' : 'No helpdesk tickets found'}
                        </div>
                        <p className="text-slate-500 text-sm mt-2">
                          {searchInput
                            ? 'Try adjusting your search criteria'
                            : 'Tickets submitted by users will appear here'}
                        </p>
                        {searchInput && (
                          <button
                            onClick={() => {
                              setSearchInput('');
                              setDebouncedSearch('');
                            }}
                            className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium"
                          >
                            Clear search
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>

        {/* Load More / Record count */}
        {filteredTickets.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-transparent">
            {hasNextPage ? (
              <motion.button
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/10 dark:bg-blue-500/5 hover:bg-blue-500/20 dark:hover:bg-blue-500/10 rounded-lg transition-all font-medium disabled:opacity-70 border border-blue-500/30 dark:border-blue-500/20"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isFetchingNextPage ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className='size-5 text-blue-500 animate-spin' />
                    <span className="text-blue-500 dark:text-blue-300">Loading more tickets...</span>
                  </span>
                ) : (
                  `Load More (${total - allTickets.length} remaining)`
                )}
              </motion.button>
            ) : (
              <p className="text-center text-sm text-slate-500">
                Showing all {allTickets.length} records
              </p>
            )}
          </div>
        )}
      </motion.div>
      <GoToTopButton />
    </motion.div>
  );
}