'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Loader2, Hash, User, School, MapPin, FileText, Calendar, Clock,
    Search, X, ShieldAlert, ClipboardList, FilterX, RefreshCcw, ChevronDown,
} from 'lucide-react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { GoToTopButton } from '@/components/GoToTopButton';
import { DownloadXlsxButton } from '@/components/DownLoadXlxsButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDebounceCallback } from 'usehooks-ts';
import {
    formComplianceFirestore,
    clearComplianceCache,
    type ComplianceFilters,
    type ComplianceResponse,
    type FormType,
    type ComplianceStatus,
} from '@/services/firebase/form-compliance.firestore';
import { useGetDistricts, useGetSchools } from '@/services/user.service';
import { downloadXlsx } from '@/lib/download-xlsx';

// ────────────────────── Constants ──────────────────────

const PAGE_SIZE = 30;

const FORM_TYPES: FormType[] = [
    "ICT", "Library", "Science Lab", "Self Defence",
    "Vocational Education", "KGBV", "NSCBAV",
    "IE School Visit", "IE Home Visit",
];

const ROLE_OPTIONS = [
    { value: "TEACHER", label: "Teacher" },
    { value: "KGBV_WARDEN", label: "KGBV Warden" },
    { value: "NSCBAV_WARDEN", label: "NSCBAV Warden" },
    { value: "IE_RESOURCE_PERSON", label: "IE Resource Person" },
];

const EXPORT_COLUMNS = [
    { key: "user_name", label: "User Name" },
    { key: "role", label: "Role" },
    { key: "school_name", label: "School" },
    { key: "district_name", label: "District" },
    { key: "form_type", label: "Form" },
    { key: "form_window", label: "Form Window" },
    { key: "days_remaining", label: "Days Remaining" },
    { key: "status", label: "Status" },
];

// ────────────────────── Animation Variants ──────────────────────

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
        transition: { delay: Math.min(i * 0.02, 0.3), duration: 0.3, ease: 'easeOut' as const },
    }),
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
    hover: { transition: { duration: 0.2 } },
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// ────────────────────── Helpers ──────────────────────

function formatRole(role: string): string {
    switch (role) {
        case "TEACHER": return "Teacher";
        case "KGBV_WARDEN": return "KGBV Warden";
        case "NSCBAV_WARDEN": return "NSCBAV Warden";
        case "IE_RESOURCE_PERSON": return "IE Resource Person";
        default: return role;
    }
}

function getRoleBadgeClass(role: string): string {
    switch (role) {
        case "TEACHER": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
        case "KGBV_WARDEN": return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25";
        case "NSCBAV_WARDEN": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
        case "IE_RESOURCE_PERSON": return "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/25";
        default: return "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/25";
    }
}

function getFormBadgeClass(formType: string): string {
    switch (formType) {
        case "ICT": return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
        case "Library": return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400";
        case "Science Lab": return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400";
        case "Self Defence": return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
        case "KGBV": return "bg-purple-500/15 text-purple-700 dark:text-purple-400";
        case "NSCBAV": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
        case "IE School Visit": return "bg-teal-500/15 text-teal-700 dark:text-teal-400";
        case "IE Home Visit": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
        default: return "bg-slate-500/15 text-slate-700 dark:text-slate-400";
    }
}

// ────────────────────── Page Component ──────────────────────

