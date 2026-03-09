'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Loader2, School, Building2, AlertTriangle, ChevronDown, FilterX } from 'lucide-react';
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
import { GoToTopButton } from '@/components/GoToTopButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import {
  useCreateProjectSchool,
  useDeleteProjectSchool,
  useGetDistricts,
} from '@/services/project-management.service';
import {
  projectManagementFirestore,
  ProjectSchoolsResponse,
} from '@/services/firebase/project-management.firestore';
import {
  projectSchoolFormSchema,
  type ProjectSchoolFormValues,
  PROJECT_SCHOOL_CATEGORIES,
  EBRC_OPTIONS,
} from '@/lib/zod';
import type { ProjectSchoolCategory } from '@/types';

// Animation variants
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

export default function ProjectSchoolsPage() {
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteSchoolId, setDeleteSchoolId] = useState<string | null>(null);

  // Districts from master data
  const { data: districts = [] } = useGetDistricts();

  // Mutations
  const createMutation = useCreateProjectSchool();
  const deleteMutation = useDeleteProjectSchool();

  // Cursor-based infinite query
  const {
    data, isLoading, isFetching, isFetchingNextPage, error, hasNextPage, fetchNextPage,
  } = useInfiniteQuery<ProjectSchoolsResponse>({
    queryKey: ['project-schools', PAGE_SIZE, districtFilter, categoryFilter],
    queryFn: ({ pageParam }) =>
      projectManagementFirestore.getProjectSchools(
        PAGE_SIZE,
        pageParam as string | null,
        districtFilter !== 'all' ? districtFilter : undefined,
        categoryFilter !== 'all' ? categoryFilter : undefined,
      ),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    initialPageParam: null as string | null,
    placeholderData: (prev) => prev,
  });

  const allSchools = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (allSchools.length > 0 || (!isLoading && data)) hasLoadedOnce.current = true;
  }, [allSchools.length, isLoading, data]);

  const isSubmittingRef = useRef(false);

  // Shadcn Form with zodResolver
  const form = useForm<ProjectSchoolFormValues>({
    resolver: zodResolver(projectSchoolFormSchema),
    defaultValues: {
      name: '',
      district_id: '',
      category: '',
      udise_code: '',
      ebrc: '',
    },
  });

  const selectedDistrictId = form.watch('district_id');
  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);

  const onSubmit = async (values: ProjectSchoolFormValues) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      await createMutation.mutateAsync({
        name: values.name.trim().toUpperCase(),
        category: values.category as ProjectSchoolCategory,
        district_id: values.district_id,
        district_name: selectedDistrict?.name ?? '',
        udise_code: values.udise_code.trim(),
        ebrc: values.ebrc,
      });
      form.reset();
      showSuccessToast('School added successfully!');
    } catch {
      showErrorToast('Failed to add school. Please try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = () => {
    if (!deleteSchoolId) return;
    deleteMutation.mutate(deleteSchoolId, {
      onSuccess: () => {
        showSuccessToast('School deleted successfully!');
        setDeleteSchoolId(null);
      },
      onError: () => {
        showErrorToast('Failed to delete school. Please try again.');
        setDeleteSchoolId(null);
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
              className="p-2 bg-linear-to-br from-cyan-500 to-blue-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <School className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add / View Schools</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage project schools and hostels</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshTableButton queryKey={['project-schools', PAGE_SIZE, districtFilter, categoryFilter]} isFetching={isFetching && !isFetchingNextPage} />
          </div>
        </div>
      </motion.div>

      {/* Add School Form */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Add Project School</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* School Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-300">
                    School / Hostel Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter School / Hostel Name"
                      className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row: District, Category, UDISE, EBRC */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="district_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      Select District <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      Select Category <span className="text-red-500">*</span>
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
                name="udise_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      UDISE / Hostel ID <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter UDISE / Hostel ID"
                        className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ebrc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">
                      EBRC <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="px-4 py-3 h-12 bg-blue-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                          <SelectValue placeholder="Select EBRC" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[...EBRC_OPTIONS].sort().map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={createMutation.isPending || form.formState.isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Adding...
                </span>
              ) : (
                'Submit'
              )}
            </motion.button>
          </form>
        </Form>
      </motion.div>

      {/* View Schools Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">View Schools</h2>
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
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="px-4 py-3 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
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
          <div className="flex-1">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="px-4 py-3 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
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
          <motion.button
            onClick={() => { setDistrictFilter('all'); setCategoryFilter('all'); }}
            className="flex items-center gap-2 px-6 py-3 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FilterX className="h-4 w-4" />
            Clear
          </motion.button>
        </div>
      </motion.div>

      {/* Schools Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white">
                <th className="text-left py-4 px-5 font-semibold text-sm">Sl No.</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">School / Hostel</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">Category</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">District</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">UDISE / Hostel ID</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">EBRC</th>
                <th className="text-left py-4 px-5 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-white dark:bg-transparent">
                    <RetryButton queryKey={['project-schools']} message="Failed to load schools" />
                  </td>
                </tr>
              ) : isLoading && !hasLoadedOnce.current ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                      <span className="text-slate-400">Loading schools...</span>
                    </div>
                  </td>
                </tr>
              ) : ((isLoading && hasLoadedOnce.current) || (isFetching && !isFetchingNextPage)) ? (
                <TableRowsSkeleton rows={10} columns={7} />
              ) : allSchools.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {allSchools.map((school, index) => (
                    <motion.tr
                      key={school.id}
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
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{school.name}</span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{school.category}</td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{school.district_name}</td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                          {school.udise_code}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{school.ebrc}</td>
                      <td className="py-4 px-5">
                        <motion.button
                          onClick={() => setDeleteSchoolId(school.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-white dark:bg-transparent">
                    <Building2 className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                    <div className="text-slate-600 dark:text-slate-400 text-lg">No schools found</div>
                    <p className="text-slate-500 text-sm mt-2">Add a school using the form above</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {allSchools.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-transparent flex justify-center">
            {hasNextPage ? (
              <motion.button
                onClick={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all font-medium disabled:opacity-70 shadow-md shadow-blue-500/20 flex items-center gap-2"
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
                      {total - allSchools.length}
                    </span>
                  </>
                )}
              </motion.button>
            ) : (
              <p className="text-sm text-slate-500">Showing all {allSchools.length} records</p>
            )}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteSchoolId} onOpenChange={(open) => !open && setDeleteSchoolId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle>Delete School</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800 font-bold dark:text-slate-200">
                {allSchools.find(s => s.id === deleteSchoolId)?.name ?? 'this school'}
              </span>
              ? This action cannot be undone and will permanently remove the school record.
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
      <GoToTopButton />
    </motion.div>
  );
}