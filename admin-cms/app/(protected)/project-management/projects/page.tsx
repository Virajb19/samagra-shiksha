'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Loader2, FolderKanban, AlertTriangle, Search, FilterX } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
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
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RetryButton } from '@/components/RetryButton';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import {
  useGetAllProjectSchools,
  useCreateProject,
  useDeleteProject,
} from '@/services/project-management.service';
import {
  projectManagementFirestore,
  ProjectsResponse,
} from '@/services/firebase/project-management.firestore';
import {
  projectFormSchema,
  type ProjectFormValues,
  PROJECT_SCHOOL_CATEGORIES,
  PROJECT_ACTIVITIES,
  PAB_YEARS,
} from '@/lib/zod';
import type { ProjectSchoolCategory, ProjectActivity, PABYear } from '@/types';

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
    opacity: 1, x: 0,
    transition: { delay: Math.min(i * 0.02, 0.3), duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const [pabYearFilter, setPabYearFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');

  // Fetch all project schools for the UDISE dropdown
  const { data: projectSchools = [] } = useGetAllProjectSchools();

  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const {
    data, isLoading, isFetching, isFetchingNextPage, error, hasNextPage, fetchNextPage,
  } = useInfiniteQuery<ProjectsResponse>({
    queryKey: ['projects', PAGE_SIZE, pabYearFilter, activityFilter],
    queryFn: ({ pageParam }) =>
      projectManagementFirestore.getProjects(
        PAGE_SIZE, pageParam as string | null,
        pabYearFilter !== 'all' ? pabYearFilter : undefined,
        activityFilter !== 'all' ? activityFilter : undefined,
      ),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    initialPageParam: null as string | null,
    placeholderData: (prev) => prev,
  });

  const allProjects = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (allProjects.length > 0 || (!isLoading && data)) hasLoadedOnce.current = true;
  }, [allProjects.length, isLoading, data]);

  const isSubmittingRef = useRef(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      udise_code: '',
      pab_year: '2025 - 2026',
      category: '',
      activity: '',
      contractor: '',
    },
  });

  const selectedSchoolId = form.watch('udise_code'); // reusing udise_code field to store school id
  const selectedSchool = projectSchools.find((s) => s.id === selectedSchoolId);

  // Filter project schools by search term
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return projectSchools;
    const q = schoolSearch.toLowerCase();
    return projectSchools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.udise_code.includes(q) || s.district_name.toLowerCase().includes(q),
    );
  }, [projectSchools, schoolSearch]);

  const onSubmit = async (values: ProjectFormValues) => {
    if (isSubmittingRef.current || !selectedSchool) return;
    isSubmittingRef.current = true;
    try {
      await createMutation.mutateAsync({
        project_school_id: selectedSchool.id,
        school_name: selectedSchool.name,
        district_name: selectedSchool.district_name,
        udise_code: selectedSchool.udise_code,
        pab_year: values.pab_year as PABYear,
        category: values.category as ProjectSchoolCategory,
        activity: values.activity as ProjectActivity,
        contractor: values.contractor || undefined,
      });
      form.reset();
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = () => {
    if (!deleteProjectId) return;
    deleteMutation.mutate(deleteProjectId, {
      onSuccess: () => {
        showSuccessToast('Project deleted successfully!');
        setDeleteProjectId(null);
      },
      onError: () => {
        showErrorToast('Failed to delete project. Please try again.');
        setDeleteProjectId(null);
      },
    });
  };

  return (
    <motion.div className="space-y-8 p-2" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-linear-to-br from-violet-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FolderKanban className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add / View Projects</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage construction and infrastructure projects</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshTableButton queryKey={['projects', PAGE_SIZE, pabYearFilter, activityFilter]} isFetching={isFetching && !isFetchingNextPage} />
          </div>
        </div>
      </motion.div>

      {/* Create Project Form */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Create Project</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Row 1: School (searchable), UDISE (auto), District (auto), PAB Year */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="udise_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      School / Hostel <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); setSchoolSearch(''); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select School / Hostel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="px-2 pb-2 pt-1 sticky top-0 bg-white dark:bg-slate-900">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search schools..."
                              value={schoolSearch}
                              onChange={(e) => setSchoolSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {filteredSchools.length > 0 ? (
                          filteredSchools.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.udise_code})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-4 text-center text-sm text-slate-400">No schools found</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  UDISE / Hostel ID
                </label>
                <Input
                  readOnly
                  value={selectedSchool?.udise_code ?? ''}
                  placeholder="Auto-filled"
                  className="px-4 py-3 h-12 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  District
                </label>
                <Input
                  readOnly
                  value={selectedSchool?.district_name ?? ''}
                  placeholder="Auto-filled"
                  className="px-4 py-3 h-12 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <FormField
                control={form.control}
                name="pab_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      PAB Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select PAB Year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAB_YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Category, Activity, Contractor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      Category <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_SCHOOL_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      Select Activity <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select Activity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_ACTIVITIES.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      Contractor
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter Contractor's Name"
                        className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={form.formState.isSubmitting || !selectedSchool}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Creating...
                </span>
              ) : (
                'Submit'
              )}
            </motion.button>
          </form>
        </Form>
      </motion.div>

      {/* View Projects */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">View Projects</h2>
          <Badge className="bg-blue-600/90 text-white hover:bg-blue-600/90 px-3 py-1">
            {total} Total Records
          </Badge>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Select value={pabYearFilter} onValueChange={setPabYearFilter}>
              <SelectTrigger className="px-4 py-3 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                <SelectValue placeholder="All PAB Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PAB Years</SelectItem>
                {PAB_YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="px-4 py-3 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
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
          <motion.button
            onClick={() => { setPabYearFilter('all'); setActivityFilter('all'); }}
            className="flex items-center gap-2 px-6 py-3 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FilterX className="h-4 w-4" />
            Clear
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white">
                <th className="text-left py-4 px-5 font-semibold text-sm">Sl No.</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">School</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">District</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">UDISE</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">Activity</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">Contractor</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">PAB Year</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center bg-white dark:bg-transparent">
                    <RetryButton queryKey={['projects']} message="Failed to load projects" />
                  </td>
                </tr>
              ) : isLoading && !hasLoadedOnce.current ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                      <span className="text-slate-400">Loading projects...</span>
                    </div>
                  </td>
                </tr>
              ) : ((isLoading && hasLoadedOnce.current) || (isFetching && !isFetchingNextPage)) ? (
                <TableRowsSkeleton rows={10} columns={8} />
              ) : allProjects.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {allProjects.map((project, index) => (
                    <motion.tr
                      key={project.id}
                      custom={index}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{project.school_name}</span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{project.district_name}</td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                          {project.udise_code}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{project.activity}</td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{project.contractor || '—'}</td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{project.pab_year}</td>
                      <td className="py-4 px-5">
                        <motion.button
                          onClick={() => setDeleteProjectId(project.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center bg-white dark:bg-transparent">
                    <FolderKanban className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                    <div className="text-slate-600 dark:text-slate-400 text-lg">No projects found</div>
                    <p className="text-slate-500 text-sm mt-2">Create a project using the form above</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {allProjects.length > 0 && (
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
        )}
      </motion.div>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete the project for{' '}
              <span className="font-semibold text-slate-800 font-bold dark:text-slate-200">
                {allProjects.find(p => p.id === deleteProjectId)?.school_name ?? 'this project'}
              </span>
              ? This action cannot be undone and will permanently remove the project record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
