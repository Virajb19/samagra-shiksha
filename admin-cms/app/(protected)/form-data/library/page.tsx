'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { DownloadXlsxButton } from '@/components/DownLoadXlxsButton';
import {
    FileSpreadsheet,
    ClipboardList,
    ExternalLink,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle,
    FilterX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchLibraryFormDataPage, clearLibraryFormDataCursorCache, fetchAllLibraryFormData, type LibraryFormDataRow } from '@/services/firebase/library-form-data.client';
import { downloadXlsx } from '@/lib/download-xlsx';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// ────────────────────── Constants ──────────────────────

const PAGE_SIZE = 20;

const DISTRICTS = [
    'Chumukedima', 'Dimapur', 'Kohima', 'Mokokchung', 'Mon',
    'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto',
    'Longleng', 'Kiphire', 'Noklak', 'Shamator', 'Tseminyu', 'Niuland',
];

const LIBRARY_COLUMNS = [
    { key: 'school', label: 'School' },
    { key: 'district', label: 'District' },
    { key: 'udise', label: 'UDISE' },
    { key: 'submitted_by_name', label: 'Submitted By' },
    { key: 'is_library_available', label: 'Library Available?' },
    { key: 'is_child_friendly', label: 'Child Friendly?' },
    { key: 'has_proper_furniture', label: 'Proper Furniture?' },
    { key: 'has_management_committee', label: 'Management Committee?' },
    { key: 'library_teacher_name', label: 'Library Teacher' },
    { key: 'has_reading_corner', label: 'Reading Corner?' },
    { key: 'number_of_reading_corners', label: 'No. of Reading Corners' },
    { key: 'number_of_computers', label: 'No. of Computers' },
    { key: 'has_readers_club', label: 'Readers Club?' },
    { key: 'has_weekly_library_period', label: 'Weekly Library Period?' },
    { key: 'library_periods_per_week', label: 'Periods / Week' },
    { key: 'received_books_from_samagra', label: 'Received Books?' },
    { key: 'number_of_books_received', label: 'No. of Books Received' },
    { key: 'innovative_initiative', label: 'Innovative Initiative' },
    { key: 'suggestions_feedback', label: 'Suggestions / Feedback' },
    { key: 'student_photos', label: 'Student Photos' },
    { key: 'logbook_photos', label: 'Logbook Photos' },
];

const ALL_COLUMNS = [{ key: 'sl', label: 'Sl No.' }, ...LIBRARY_COLUMNS];

// Frozen / sticky column config
const FROZEN_KEYS = new Set(['sl', 'school', 'district', 'udise']);
const FROZEN_STYLES: Record<string, { width: string; left: string }> = {
    sl: { width: 'w-[60px] min-w-[60px]', left: 'left-0' },
    school: { width: 'w-[200px] min-w-[200px]', left: 'left-[60px]' },
    district: { width: 'w-[160px] min-w-[160px]', left: 'left-[260px]' },
    udise: { width: 'w-[120px] min-w-[120px]', left: 'left-[420px]' },
};
const FROZEN_BG_EVEN = 'bg-white dark:bg-slate-900';
const FROZEN_BG_ODD = 'bg-slate-50 dark:bg-slate-800';

// Animation variants
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const cardVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const tableRowVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } };

// ────────────────────── Photo Viewer Dialog ──────────────────────

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

// ────────────────────── Photo Cell ──────────────────────

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

// ────────────────────── Cell Renderer ──────────────────────

function renderCell(key: string, row: Record<string, unknown>) {
    const value = row[key];
    if (Array.isArray(value)) return <PhotoCell photos={value as string[]} />;
    if (typeof value === 'string' && value.startsWith('http')) {
        return <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"><ExternalLink className="h-3.5 w-3.5" /> View</a>;
    }
    if (typeof value === 'string' && (value === 'Yes' || value === 'No')) {
        return <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', value === 'Yes' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>{value}</span>;
    }
    if (!value || (typeof value === 'string' && !value.trim())) return <span className="text-slate-400">—</span>;
    return String(value);
}

// ────────────────────── Page Component ──────────────────────

