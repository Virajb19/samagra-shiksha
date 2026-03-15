'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { RetryButton } from '@/components/RetryButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, MapPin, Users, Eye, Loader2, Check, X, Clock, CalendarDays, Search, Download, FileText, User, FilterX, ChevronDown } from 'lucide-react';
import { eventsFirestore, EventFilterParams, EventWithStats, EventsResponse } from '@/services/firebase/events.firestore';
import { DeleteEventButton } from '@/components/DeleteEventButton';
import { useGetDistricts } from '@/services/user.service';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { GoToTopButton } from '@/components/GoToTopButton';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useIsMutating, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDebounceValue } from 'usehooks-ts';
import Image from 'next/image';

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

// Skeleton row for loading state
const EventTableSkeleton = () => (
  <>
    {Array.from({ length: 10 }).map((_, index) => (
      <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50">
        <td className="py-4 px-5">
          <Skeleton className="h-5 w-8 bg-slate-200 dark:bg-slate-700" />
        </td>
        <td className="py-4 px-5">
          <Skeleton className="w-16 h-12 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </td>
        <td className="py-4 px-5">
          <Skeleton className="h-5 w-40 mb-2 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-5 w-20 bg-slate-200 dark:bg-slate-700" />
        </td>
        <td className="py-4 px-5">
          <Skeleton className="h-5 w-28 bg-slate-200 dark:bg-slate-700" />
        </td>
        <td className="py-4 px-5">
          <Skeleton className="h-5 w-24 bg-slate-200 dark:bg-slate-700" />
        </td>
        <td className="py-4 px-5">
          <Skeleton className="h-5 w-32 bg-slate-200 dark:bg-slate-700" />
        </td>
        <td className="py-4 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

const ACTIVITY_TYPE_OPTIONS = [
  'SMC Meeting',
  'Block Level Community Training',
  'Teachers Training Program',
  'Parent-Teacher Meeting',
  'Annual Day Celebration',
  'Sports Day',
  'Science Exhibition',
  'Cultural Festival',
  'Workshop on NEP 2020',
  'Orientation Program',
  'Career Guidance Seminar',
  'Health Camp',
  'Other',
] as const;

// View Event Button - disabled while any delete is in progress
function ViewEventButton({ eventId, onClick }: { eventId: string; onClick: () => void }) {
  const isDeletingAny = useIsMutating({ mutationKey: ['delete-event'] }) > 0;

  return (
    <motion.button
      onClick={onClick}
      disabled={isDeletingAny}
      className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={{ scale: isDeletingAny ? 1 : 1.05 }}
      whileTap={{ scale: isDeletingAny ? 1 : 0.95 }}
    >
      View
    </motion.button>
  );
}

const activityTypeColors: Record<string, string> = {
  'SMC Meeting': 'bg-blue-500/20 text-blue-400',
  'Block Level Community Training': 'bg-orange-500/20 text-orange-400',
  'Teachers Training Program': 'bg-cyan-500/20 text-cyan-400',
  'Parent-Teacher Meeting': 'bg-teal-500/20 text-teal-400',
  'Annual Day Celebration': 'bg-pink-500/20 text-pink-400',
  'Sports Day': 'bg-yellow-500/20 text-yellow-400',
  'Science Exhibition': 'bg-emerald-500/20 text-emerald-400',
  'Cultural Festival': 'bg-violet-500/20 text-violet-400',
  'Workshop on NEP 2020': 'bg-indigo-500/20 text-indigo-400',
  'Orientation Program': 'bg-lime-500/20 text-lime-400',
  'Career Guidance Seminar': 'bg-sky-500/20 text-sky-400',
  'Health Camp': 'bg-red-500/20 text-red-400',
  'Other': 'bg-purple-500/20 text-purple-400',
};

export default function EventsPage() {
  const { data: districts = [] } = useGetDistricts();

  // Date filters - default to all time (empty means no filter)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Search filter (server-side)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 500);

  const pageSize = 20;

  const [isDownloading, setIsDownloading] = useState(false);

  // Build filters for Firestore (including search)
  const filters: EventFilterParams = useMemo(() => {
    const filters: EventFilterParams = {};
    if (fromDate) filters.from_date = fromDate;
    if (toDate) filters.to_date = toDate;
    if (districtFilter && districtFilter !== 'all') filters.district_id = districtFilter;
    if (eventTypeFilter && eventTypeFilter !== 'all') filters.activity_type = eventTypeFilter;
    if (debouncedSearch) filters.search = debouncedSearch;
    return filters;
  }, [fromDate, toDate, districtFilter, eventTypeFilter, debouncedSearch]);

  // Fetch events with infinite query (inline)
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<EventsResponse>({
    queryKey: ['events-infinite', filters],
    queryFn: ({ pageParam }) =>
      eventsFirestore.getAll(filters, pageSize, (pageParam as string) || null),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor;
    },
    initialPageParam: null as string | null,
    refetchOnMount: 'always',
  });

  // Log errors to console for debugging
  if (isError && error) {
    console.error('[EventsPage] Query error:', error);
  }

  // Flatten all pages into single array
  const allEvents = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Get total from first page
  const total = data?.pages[0]?.total ?? 0;

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Get event details when viewing (inline useQuery)
  const { data: eventDetails, isLoading: isLoadingDetails } = useQuery<EventWithStats>({
    queryKey: ['event', selectedEventId],
    queryFn: () => eventsFirestore.getById(selectedEventId!),
    enabled: !!selectedEventId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateLong = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get full image URL (handles both Appwrite URLs and local relative paths)
  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // For relative paths (local storage fallback), prepend API base URL
    return `${process.env.NEXT_PUBLIC_API_BASE_URL}${url}`;
  };

  // Download PDF function
  const handleDownloadPDF = () => {
    try {
      setIsDownloading(true);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(33, 37, 41);
      doc.text('Events Report', 14, 22);

      // Subtitle with filters
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);

      // Build filter text - handle empty dates gracefully
      const filterParts: string[] = [];
      if (fromDate) filterParts.push(`From: ${formatDate(fromDate)}`);
      if (toDate) filterParts.push(`To: ${formatDate(toDate)}`);
      if (!fromDate && !toDate) filterParts.push('All dates');
      if (districtFilter !== 'all') {
        const district = districts.find(d => d.id === districtFilter);
        filterParts.push(`District: ${district?.name || districtFilter}`);
      }
      if (eventTypeFilter !== 'all') {
        filterParts.push(`Activity: ${eventTypeFilter}`);
      }

      doc.text(filterParts.join(' | '), 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 36);

      // Table
      const tableData = allEvents.map((event, index) => [
        index + 1,
        event.title,
        event.activity_type || '-',
        formatDate(event.event_date),
        event.location || '-',
        event.creator?.name || '-',
        `${event.male_participants || 0}M / ${event.female_participants || 0}F`,
      ]);

      autoTable(doc, {
        head: [['#', 'Event Name', 'Activity', 'Date', 'Venue', 'Created By', 'Participants']],
        body: tableData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Build filename
      const datePart = fromDate && toDate ? `${fromDate}-to-${toDate}` : new Date().toISOString().split('T')[0];
      doc.save(`events-report-${datePart}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Error state is now handled inline in the table to show "No events found" 
  // instead of blocking the entire page - users can still adjust filters

  const upcomingCount = allEvents.filter(e => new Date(e.event_date) >= new Date()).length;
  const pastCount = allEvents.filter(e => new Date(e.event_date) < new Date()).length;

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
              className="p-2 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <CalendarDays className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage meetings, exams, and other events</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1">
              {upcomingCount} Upcoming
            </Badge>
            <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
              {pastCount} Past
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/20 px-3 py-1">
              {total} Total
            </Badge>
            <RefreshTableButton queryKey={['events-infinite', filters]} isFetching={isFetching && !isFetchingNextPage} />
            <Button
              onClick={handleDownloadPDF}
              className="bg-green-600 group hover:bg-green-700 text-white flex items-center gap-2.5 px-6 py-4 text-sm font-semibold relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25"
              disabled={isDownloading || allEvents.length === 0}
            >
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {isDownloading ? (
                <>
                  <Loader2 className='size-5 text-white animate-spin' />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-7 w-7 group-hover:-translate-y-0.5 group-hover:scale-110 transition-transform duration-200" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Range */}
          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white"
            />
          </div>

          {/* District Filter */}
          <div className="min-w-[180px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">District</label>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Filter */}
          <div className="min-w-[160px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 block">Activity Type</label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white">
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Activities</SelectItem>
                {ACTIVITY_TYPE_OPTIONS.map((activity) => (
                  <SelectItem key={activity} value={activity} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">{activity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-500 dark:text-slate-400 text-sm mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Events
            </label>
            <Input
              placeholder="Search by title, location..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setDebouncedSearch(e.target.value);
              }}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white placeholder:text-slate-500"
            />
          </div>

          <motion.button
            onClick={() => {
              setFromDate('');
              setToDate('');
              setDistrictFilter('all');
              setEventTypeFilter('all');
              setSearchInput('');
              setDebouncedSearch('');
            }}
            className="flex items-center gap-2 px-6 py-3 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FilterX className="h-4 w-4" />
            Clear
          </motion.button>
        </div>
      </motion.div>

      {/* Events Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="relative">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Sl. No.</th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Photo</th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Event Name</th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Created By</th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Date
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Venue
                </th>
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {(isLoading || (isFetching && !isFetchingNextPage)) ? (
                <EventTableSkeleton />
              ) : (isError || allEvents.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <CalendarDays className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                      <div className="text-slate-500 dark:text-slate-400 text-lg">{isError ? 'Error loading events' : 'No events found'}</div>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                        {isError && error ? (error as Error).message : 'Try adjusting your filters'}
                      </p>
                      {isError && (
                        <RetryButton queryKey={['events-infinite', filters]} />
                      )}
                    </motion.div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {allEvents.map((event, index) => (
                    <motion.tr
                      key={event.id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover="hover"
                      layout
                      className="border-b border-slate-100 dark:border-slate-800/50"
                    >
                      <td className="py-4 px-5">
                        <span className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full text-sm font-mono font-medium">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {event.flyer_url ? (
                          <Image
                            src={getImageUrl(event.flyer_url) || ""}
                            alt={event.title}
                            width={64}
                            height={48}
                            className="rounded-lg object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                            unoptimized={process.env.NODE_ENV != "production"}
                          />
                        ) : (
                          <div className="w-16 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-slate-900 dark:text-white font-medium">{event.title}</p>
                        <Badge className={`${activityTypeColors[event.activity_type || 'Other'] || activityTypeColors.Other} mt-1`}>
                          {event.activity_type || 'Other'}
                        </Badge>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {event.creator?.name || 'Admin'}
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">
                        {event.location || '-'}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <ViewEventButton
                            eventId={event.id}
                            onClick={() => {
                              setSelectedEventId(event.id);
                              setViewModalOpen(true);
                            }}
                          />
                          <DeleteEventButton eventId={event.id} eventTitle={event.title} />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More / Status */}
        {allEvents.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
            {hasNextPage ? (
              <div className="flex justify-center">
                <motion.button
                  onClick={loadMore}
                  disabled={isFetchingNextPage}
                  className="group flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4 animate-bounce" />
                  )}
                  {isFetchingNextPage
                    ? 'Loading more...'
                    : `Load More (${total - allEvents.length} remaining)`}
                </motion.button>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500">
                Showing all {allEvents.length} events
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* View Event Modal - Detailed Dialog */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Event Details</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className='size-8 border-2 border-t-[3px] border-white/20 border-t-indigo-400 rounded-full animate-spin' />
            </div>
          ) : eventDetails ? (
            <div className="space-y-4">
              {/* Event Photos */}
              {eventDetails.flyer_url && (
                <div className="px-6">
                  <Image
                    src={getImageUrl(eventDetails.flyer_url) || "/placeholder.png"}
                    alt={eventDetails.title}
                    width={800}
                    height={256}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    unoptimized={process.env.NODE_ENV === "development"}
                  />
                </div>
              )}

              {/* Event Title & Description */}
              <div className="px-6 space-y-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{eventDetails.title}</h3>

                {eventDetails.description && (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {eventDetails.description}
                  </p>
                )}

                {/* Event Details Grid */}
                <div className="space-y-3 pt-2">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-red-500">Date:</span>
                    <span>
                      {formatDateLong(eventDetails.event_date)}
                      {eventDetails.event_end_date && eventDetails.event_end_date !== eventDetails.event_date && (
                        <> to {formatDateLong(eventDetails.event_end_date)}</>
                      )}
                    </span>
                  </div>

                  {/* Venue */}
                  {eventDetails.location && (
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-red-500">Venue:</span>
                      <span>{eventDetails.location}</span>
                    </div>
                  )}

                  {/* Participants */}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-red-500">Participants:</span>
                    <span>
                      {eventDetails.male_participants !== null && eventDetails.male_participants !== undefined
                        ? `${String(eventDetails.male_participants).padStart(2, '0')} (MALE)`
                        : '00 (MALE)'
                      }
                      {' | '}
                      {eventDetails.female_participants !== null && eventDetails.female_participants !== undefined
                        ? `${eventDetails.female_participants} (FEMALE)`
                        : '00 (FEMALE)'
                      }
                    </span>
                  </div>

                  {/* Activity Type */}
                  {eventDetails.activity_type && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-red-500">Activity:</span>
                      <span>{eventDetails.activity_type}</span>
                    </div>
                  )}

                  {/* Created By */}
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-red-500">Created by:</span>
                    <span>{eventDetails.creator?.name || 'Admin'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="p-6 pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setViewModalOpen(false)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <GoToTopButton />
    </motion.div>
  );
}