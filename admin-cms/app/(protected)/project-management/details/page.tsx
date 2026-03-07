'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Loader2, FileText, Search, Save, FilterX, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import {
  useGetAllProjectSchools,
  useUpdateProject,
} from '@/services/project-management.service';
import {
  projectManagementFirestore,
  ProjectsResponse,
} from '@/services/firebase/project-management.firestore';
import type { Project, PABYear } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PROJECT_SCHOOL_CATEGORIES,
  PROJECT_ACTIVITIES,
  PAB_YEARS,
} from '@/lib/zod';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

const MONTHS = [
  'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'january', 'february', 'march',
] as const;

const MONTH_LABELS = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
];

type EditableRow = {
  status: string;
  physical: number;
  approved: number;
  civil_cost: number;
  contingency: number;
  april: number; may: number; june: number; july: number;
  august: number; september: number; october: number; november: number;
  december: number; january: number; february: number; march: number;
  balance: number;
  remarks: string;
  contractor: string;
};

const PAGE_SIZE = 20;

// ─── Photo Viewer Dialog ───────────────────────────────────────────────
function ProjectPhotoDialog({ photos, open, onOpenChange }: { photos: string[]; open: boolean; onOpenChange: (o: boolean) => void }) {
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

function ProjectPhotoCell({ photos }: { photos: string[] }) {
    const [open, setOpen] = useState(false);
    if (!photos?.length) return <span className="text-slate-400">—</span>;
    return (
        <>
            <button onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                <ImageIcon className="h-3.5 w-3.5" />
                View ({photos.length})
            </button>
            <ProjectPhotoDialog photos={photos} open={open} onOpenChange={setOpen} />
        </>
    );
}

export default function ProjectDetailsPage() {
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [pabYearFilter, setPabYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');

  // Editable state: Map of project id -> edited fields
  const [edits, setEdits] = useState<Map<string, Partial<EditableRow>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Server-side filtered & paginated query
  const {
    data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage,
  } = useInfiniteQuery<ProjectsResponse>({
    queryKey: ['projects', PAGE_SIZE, pabYearFilter, activityFilter, districtFilter, categoryFilter, statusFilter],
    queryFn: ({ pageParam }) =>
      projectManagementFirestore.getProjects(
        PAGE_SIZE,
        pageParam as string | null,
        pabYearFilter !== 'all' ? pabYearFilter : undefined,
        activityFilter !== 'all' ? activityFilter : undefined,
        districtFilter !== 'all' ? districtFilter : undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
      ),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    initialPageParam: null as string | null,
    placeholderData: (prev) => prev,
  });

  const allProjects = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const { data: projectSchools = [], isLoading: schoolsLoading } = useGetAllProjectSchools();
  const updateMutation = useUpdateProject();

  // Build EBRC map from project schools
  const ebrcMap = useMemo(() => {
    const map = new Map<string, string>();
    projectSchools.forEach((s) => map.set(s.udise_code, s.ebrc));
    return map;
  }, [projectSchools]);

  // Get unique districts
  const districts = useMemo(() => {
    const set = new Set<string>();
    projectSchools.forEach((s) => set.add(s.district_name));
    return Array.from(set).sort();
  }, [projectSchools]);

  // Client-side text search only (Firestore cannot do substring search)
  const filteredProjects = useMemo(() => {
    if (!searchInput.trim()) return allProjects;
    const q = searchInput.toLowerCase();
    return allProjects.filter(
      (p) =>
        p.school_name.toLowerCase().includes(q) ||
        p.udise_code.includes(q) ||
        p.activity.toLowerCase().includes(q),
    );
  }, [allProjects, searchInput]);

  // Infinite scroll: observe sentinel element
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Get the current value (edited or original)
  const getValue = useCallback(
    (project: Project, field: keyof EditableRow) => {
      const edited = edits.get(project.id);
      if (edited && field in edited) return edited[field];
      return project[field as keyof Project];
    },
    [edits],
  );

  // Set an edit
  const setEdit = useCallback(
    (projectId: string, field: keyof EditableRow, value: string | number) => {
      setEdits((prev) => {
        const next = new Map(prev);
        const existing = next.get(projectId) || {};
        next.set(projectId, { ...existing, [field]: value });
        return next;
      });
    },
    [],
  );

  // Compute total spent for a project (considering edits)
  const getTotalSpent = useCallback(
    (project: Project) => {
      let sum = 0;
      for (const month of MONTHS) {
        const val = getValue(project, month);
        sum += typeof val === 'number' ? val : 0;
      }
      return sum;
    },
    [getValue],
  );

  // Compute % utilized
  const getPercentUtilized = useCallback(
    (project: Project) => {
      const approved = (getValue(project, 'approved') as number) || 0;
      if (approved <= 0) return 0;
      const spent = getTotalSpent(project);
      return Math.min(100, Math.round((spent / approved) * 100));
    },
    [getValue, getTotalSpent],
  );

  // Submit all edits
  const handleSubmitAll = async () => {
    if (edits.size === 0) return;
    setIsSaving(true);
    try {
      const promises = Array.from(edits.entries()).map(([projectId, updates]) =>
        updateMutation.mutateAsync({ projectId, updates }),
      );
      await Promise.all(promises);
      setEdits(new Map());
      showSuccessToast(`Updated ${edits.size} project(s) successfully`);
    } catch {
      showErrorToast('Failed to save some updates');
    } finally {
      setIsSaving(false);
    }
  };

  const hasEdits = edits.size > 0;

  // Progress bar color helper
  const getProgressColor = (pct: number) => {
    if (pct >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
    if (pct >= 40) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
    return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' };
  };

  return (
    <motion.div className="space-y-6 p-2" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-linear-to-br from-amber-500 to-orange-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Project Details</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">View and edit project financial data</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleSubmitAll}
              disabled={!hasEdits || isSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${isSaving
                ? 'bg-emerald-600/50 text-white/70 cursor-not-allowed opacity-50'
                : hasEdits
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                }`}
              whileHover={hasEdits && !isSaving ? { scale: 1.02 } : {}}
              whileTap={hasEdits && !isSaving ? { scale: 0.98 } : {}}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Updating...' : <>Submit &amp; Update {hasEdits && `(${edits.size})`}</>}
            </motion.button>
            <RefreshTableButton queryKey={['projects', PAGE_SIZE, pabYearFilter, activityFilter, districtFilter, categoryFilter, statusFilter]} isFetching={isFetching && !isFetchingNextPage} />
          </div>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-col lg:flex-row gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by school, UDISE, or activity..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>
          {/* District */}
          <div className="w-44">
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Category */}
          <div className="w-44">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PROJECT_SCHOOL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Activity */}
          <div className="w-52">
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {PROJECT_ACTIVITIES.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* PAB Year */}
          <div className="w-40">
            <Select value={pabYearFilter} onValueChange={setPabYearFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {PAB_YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Status */}
          <div className="w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Clear */}
          <motion.button
            onClick={() => {
              setDistrictFilter('all');
              setCategoryFilter('all');
              setActivityFilter('all');
              setPabYearFilter('all');
              setStatusFilter('all');
              setSearchInput('');
            }}
            className="flex items-center gap-2 px-5 py-3 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FilterX className="h-4 w-4" />
            Clear
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-600/90 text-white hover:bg-blue-600/90 px-3 py-1">
            {filteredProjects.length}{total > allProjects.length ? ` of ${total}` : ''} Projects
          </Badge>
          {hasEdits && (
            <Badge className="bg-amber-500/90 text-white hover:bg-amber-500/90 px-3 py-1 animate-pulse">
              {edits.size} Unsaved Changes
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        {isLoading || schoolsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <span className="text-slate-400">Loading project details...</span>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="relative">
            {/* Refreshing overlay - centered in visible area, above blurred rows but below header */}
            {isFetching && !isFetchingNextPage && (
              <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 px-6 py-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Refreshing...</span>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-max min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-50">
                  <tr className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white">
                    {/* Frozen info columns */}
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-0 bg-blue-700 dark:bg-blue-800 z-[60] w-[40px]">Sl.</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-[40px] bg-blue-700 dark:bg-blue-800 z-[60] w-[80px] border-l border-blue-500/50">District</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-[120px] bg-blue-700 dark:bg-blue-800 z-[60] w-[70px] border-l border-blue-500/50">EBRC</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-[190px] bg-blue-700 dark:bg-blue-800 z-[60] w-[90px] border-l border-blue-500/50">UDISE</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-[280px] bg-blue-700 dark:bg-blue-800 z-[60] w-[160px] min-w-[160px] border-l border-blue-500/50">Activity</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-[440px] bg-blue-700 dark:bg-blue-800 z-[60] w-[180px] min-w-[180px] border-l border-blue-500/50">School Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs whitespace-nowrap sticky left-[620px] bg-blue-700 dark:bg-blue-800 z-[60] w-[80px] border-l border-blue-500/50 border-r-2 border-r-blue-400">PAB Year</th>
                    {/* Editable columns */}
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-emerald-700/80 min-w-[140px]">Progress</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Photos</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-emerald-700/80 min-w-[140px]">% Utilized</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Physical</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Approved</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Civil Cost</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Contingency</th>
                    {/* Monthly columns */}
                    {MONTH_LABELS.map((m) => (
                      <th key={m} className="text-center py-3 px-3 font-semibold text-xs whitespace-nowrap bg-blue-600/60 dark:bg-blue-700/60">{m}</th>
                    ))}
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80">Balance</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80 min-w-[180px]">Remarks</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs whitespace-nowrap bg-blue-600/80 dark:bg-blue-700/80 min-w-[180px]">Contractor</th>
                  </tr>
                </thead>
                <tbody className={isFetching && !isFetchingNextPage ? 'blur-[2px] opacity-50 pointer-events-none transition-all duration-300' : 'transition-all duration-300'}>
                  {filteredProjects.map((project, index) => {
                    const isEdited = edits.has(project.id);
                    const pct = getPercentUtilized(project);
                    const colors = getProgressColor(pct);
                    return (
                      <tr
                        key={project.id}
                        className={`[&>td]:border-b [&>td]:border-slate-300 dark:[&>td]:border-slate-700 transition-colors text-sm ${isEdited
                          ? 'bg-amber-50/50 dark:bg-amber-900/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          }`}
                      >
                        {/* Frozen info columns */}
                        <td className={`py-3 px-4 sticky left-0 z-10 w-[40px] ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">{index + 1}</span>
                        </td>
                        <td className={`py-3 px-4 text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap sticky left-[40px] z-10 w-[80px] border-l border-slate-300 dark:border-slate-700 ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>{project.district_name}</td>
                        <td className={`py-3 px-4 text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap sticky left-[120px] z-10 w-[70px] border-l border-slate-300 dark:border-slate-700 ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>{ebrcMap.get(project.udise_code) || '—'}</td>
                        <td className={`py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap sticky left-[190px] z-10 w-[90px] border-l border-slate-300 dark:border-slate-700 ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>{project.udise_code}</td>
                        <td className={`py-3 px-4 text-xs text-slate-700 dark:text-slate-300 sticky left-[280px] z-10 w-[160px] min-w-[160px] border-l border-slate-300 dark:border-slate-700 ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>{project.activity}</td>
                        <td className={`py-3 px-4 text-xs text-blue-600 dark:text-blue-400 font-medium sticky left-[440px] z-10 w-[180px] min-w-[180px] border-l border-slate-300 dark:border-slate-700 ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>{project.school_name}</td>
                        <td className={`py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap sticky left-[620px] z-10 w-[80px] border-l border-slate-300 dark:border-slate-700 border-r-2 border-r-slate-400 dark:border-r-slate-600 ${isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'}`}>{project.pab_year}</td>

                        {/* Status dropdown - color coded */}
                        <td className="py-2 px-2 text-center">
                          {(() => {
                            const statusVal = getValue(project, 'status') as string;
                            const statusColors: Record<string, string> = {
                              'Not Started': 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400',
                              'In Progress': 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              'Completed': 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                            };
                            return (
                              <select
                                value={statusVal}
                                onChange={(e) => setEdit(project.id, 'status', e.target.value)}
                                className={`w-full text-xs px-2 py-1.5 rounded-lg border font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer ${statusColors[statusVal] || 'border-slate-200 bg-white text-slate-700'}`}
                              >
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            );
                          })()}
                        </td>

                        {/* Progress (read-only, set by Junior Engineer) */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex flex-col items-center gap-1 min-w-[110px]">
                            <span className={`text-xs font-bold ${project.progress >= 75 ? 'text-emerald-600 dark:text-emerald-400' : project.progress >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{project.progress}%</span>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${project.progress >= 75 ? 'bg-emerald-500' : project.progress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Photos (read-only, set by Junior Engineer) */}
                        <td className="py-2 px-2 text-center">
                          <ProjectPhotoCell photos={project.photos} />
                        </td>

                        {/* Progress bar + % Utilized */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex flex-col items-center gap-1 min-w-[110px]">
                            <span className={`text-xs font-bold ${colors.text}`}>{pct}%</span>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {getTotalSpent(project).toFixed(1)} / {((getValue(project, 'approved') as number) || 0).toFixed(1)}
                            </span>
                          </div>
                        </td>

                        {/* Numeric inputs: physical, approved, civil_cost, contingency */}
                        {(['physical', 'approved', 'civil_cost', 'contingency'] as const).map((field) => {
                          const val = getValue(project, field);
                          const displayVal = val === 0 || val === '0' ? '' : String(val);
                          return (
                            <td key={field} className="py-2 px-2 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={displayVal}
                                onChange={(e) => setEdit(project.id, field, e.target.value === '' ? 0 : e.target.value as any)}
                                onBlur={(e) => setEdit(project.id, field, parseFloat(e.target.value) || 0)}
                                className="w-20 text-xs text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </td>
                          );
                        })}

                        {/* Monthly inputs */}
                        {MONTHS.map((month) => {
                          const val = getValue(project, month);
                          const displayVal = val === 0 || val === '0' ? '' : String(val);
                          return (
                            <td key={month} className="py-2 px-1 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={displayVal}
                                onChange={(e) => setEdit(project.id, month, e.target.value === '' ? 0 : e.target.value as any)}
                                onBlur={(e) => setEdit(project.id, month, parseFloat(e.target.value) || 0)}
                                className="w-16 text-xs text-center px-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </td>
                          );
                        })}

                        {/* Balance */}
                        <td className="py-2 px-2 text-center">
                          {(() => {
                            const val = getValue(project, 'balance');
                            const displayVal = val === 0 || val === '0' ? '' : String(val);
                            return (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={displayVal}
                                onChange={(e) => setEdit(project.id, 'balance', e.target.value === '' ? 0 : e.target.value as any)}
                                onBlur={(e) => setEdit(project.id, 'balance', parseFloat(e.target.value) || 0)}
                                className="w-20 text-xs text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            );
                          })()}
                        </td>

                        {/* Remarks */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={getValue(project, 'remarks') as string}
                            onChange={(e) => setEdit(project.id, 'remarks', e.target.value)}
                            placeholder="Remarks"
                            className="w-40 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                          />
                        </td>

                        {/* Contractor */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={getValue(project, 'contractor') as string}
                            onChange={(e) => setEdit(project.id, 'contractor', e.target.value)}
                            placeholder="Contractor"
                            className="w-40 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More / Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-transparent">
              {hasNextPage ? (
                <motion.button
                  onClick={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all font-medium disabled:opacity-70 border border-blue-500/30"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-5 text-blue-500 animate-spin" />
                      Loading more...
                    </span>
                  ) : (
                    `Load More (${total - allProjects.length} remaining)`
                  )}
                </motion.button>
              ) : (
                <p className="text-center text-sm text-slate-500">Showing all {allProjects.length} records</p>
              )}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />
          </div>
        ) : (
          <div className="py-16 text-center">
            <FileText className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
            <div className="text-slate-600 dark:text-slate-400 text-lg">No project details found</div>
            <p className="text-slate-500 text-sm mt-2">
              {searchInput ? 'Try adjusting your search criteria' : 'Create some projects first'}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