export default function LibraryFormDataPage() {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [district, setDistrict] = useState<string>('all');
    const [date, setDate] = useState<string>('');

    const activeDistrict = district !== 'all' ? district : undefined;
    const activeDate = date || undefined;
    const hasFilters = district !== 'all' || !!date;

    // Reset page & cursor cache when filters change
    useEffect(() => { clearLibraryFormDataCursorCache(); setCurrentPage(1); }, [district, date]);

    const {
        data, isLoading, isFetching, isError, refetch, isPlaceholderData,
    } = useQuery({
        queryKey: ['library-form-data', currentPage, activeDistrict, activeDate],
        queryFn: () => fetchLibraryFormDataPage(currentPage, activeDistrict, activeDate),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const currentPageData = data?.rows ?? [];
    const totalCount = data?.totalCount ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const hasData = currentPageData.length > 0;
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage >= totalPages;

    const hasLoadedOnce = useRef(false);
    useEffect(() => { if (!isLoading && hasData) hasLoadedOnce.current = true; }, [isLoading, hasData]);
    const showTableOverlay = isFetching && hasLoadedOnce.current;

    const goToNextPage = () => { if (!isLastPage) setCurrentPage(p => p + 1); };
    const goToPrevPage = () => { if (!isFirstPage) setCurrentPage(p => p - 1); };

    // Prefetch next page in the background
    useEffect(() => {
        if (currentPage < totalPages) {
            queryClient.prefetchQuery({
                queryKey: ['library-form-data', currentPage + 1, activeDistrict, activeDate],
                queryFn: () => fetchLibraryFormDataPage(currentPage + 1, activeDistrict, activeDate),
            });
        }
    }, [currentPage, totalPages, activeDistrict, activeDate, queryClient]);

    return (
        <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" variants={itemVariants}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <FileSpreadsheet className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Library Form Data</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">View submitted form data for Library</p>
                        </div>
                    </div>
                    <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-3 py-1 text-sm font-medium rounded-full">
                        {totalCount} submissions
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <RefreshTableButton queryKey={['library-form-data', currentPage, activeDistrict, activeDate]} isFetching={isFetching} />
                    <DownloadXlsxButton onDownload={async () => { const rows = await fetchAllLibraryFormData(activeDistrict, activeDate); downloadXlsx(rows, LIBRARY_COLUMNS, 'Library_Form_Data'); }} disabled={!hasData} />
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg"
                variants={itemVariants}
            >
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Published Date</label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">District</label>
                        <Select value={district} onValueChange={setDistrict}>
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder="All Districts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Districts</SelectItem>
                                {DISTRICTS.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <button
                        onClick={() => { setDistrict('all'); setDate(''); }}
                        disabled={!hasFilters}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors text-sm"
                    >
                        <FilterX className="h-4 w-4" />
                        Clear
                    </button>
                </div>
            </motion.div>

            {/* Loading state */}
            {isLoading && (
                <motion.div
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl py-20"
                    variants={cardVariants}
                >
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        <span className="text-slate-500 dark:text-slate-400 text-base">Loading Library form data...</span>
                    </div>
                </motion.div>
            )}

            {/* Error state */}
            {!isLoading && isError && (
                <motion.div
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl py-20"
                    variants={cardVariants}
                >
                    <div className="flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="h-12 w-12 text-red-400" />
                        <div className="text-red-500 text-lg font-medium">Failed to load data</div>
                        <p className="text-slate-400 text-sm">Something went wrong. Please try again.</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 gap-1.5 text-blue-600 border-blue-300">
                            <Loader2 className="h-4 w-4" /> Retry
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Table Card */}
            {!isLoading && !isError && (
                <motion.div
                    className="relative bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Refresh blur overlay */}
                    {showTableOverlay && (
                        <div className="absolute inset-0 z-[70] bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refreshing...</span>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-max min-w-full border-separate border-spacing-0">
                            <thead className="sticky top-0 z-50">
                                <tr>
                                    {ALL_COLUMNS.map((col, i) => {
                                        const isFrozen = FROZEN_KEYS.has(col.key);
                                        const frozen = FROZEN_STYLES[col.key];
                                        const isLastFrozen = col.key === 'udise';
                                        return (
                                            <th key={col.key} className={cn(
                                                'py-4 px-5 text-left text-sm font-semibold whitespace-nowrap bg-blue-600 text-white border-b border-blue-500/30',
                                                isFrozen && frozen && `sticky ${frozen.left} ${frozen.width} z-[60]`,
                                                isFrozen && 'bg-blue-600',
                                                isLastFrozen && 'border-r-2 border-r-blue-400/60 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]',
                                                i === 0 && 'rounded-tl-lg',
                                                i === ALL_COLUMNS.length - 1 && 'rounded-tr-lg',
                                            )}>
                                                {col.label}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {hasData && (
                                    <AnimatePresence>
                                        {currentPageData.map((row, rowIdx) => {
                                            const isEven = rowIdx % 2 === 0;
                                            const rowBg = isEven ? 'bg-white dark:bg-slate-900/50' : 'bg-slate-50/80 dark:bg-slate-800/30';
                                            const frozenBg = isEven ? FROZEN_BG_EVEN : FROZEN_BG_ODD;
                                            const r = row as unknown as Record<string, unknown>;
                                            return (
                                                <motion.tr key={row.id ?? rowIdx} variants={tableRowVariants}
                                                    initial="hidden" animate="visible"
                                                    transition={{ delay: Math.min(rowIdx * 0.03, 1) }}
                                                    className={cn('transition-colors', rowBg, 'hover:bg-blue-50/60 dark:hover:bg-blue-900/20')}>
                                                    {ALL_COLUMNS.map((col) => {
                                                        const isFrozen = FROZEN_KEYS.has(col.key);
                                                        const frozen = FROZEN_STYLES[col.key];
                                                        const isLastFrozen = col.key === 'udise';
                                                        return (
                                                            <td key={col.key} className={cn(
                                                                'py-3 px-5 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap',
                                                                'border-b border-slate-100 dark:border-slate-800',
                                                                isFrozen && frozen && `sticky ${frozen.left} ${frozen.width} z-[40]`,
                                                                isFrozen && frozenBg,
                                                                isLastFrozen && 'border-r-2 border-r-slate-200 dark:border-r-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]',
                                                            )}>
                                                                {col.key === 'sl' ? (currentPage - 1) * PAGE_SIZE + rowIdx + 1 : renderCell(col.key, r)}
                                                            </td>
                                                        );
                                                    })}
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                )}

                                {/* Empty state */}
                                {!hasData && (
                                    <tr>
                                        <td colSpan={ALL_COLUMNS.length} className="py-16">
                                            <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                                <ClipboardList className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                                                <div className="text-slate-500 dark:text-slate-400 text-lg">No data found</div>
                                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                                    No form submissions yet. Data will appear when forms are submitted from the mobile app.
                                                </p>
                                            </motion.div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalCount > 0 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Page <span className="font-semibold text-slate-700 dark:text-slate-200">{currentPage}</span> of{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
                                <span className="ml-2 text-slate-400">({totalCount} total)</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={isFirstPage} onClick={goToPrevPage} className="gap-1.5">
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={isLastPage} onClick={goToNextPage} className="gap-1.5">
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