export default function FormCompliancePage() {
    // ── Filter state ──
    const [districtFilter, setDistrictFilter] = useState<string>("all");
    const [schoolFilter, setSchoolFilter] = useState<string>("all");
    const [formTypeFilter, setFormTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const searchRef = useRef<HTMLInputElement>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debouncedSetSearch = useDebounceCallback((val: string) => setDebouncedSearch(val), 500);

    // ── Reference data for dropdowns ──
    const { data: districts } = useGetDistricts();
    const activeDistrictId = districtFilter !== "all" ? districtFilter : undefined;
    const { data: schools } = useGetSchools(activeDistrictId);

    const handleDistrictChange = (value: string) => {
        setDistrictFilter(value);
        setSchoolFilter("all");
    };

    // ── Build filters object ──
    const filters: ComplianceFilters = useMemo(() => {
        const f: ComplianceFilters = {};
        if (districtFilter !== "all") f.district_id = districtFilter;
        if (schoolFilter !== "all") f.school_id = schoolFilter;
        if (formTypeFilter !== "all") f.form_type = formTypeFilter as FormType;
        if (statusFilter !== "all") f.status = statusFilter as ComplianceStatus;
        if (roleFilter !== "all") f.role = roleFilter;
        if (debouncedSearch) f.search = debouncedSearch;
        return f;
    }, [districtFilter, schoolFilter, formTypeFilter, statusFilter, roleFilter, debouncedSearch]);

    const hasActiveFilters =
        districtFilter !== "all" ||
        schoolFilter !== "all" ||
        formTypeFilter !== "all" ||
        statusFilter !== "all" ||
        roleFilter !== "all" ||
        !!debouncedSearch || (searchRef.current?.value?.length ?? 0) > 0;

    const clearAllFilters = () => {
        setDistrictFilter("all");
        setSchoolFilter("all");
        setFormTypeFilter("all");
        setStatusFilter("all");
        setRoleFilter("all");
        if (searchRef.current) searchRef.current.value = '';
        setDebouncedSearch('');
        clearComplianceCache();
    };

    // ── Infinite query ──
    const queryKey = ['form-compliance', filters];

    const {
        data,
        isLoading,
        isFetching,
        isFetchingNextPage,
        error,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery<ComplianceResponse>({
        queryKey,
        queryFn: ({ pageParam = null }) =>
            formComplianceFirestore.getAll(PAGE_SIZE, pageParam as string | null, filters),
        getNextPageParam: (lastPage) => {
            if (!lastPage.hasMore) return undefined;
            return lastPage.nextCursor;
        },
        initialPageParam: null as string | null,
        placeholderData: (prev) => prev,
    });

    // Flatten pages
    const allRecords = useMemo(() => {
        return data?.pages.flatMap((page) => page.data) ?? [];
    }, [data]);

    const total = data?.pages[0]?.total ?? 0;

    // Track first load with ref (persists across renders)
    const hasLoadedOnce = useRef(false);
    useEffect(() => {
        if (!isLoading && data !== undefined) hasLoadedOnce.current = true;
    }, [isLoading, data]);

    const showTableOverlay = isFetching && !isFetchingNextPage && hasLoadedOnce.current;

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    // ── Export ──
    const handleExport = async () => {
        const allData = await formComplianceFirestore.fetchAll(filters);
        downloadXlsx(allData, EXPORT_COLUMNS, "Missing_Forms_Report");
    };

    // ── Recompute ──
    const queryClient = useQueryClient();
    const [isRecomputing, setIsRecomputing] = useState(false);
    const handleRecompute = async () => {
        setIsRecomputing(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL || 'http://127.0.0.1:5001';
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project';
            const res = await fetch(`${baseUrl}/${projectId}/us-central1/computeMissingFormsHttp`, { method: 'POST' });
            if (!res.ok) throw new Error('Function call failed');
            clearComplianceCache();
            queryClient.invalidateQueries({ queryKey: ['form-compliance'] });
        } catch (err) {
            console.error('Recompute failed:', err);
        } finally {
            setIsRecomputing(false);
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 bg-linear-to-br from-orange-500 to-red-600 rounded-lg"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Missing Forms</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Track missing form submissions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 px-3 py-1">
                            {total} Records
                        </Badge>
                        <RefreshTableButton
                            queryKey={queryKey}
                            isFetching={isFetching && !isFetchingNextPage}
                        />
                        <motion.button
                            onClick={handleRecompute}
                            disabled={isRecomputing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-md shadow-orange-500/20"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <RefreshCcw className={`h-4 w-4 ${isRecomputing ? 'animate-spin' : ''}`} />
                            {isRecomputing ? 'Recomputing...' : 'Recompute'}
                        </motion.button>
                        <DownloadXlsxButton onDownload={handleExport} disabled={total === 0} />
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg"
                variants={itemVariants}
            >
                <div className="flex flex-col gap-4">
                    {/* Row 1: Search + Clear */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div className="relative flex-1 max-w-md w-full">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                                Search (exact name match)
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Enter full user name..."
                                    defaultValue=""
                                    onChange={(e) => debouncedSetSearch(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                {searchRef.current?.value && (
                                    <button
                                        onClick={() => {
                                            if (searchRef.current) searchRef.current.value = '';
                                            setDebouncedSearch('');
                                        }}
                                        className="absolute right-3 top-1/2 p-2 rounded-full hover:bg-red-500/30 duration-200 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <motion.button
                            onClick={clearAllFilters}
                            className="flex items-center gap-2 px-6 py-2.5 h-[42px] bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all whitespace-nowrap"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FilterX className="h-4 w-4" />
                            Clear
                        </motion.button>
                    </div>

                    {/* Row 2: Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* District */}
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">District</label>
                            <Select value={districtFilter} onValueChange={handleDistrictChange}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="All Districts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Districts</SelectItem>
                                    {districts?.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* School */}
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">School</label>
                            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="All Schools" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Schools</SelectItem>
                                    {schools?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Form Type */}
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Form Type</label>
                            <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="All Forms" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Forms</SelectItem>
                                    {FORM_TYPES.map((ft) => (
                                        <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="Not Submitted">Not Submitted</SelectItem>
                                    <SelectItem value="Overdue">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Role */}
                        <div>
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Role</label>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    {ROLE_OPTIONS.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl relative"
                variants={cardVariants}
            >
                <div className="relative">
                    {/* Refresh blur overlay */}
                    {showTableOverlay && (
                        <div className="absolute inset-0 z-[70] bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refreshing...</span>
                            </div>
                        </div>
                    )}
                    <table className="w-full">
                        <thead>
                            <tr className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <Hash className="h-4 w-4 inline mr-1" /> Sl No.
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <User className="h-4 w-4 inline mr-1" /> User Name
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    Role
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <School className="h-4 w-4 inline mr-1" /> School
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <MapPin className="h-4 w-4 inline mr-1" /> District
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <FileText className="h-4 w-4 inline mr-1" /> Form
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <Calendar className="h-4 w-4 inline mr-1" /> Form Window
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                                    <Clock className="h-4 w-4 inline mr-1" /> Days Remaining
                                </th>
                                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Error state */}
                            {error ? (
                                <tr>
                                    <td colSpan={9} className="py-16 text-center bg-white dark:bg-transparent">
                                        <RetryButton
                                            queryKey={queryKey}
                                            message="Failed to load missing forms data"
                                        />
                                    </td>
                                </tr>
                            ) : /* Initial loading */
                                isLoading && !hasLoadedOnce.current ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                                <span className="text-slate-400">Loading missing forms data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : allRecords.length > 0 ? (
                                        <AnimatePresence mode="popLayout">
                                            {allRecords.map((record, index) => (
                                                <motion.tr
                                                    key={record.id}
                                                    custom={index}
                                                    variants={tableRowVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                    whileHover="hover"
                                                    layout
                                                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                                >
                                                    {/* Sl No */}
                                                    <td className="py-4 px-5">
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    {/* User Name */}
                                                    <td className="py-4 px-5">
                                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                            {record.user_name}
                                                        </span>
                                                    </td>
                                                    {/* Role */}
                                                    <td className="py-4 px-5">
                                                        <Badge variant="outline" className={`text-xs ${getRoleBadgeClass(record.role)}`}>
                                                            {formatRole(record.role)}
                                                        </Badge>
                                                    </td>
                                                    {/* School */}
                                                    <td className="py-4 px-5 text-slate-700 dark:text-slate-300 text-sm max-w-50 truncate">
                                                        {record.role === 'TEACHER' ? record.school_name : <span className="text-slate-400">—</span>}
                                                    </td>
                                                    {/* District */}
                                                    <td className="py-4 px-5 text-slate-700 dark:text-slate-300 text-sm">
                                                        {record.district_name}
                                                    </td>
                                                    {/* Form */}
                                                    <td className="py-4 px-5">
                                                        <Badge className={`${getFormBadgeClass(record.form_type)} border-0 text-xs`}>
                                                            {record.form_type}
                                                        </Badge>
                                                    </td>
                                                    {/* Form Window */}
                                                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                                                        {record.form_window}
                                                    </td>
                                                    {/* Days Remaining */}
                                                    <td className="py-4 px-5">
                                                        <span className={`text-sm font-semibold ${record.days_remaining < 0
                                                            ? 'text-red-500'
                                                            : record.days_remaining <= 3
                                                                ? 'text-orange-500'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                            }`}>
                                                            {record.days_remaining < 0
                                                                ? `${Math.abs(record.days_remaining)}d overdue`
                                                                : `${record.days_remaining}d left`}
                                                        </span>
                                                    </td>
                                                    {/* Status */}
                                                    <td className="py-4 px-5">
                                                        {record.status === "Overdue" ? (
                                                            <Badge className="bg-red-500/20 text-red-500 border-0">
                                                                Overdue
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">
                                                                Not Submitted
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="py-16 text-center bg-white dark:bg-transparent">
                                                <ClipboardList className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                                                <div className="text-slate-600 dark:text-slate-400 text-lg">
                                                    {hasActiveFilters ? 'No matching records found' : 'No missing submissions'}
                                                </div>
                                                <p className="text-slate-500 text-sm mt-2">
                                                    {hasActiveFilters
                                                        ? 'Try adjusting your filters or search criteria'
                                                        : 'All users have submitted their forms on time. Great job!'}
                                                </p>
                                                {hasActiveFilters && (
                                                    <button
                                                        onClick={clearAllFilters}
                                                        className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium"
                                                    >
                                                        Clear all filters
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                        </tbody>
                    </table>
                </div>

                {/* Load More / Record count */}
                {allRecords.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent flex justify-center">
                        {hasNextPage ? (
                            <motion.button
                                onClick={handleLoadMore}
                                disabled={isFetchingNextPage}
                                className="px-6 py-2.5 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-all font-medium disabled:opacity-70 shadow-md shadow-orange-500/20 flex items-center gap-2"
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
                                            {total - allRecords.length}
                                        </span>
                                    </>
                                )}
                            </motion.button>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Showing all {allRecords.length} records
                            </p>
                        )}
                    </div>
                )}
            </motion.div>
            <GoToTopButton />
        </motion.div>
    );
}
