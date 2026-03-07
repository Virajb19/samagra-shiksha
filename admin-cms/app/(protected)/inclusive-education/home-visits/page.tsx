'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Home, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

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

// ─── Frozen / Sticky Column Config ─────────────────────────────────────
const FROZEN_KEYS = new Set(['sl', 'ebrc', 'district']);
const FROZEN_STYLES: Record<string, { width: string; left: string }> = {
    sl: { width: 'w-[60px] min-w-[60px]', left: 'left-0' },
    ebrc: { width: 'w-[160px] min-w-[160px]', left: 'left-[60px]' },
    district: { width: 'w-[160px] min-w-[160px]', left: 'left-[220px]' },
};
const FROZEN_BG_EVEN = 'bg-white dark:bg-slate-900';
const FROZEN_BG_ODD = 'bg-slate-50 dark:bg-slate-800';

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

// ─── Table columns ─────────────────────────────────────────────────────
const TABLE_COLUMNS = [
    { key: 'sl', label: 'Sl.' },
    { key: 'ebrc', label: 'EBRC' },
    { key: 'district', label: 'District' },
    { key: 'photos', label: 'Photos' },
    { key: 'submitted_by_name', label: 'Submitted By' },
    { key: 'rci_number', label: 'RCI Number' },
    { key: 'name_of_cwsn', label: 'Name of CwSN' },
    { key: 'type_of_disability', label: 'Disability Type' },
    { key: 'gender', label: 'Gender' },
    { key: 'activities_topics', label: 'Activities / Topics' },
    { key: 'therapy_type', label: 'Therapy Type' },
    { key: 'therapy_brief', label: 'Therapy (in brief)' },
    { key: 'expected_outcome', label: 'Expected Outcome' },
    { key: 'was_goal_achieved', label: 'Was Goal Achieved?' },
];

