'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Home, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import { DownloadXlsxButton } from '@/components/DownLoadXlxsButton';
import { downloadXlsx } from '@/lib/download-xlsx';
import {
    ieHomeVisitDataFirestore,
    type IEHomeVisitResponse,
} from '@/services/firebase/ie-home-visit-data.firestore';
import { masterDataFirestore } from '@/services/firebase/master-data.firestore';
import { RetryButton } from '@/components/RetryButton';

// ─── Animation Variants ────────────────────────────────────────────────
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};
const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// ─── XLSX columns ──────────────────────────────────────────────────────
const XLSX_COLUMNS = [
    { key: 'ebrc', label: 'EBRC' },
    { key: 'district', label: 'District' },
    { key: 'submitted_by_name', label: 'Submitted By' },
    { key: 'rci_number', label: 'RCI Number' },
    { key: 'name_of_cwsn', label: 'Name of CwSN' },
    { key: 'type_of_disability', label: 'Disability Type' },
    { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age' },
    { key: 'activities_topics', label: 'Activities / Topics' },
    { key: 'therapy_type', label: 'Therapy Type' },
    { key: 'therapy_brief', label: 'Therapy (in brief)' },
    { key: 'expected_outcome', label: 'Expected Outcome' },
    { key: 'was_goal_achieved', label: 'Was Goal Achieved?' },
    { key: 'photos', label: 'Photos' },
    { key: 'created_at', label: 'Date' },
];

// ═══════════════════════════════════════════════════════════════════════
export default function HomeVisitsPage() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [districtFilter, setDistrictFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: districts = [] } = useQuery({ queryKey: ['districts'], queryFn: masterDataFirestore.getDistricts });

    const {
        data,
        isLoading,
        isFetching,
        isFetchingNextPage,
        isError,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery<IEHomeVisitResponse>({
        queryKey: ['ieHomeVisits', districtFilter],
        queryFn: ({ pageParam }) =>
            ieHomeVisitDataFirestore.fetchPage(
                pageParam as string | undefined,
                districtFilter !== 'all' ? districtFilter : undefined,
            ),
        getNextPageParam: (lastPage) => {
            if (!lastPage.hasMore) return undefined;
            return lastPage.nextCursor ?? undefined;
        },
        initialPageParam: undefined as string | undefined,
    });

    // Flatten pages
    const allRows = useMemo(() => data?.pages.flatMap(p => p.data) ?? [], [data]);
    const total = data?.pages[0]?.total ?? 0;

    // Client-side search filter
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return allRows;
        const q = searchQuery.toLowerCase();
        return allRows.filter(
            (r) =>
                r.ebrc.toLowerCase().includes(q) ||
                r.name_of_cwsn.toLowerCase().includes(q) ||
                r.submitted_by_name.toLowerCase().includes(q) ||
                r.activities_topics.toLowerCase().includes(q),
        );
    }, [allRows, searchQuery]);

    const hasFilters = districtFilter !== 'all' || searchQuery.trim() !== '';

    // Load more
    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Infinite scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 300) loadMore();
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [loadMore]);

    // Auto-load if not scrollable
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || allRows.length === 0) return;
        const timer = setTimeout(() => {
            if (container.scrollHeight <= container.clientHeight && hasNextPage && !isFetchingNextPage) loadMore();
        }, 100);
        return () => clearTimeout(timer);
    }, [data, hasNextPage, isFetchingNextPage, loadMore, allRows.length]);

    // XLSX export
    const handleDownloadXlsx = async () => {
        const all = await ieHomeVisitDataFirestore.fetchAll(
            districtFilter !== 'all' ? districtFilter : undefined,
        );
        downloadXlsx(all, XLSX_COLUMNS, 'ie_home_visits');
    };

    return (
        <motion.div className="space-y-6 p-2" variants={containerVariants} initial={false} animate="visible">
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 bg-linear-to-br from-violet-500 to-purple-600 rounded-lg"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Home className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IE Home Visits</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Inclusive Education home visit records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
                            {total} Records
                        </Badge>
                        <DownloadXlsxButton onDownload={handleDownloadXlsx} disabled={total === 0} />
                        <RefreshTableButton queryKey={['ieHomeVisits', districtFilter]} isFetching={isFetching && !isFetchingNextPage} />
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-xl"
                variants={cardVariants}
            >
                <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
                    <div className="w-56">
                        <Select value={districtFilter} onValueChange={setDistrictFilter}>
                            <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                                <SelectValue placeholder="All Districts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Districts</SelectItem>
                                {districts.map((d) => (
                                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, EBRC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <ClearFiltersButton
                        hasActiveFilters={hasFilters}
                        onClear={() => { setDistrictFilter('all'); setSearchQuery(''); }}
                    />
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
                variants={cardVariants}
            >
                {isError ? (
                    <div className="text-center py-16 bg-white dark:bg-transparent">
                        <Home className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                        <div className="text-slate-600 dark:text-slate-400 text-lg mb-2">Failed to load home visit data</div>
                        <RetryButton queryKey={['ieHomeVisits', districtFilter]} />
                    </div>
                ) : filteredRows.length === 0 && !isLoading ? (
                    <div className="text-center py-16 bg-white dark:bg-transparent">
                        <Home className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                        <div className="text-slate-600 dark:text-slate-400 text-lg">No home visit records found</div>
                        <p className="text-slate-500 text-sm mt-2">Adjust your filters or search query</p>
                    </div>
                ) : (
                    <div ref={scrollContainerRef} className="max-h-[70vh] overflow-y-auto overflow-x-auto relative">
                        {/* Inline refreshing overlay */}
                        {isFetching && !isFetchingNextPage && allRows.length > 0 && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                                    <div className='size-5 border-2 border-t-[3px] border-slate-300 dark:border-white/20 border-t-violet-400 rounded-full animate-spin' />
                                    <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Refreshing...</span>
                                </div>
                            </div>
                        )}
                        <table className="w-full min-w-[1500px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white">
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap w-14">Sl.</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[140px]">EBRC</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">District</th>
                                    <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Photos</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Submitted By</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">RCI Number</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Name of CwSN</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Disability Type</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Gender</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[180px]">Activities / Topics</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Therapy Type</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[200px]">Therapy (in brief)</th>
                                    <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[200px]">Expected Outcome</th>
                                    <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Was Goal Achieved?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-200 dark:border-slate-700 animate-pulse">
                                            {Array.from({ length: 14 }).map((_, j) => (
                                                <td key={j} className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    filteredRows.map((row, index) => (
                                        <motion.tr
                                            key={row.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="py-3.5 px-4">
                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-mono">
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">{row.ebrc}</td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.district}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0 text-xs">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {row.photos.length}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.submitted_by_name}</td>
                                            <td className="py-3.5 px-4 text-sm font-mono text-slate-600 dark:text-slate-400">{row.rci_number}</td>
                                            <td className="py-3.5 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">{row.name_of_cwsn}</td>
                                            <td className="py-3.5 px-4">
                                                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">
                                                    {row.type_of_disability}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.gender}</td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.activities_topics}</td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.therapy_type}</td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.therapy_brief}</td>
                                            <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.expected_outcome}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <Badge className={`border-0 text-xs ${row.was_goal_achieved === 'Yes'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : row.was_goal_achieved === 'No'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                    {row.was_goal_achieved}
                                                </Badge>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Load more / loading indicator */}
                        {isFetchingNextPage && (
                            <div className="flex items-center justify-center py-6 gap-3">
                                <div className='size-5 border-2 border-t-[3px] border-slate-300 dark:border-white/20 border-t-violet-400 rounded-full animate-spin' />
                                <span className="text-slate-500 dark:text-slate-400 text-sm">Loading more...</span>
                            </div>
                        )}
                        {!hasNextPage && allRows.length > 0 && !isFetchingNextPage && (
                            <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">
                                All {total} records loaded
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