// ─── Photo Viewer Dialog ───────────────────────────────────────────────
function PhotoViewerDialog({ photos, open, onOpenChange }: { photos: string[]; open: boolean; onOpenChange: (o: boolean) => void }) {
    const [idx, setIdx] = useState(0);
    const prev = () => setIdx((i) => (i === 0 ? photos.length - 1 : i - 1));
    const next = () => setIdx((i) => (i === photos.length - 1 ? 0 : i + 1));
    useEffect(() => { if (open) setIdx(0); }, [open]);
    if (!photos.length) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="text-slate-900 dark:text-white text-lg">
                        Photo {idx + 1} of {photos.length}
                    </DialogTitle>
                </DialogHeader>
                <div className="relative flex items-center justify-center min-h-[400px] p-4 bg-slate-50 dark:bg-slate-800/50 mx-4 rounded-xl">
                    <AnimatePresence mode="wait">
                        <motion.img key={idx} src={photos[idx]} alt={`Photo ${idx + 1}`}
                            className="max-h-[500px] max-w-full object-contain rounded-lg shadow-md"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} />
                    </AnimatePresence>
                    {photos.length > 1 && (
                        <>
                            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-lg border border-slate-200 dark:bg-slate-700/90 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600 transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-lg border border-slate-200 dark:bg-slate-700/90 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600 transition-colors">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}
                </div>
                {photos.length > 1 && (
                    <div className="flex gap-2 px-4 pb-4 overflow-x-auto justify-center">
                        {photos.map((photo, i) => (
                            <button key={i} onClick={() => setIdx(i)}
                                className={cn('w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all shadow-sm',
                                    i === idx ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 dark:border-slate-600 opacity-60 hover:opacity-100')}>
                                <img src={photo} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Photo Cell ────────────────────────────────────────────────────────
function PhotoCell({ photos }: { photos: string[] }) {
    const [open, setOpen] = useState(false);
    if (!photos?.length) return <span className="text-slate-400">—</span>;
    return (
        <>
            <button onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors">
                <ImageIcon className="h-3.5 w-3.5" />
                View ({photos.length})
            </button>
            <PhotoViewerDialog photos={photos} open={open} onOpenChange={setOpen} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════
export default function HomeVisitsPage() {

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
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
        initialPageParam: undefined as string | undefined,
        placeholderData: (prev) => prev,
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
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IE Home Visits</h1>
                                {total > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-700/30">
                                        {total.toLocaleString()} Records
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Inclusive Education home visit records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                className="relative bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
                variants={cardVariants}
            >
                {/* Refresh blur overlay */}
                {isFetching && !isFetchingNextPage && allRows.length > 0 && (
                    <div className="absolute inset-0 z-[70] bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refreshing...</span>
                        </div>
                    </div>
                )}

                {isError && allRows.length === 0 ? (
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
                    <div className="overflow-x-auto">
                        <table className="w-max min-w-full border-separate border-spacing-0">
                            <thead className="sticky top-0 z-50">
                                <tr>
                                    {TABLE_COLUMNS.map((col, i) => {
                                        const isFrozen = FROZEN_KEYS.has(col.key);
                                        const frozen = FROZEN_STYLES[col.key];
                                        const isLastFrozen = col.key === 'district';
                                        const isWide = col.key === 'type_of_disability' || col.key === 'therapy_type';
                                        return (
                                            <th key={col.key} className={cn(
                                                'py-3.5 px-4 text-left text-xs font-semibold whitespace-nowrap bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white border-b border-blue-500/30',
                                                isFrozen && frozen && `sticky ${frozen.left} ${frozen.width} z-[60]`,
                                                isFrozen && 'bg-blue-600',
                                                isLastFrozen && 'border-r-2 border-r-blue-400/60 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]',
                                                col.key === 'photos' && 'text-center',
                                                col.key === 'was_goal_achieved' && 'text-center',
                                                col.key === 'ebrc' && 'min-w-[140px]',
                                                isWide && 'min-w-[200px]',
                                                col.key === 'activities_topics' && 'min-w-[180px]',
                                                col.key === 'therapy_brief' && 'min-w-[200px]',
                                                col.key === 'expected_outcome' && 'min-w-[200px]',
                                                i === 0 && 'rounded-tl-lg',
                                                i === TABLE_COLUMNS.length - 1 && 'rounded-tr-lg',
                                            )}>
                                                {col.label}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 20 }).map((_, i) => {
                                        const isEven = i % 2 === 0;
                                        return (
                                            <tr key={i} className={cn(
                                                'animate-pulse',
                                                isEven ? 'bg-white dark:bg-slate-900/50' : 'bg-slate-50/80 dark:bg-slate-800/30',
                                            )} style={{ animationDelay: `${i * 50}ms` }}>
                                                {TABLE_COLUMNS.map((col, j) => {
                                                    const widths = ['w-8', 'w-24', 'w-20', 'w-14', 'w-24', 'w-16', 'w-28', 'w-20', 'w-12', 'w-32', 'w-20', 'w-32', 'w-32', 'w-16'];
                                                    return (
                                                        <td key={col.key} className="py-3.5 px-4">
                                                            <div className={cn(
                                                                'h-4 rounded-full',
                                                                widths[j] ?? 'w-20',
                                                                j === 0 ? 'h-6 w-8 rounded-full bg-slate-200/80 dark:bg-slate-700/60'
                                                                    : 'bg-gradient-to-r from-slate-200 via-slate-200 to-slate-200 dark:from-slate-700/60 dark:via-slate-600/40 dark:to-slate-700/60',
                                                            )} />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    filteredRows.map((row, index) => {
                                        const isEven = index % 2 === 0;
                                        const rowBg = isEven ? 'bg-white dark:bg-slate-900/50' : 'bg-slate-50/80 dark:bg-slate-800/30';
                                        const frozenBg = isEven ? FROZEN_BG_EVEN : FROZEN_BG_ODD;
                                        return (
                                            <motion.tr
                                                key={row.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                                                className={cn('transition-colors', rowBg, 'hover:bg-violet-50/60 dark:hover:bg-violet-900/20')}
                                            >
                                                {TABLE_COLUMNS.map((col) => {
                                                    const isFrozen = FROZEN_KEYS.has(col.key);
                                                    const frozen = FROZEN_STYLES[col.key];
                                                    const isLastFrozen = col.key === 'district';

                                                    return (
                                                        <td key={col.key} className={cn(
                                                            'py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap',
                                                            'border-b border-slate-100 dark:border-slate-800',
                                                            isFrozen && frozen && `sticky ${frozen.left} ${frozen.width} z-[40]`,
                                                            isFrozen && frozenBg,
                                                            isLastFrozen && 'border-r-2 border-r-slate-200 dark:border-r-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]',
                                                        )}>
                                                            {col.key === 'sl' ? (
                                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-mono">
                                                                    {index + 1}
                                                                </span>
                                                            ) : col.key === 'ebrc' ? (
                                                                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{row.ebrc}</span>
                                                            ) : col.key === 'district' ? (
                                                                row.district
                                                            ) : col.key === 'photos' ? (
                                                                <PhotoCell photos={row.photos} />
                                                            ) : col.key === 'submitted_by_name' ? (
                                                                row.submitted_by_name
                                                            ) : col.key === 'rci_number' ? (
                                                                <span className="font-mono text-slate-600 dark:text-slate-400">{row.rci_number}</span>
                                                            ) : col.key === 'name_of_cwsn' ? (
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">{row.name_of_cwsn}</span>
                                                            ) : col.key === 'type_of_disability' ? (
                                                                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">
                                                                    {row.type_of_disability}
                                                                </Badge>
                                                            ) : col.key === 'gender' ? (
                                                                row.gender
                                                            ) : col.key === 'activities_topics' ? (
                                                                row.activities_topics
                                                            ) : col.key === 'therapy_type' ? (
                                                                row.therapy_type
                                                            ) : col.key === 'therapy_brief' ? (
                                                                row.therapy_brief
                                                            ) : col.key === 'expected_outcome' ? (
                                                                row.expected_outcome
                                                            ) : col.key === 'was_goal_achieved' ? (
                                                                <Badge className={`border-0 text-xs ${row.was_goal_achieved === 'Yes'
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                    : row.was_goal_achieved === 'No'
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                    }`}>
                                                                    {row.was_goal_achieved}
                                                                </Badge>
                                                            ) : null}
                                                        </td>
                                                    );
                                                })}
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Load More Button */}
                {allRows.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent flex justify-center">
                        {hasNextPage ? (
                            <motion.button
                                onClick={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="px-6 py-2.5 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-full transition-all font-medium disabled:opacity-70 shadow-md shadow-violet-500/20 flex items-center gap-2"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                {isFetchingNextPage ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Loading more...
                                    </>
                                ) : (
                                    <>
                                        <motion.span
                                            animate={{ y: [0, 4, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                        >
                                            <ChevronDown className="size-4" />
                                        </motion.span>
                                        Load More
                                        <span className="bg-white/20 text-white font-bold px-2 py-0.5 rounded-full text-xs">
                                            {total - allRows.length}
                                        </span>
                                    </>
                                )}
                            </motion.button>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Showing all {allRows.length} records</p>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
