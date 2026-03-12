'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RetryButton } from '@/components/RetryButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
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
import {
  Upload,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  Calendar,
  Building2,
  User,
  Users,
  GraduationCap,
  Hash,
  Sparkles,
  FileUp,
  X,
  Search
} from 'lucide-react';
import { circularFirestore, CircularsResponse } from '@/services/firebase/circular.firestore';
import { masterDataFirestore } from '@/services/firebase/master-data.firestore';
import { District, School } from '@/types';
import { DeleteCircularButton } from '@/components/DeleteCircularButton';
import { CircularFormSchema, circularFormSchema } from '@/lib/zod';
import { useAuthStore } from '@/lib/store';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { GoToTopButton } from '@/components/GoToTopButton';
import { useDebounceValue } from 'usehooks-ts';

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
      duration: 0.2
    }
  }),
  hover: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
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

type RecipientType = 'ALL' | 'TEACHERS' | 'HEADMASTERS';

export default function CircularsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isSchoolListExpanded, setIsSchoolListExpanded] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 500);
  const [recipientType, setRecipientType] = useState<RecipientType>('ALL');
  const pageSize = 20;
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  // Ref-based mutex lock to absolutely prevent double submissions
  const isSubmittingRef = useRef(false);

  // Form setup with react-hook-form and zod
  const form = useForm<CircularFormSchema>({
    resolver: zodResolver(circularFormSchema),
    defaultValues: {
      title: '',
      description: '',
      issued_by: '',
      issued_date: new Date().toISOString().split('T')[0],
      effective_date: '',
      district_id: 'all',
      school_ids: [],
    },
  });

  const selectedDistrictId = form.watch('district_id');

  // Fetch circulars with infinite query
  const {
    data,
    isLoading: circularsLoading,
    isFetching: circularsFetching,
    isFetchingNextPage,
    error: circularsError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<CircularsResponse>({
    queryKey: ['circulars', debouncedSearch],
    queryFn: ({ pageParam = null }) => circularFirestore.getAll(pageSize, pageParam as string | null, debouncedSearch || undefined),
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.nextCursor;
    },
    initialPageParam: null as string | null,
  });

  // Flatten all pages into single array
  const allCirculars = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // Get total from first page
  const total = data?.pages[0]?.total ?? 0;

  // Track if initial data has ever been loaded (for showing spinner vs skeleton)
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (allCirculars.length > 0 || (!circularsLoading && data)) {
      hasLoadedOnce.current = true;
    }
  }, [allCirculars.length, circularsLoading, data]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Fetch districts for dropdown
  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ['districts'],
    queryFn: masterDataFirestore.getDistricts,
  });

  // Fetch schools based on selected district
  const { data: schools = [], isFetching: schoolsFetching } = useQuery<School[]>({
    queryKey: ['schools', selectedDistrictId],
    queryFn: () => masterDataFirestore.getSchools(selectedDistrictId !== 'all' ? selectedDistrictId : undefined),
    enabled: !!selectedDistrictId && selectedDistrictId !== 'all',
  });

  // Handle school checkbox toggle
  const handleSchoolToggle = (schoolId: string, checked: boolean) => {
    if (checked) {
      setSelectedSchools([...selectedSchools, schoolId]);
    } else {
      setSelectedSchools(selectedSchools.filter(id => id !== schoolId));
    }
  };

  // Handle select all schools
  const handleSelectAllSchools = (checked: boolean) => {
    if (checked) {
      setSelectedSchools(schools.map(s => s.id));
    } else {
      setSelectedSchools([]);
    }
  };

  // Create circular mutation
  const createCircularMutation = useMutation({
    mutationFn: async (data: CircularFormSchema) => {
      const payload = {
        title: data.title,
        description: data.description,
        issued_by: data.issued_by,
        issued_date: data.issued_date,
        effective_date: data.effective_date || undefined,
        district_id: data.district_id !== 'all' ? data.district_id : undefined,
        school_ids: selectedSchools.length > 0 ? selectedSchools : undefined,
        recipient_type: (selectedSchools.length > 0 && recipientType !== 'ALL')
          ? (recipientType === 'TEACHERS' ? 'TEACHER' as const : 'HEADMASTER' as const)
          : undefined,
      };
      // Pass the real authenticated userId
      return circularFirestore.create(userId || 'unknown', payload, selectedFile || undefined);
    },
    onSuccess: () => {
      // Invalidate all circular queries (matches any query starting with 'circulars')
      queryClient.invalidateQueries({ queryKey: ['circulars'] });
      form.reset();
      setSelectedFile(null);
      setSelectedSchools([]);
      setRecipientType('ALL');
      showSuccessToast('Circular created successfully!');
    },
    onError: (err: any) => {
      console.error('Error creating circular:', err);
      const errorMessage = err?.response?.data?.message || 'Failed to create circular. Please check your inputs and try again.';
      showErrorToast(errorMessage);
    }
  });

  const onSubmit = async (data: CircularFormSchema) => {
    // Ref-based mutex lock - synchronous check prevents ALL race conditions
    if (isSubmittingRef.current || createCircularMutation.isPending) {
      console.log('[CircularsPage] Blocked duplicate submission');
      return;
    }

    isSubmittingRef.current = true;
    try {
      await createCircularMutation.mutateAsync(data);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleViewFile = async (fileUrl: string) => {
    if (fileUrl && fileUrl !== '#') {
      try {
        const resolvedUrl = await circularFirestore.resolveFileUrl(fileUrl);
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Failed to resolve file URL:', err);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      className="space-y-8 p-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Add Circulars Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-6">
          <motion.div
            className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileUp className="h-6 w-6 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Circular</h1>
        </div>

        <motion.div
          className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
          variants={cardVariants}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Circular Title */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        Circular Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a descriptive title for the circular"
                          {...field}
                          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Description */}
              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter detailed description..."
                          {...field}
                          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[100px] focus:border-blue-500 focus:ring-blue-500/20 transition-all resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Issued By and Dates Row */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={itemVariants}
              >
                <FormField
                  control={form.control}
                  name="issued_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-500" />
                        Issued By
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., SEBA, Directorate"
                          {...field}
                          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issued_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        Issued Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white focus:border-blue-500 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effective_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        Effective Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white focus:border-blue-500 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Filters Row */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={itemVariants}
              >
                {/* Select District */}
                <FormField
                  control={form.control}
                  name="district_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        Select District
                      </FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedSchools([]);
                        setSchoolSearch('');
                        setRecipientType('ALL');
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-slate-800/50 border-slate-300 dark:border-blue-500/50 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
                            <SelectValue placeholder="All Districts" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                            All Districts (Global)
                          </SelectItem>
                          {districts.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Circular File */}
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                        <Upload className="h-4 w-4 text-pink-500" />
                        Circular File
                        <span className="text-slate-400 text-xs">(Max 10MB)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <motion.label
                            className={`flex items-center gap-3 h-10 px-4 rounded-lg cursor-pointer transition-all border flex-1 ${selectedFile
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                              : 'bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-400 dark:hover:border-slate-500'
                              }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            {selectedFile ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            <span className="text-sm truncate flex-1">
                              {selectedFile ? selectedFile.name : 'Click to select file (Image/PDF)'}
                            </span>
                            {selectedFile && (
                              <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                Selected
                              </span>
                            )}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSelectedFile(file);
                                onChange(file);
                              }}
                              {...field}
                            />
                          </motion.label>
                          {selectedFile && (
                            <motion.button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                onChange(undefined);
                              }}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="Remove file"
                            >
                              <X className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Multi-Select Schools Section */}
              <AnimatePresence>
                {selectedDistrictId && selectedDistrictId !== 'all' && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-cyan-500" />
                        Select Schools
                        <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs">
                          {selectedSchools.length} selected
                        </span>
                      </label>
                      <div className="flex items-center gap-3">
                        <motion.button
                          type="button"
                          onClick={() => handleSelectAllSchools(selectedSchools.length !== schools.length)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:scale-105 hover:text-blue-500 dark:hover:text-blue-300 font-medium p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-all"
                          whileTap={{ scale: 0.97 }}
                        >
                          {selectedSchools.length === schools.length ? 'Deselect All' : 'Select All'}
                        </motion.button>

                        <motion.button
                          type="button"
                          onClick={() => setIsSchoolListExpanded(!isSchoolListExpanded)}
                          className="flex items-center gap-1 bg-slate-200 dark:bg-white/10 p-2 rounded-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isSchoolListExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Expand
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* School Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search schools by name or code..."
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <motion.div
                      className={`bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 overflow-y-auto transition-all duration-300 ${isSchoolListExpanded ? 'max-h-72' : 'max-h-36'
                        }`}
                      layout
                    >
                      {schoolsFetching ? (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="text-slate-500 text-sm">Loading schools...</span>
                        </div>
                      ) : schools.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4">No schools found in this district</p>
                      ) : (() => {
                        const filteredSchools = schools.filter(school =>
                          school.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
                          school.registration_code?.toLowerCase().includes(schoolSearch.toLowerCase())
                        );
                        return filteredSchools.length === 0 ? (
                          <p className="text-slate-500 text-sm text-center py-4">No schools match your search</p>
                        ) : (
                          <div className="space-y-1">
                            {filteredSchools.slice(0, 50).map((school, index) => (
                              <motion.label
                                key={school.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedSchools.includes(school.id)
                                  ? 'bg-blue-500/10 border border-blue-500/30'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                                  }`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02 }}
                              >
                                <Checkbox
                                  checked={selectedSchools.includes(school.id)}
                                  onCheckedChange={(checked) => handleSchoolToggle(school.id, checked as boolean)}
                                  className="border-slate-400 dark:border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300 text-sm flex-1">{school.name}</span>
                                <span className="text-slate-500 dark:text-slate-500 text-xs font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {school.registration_code}
                                </span>
                              </motion.label>
                            ))}
                            {filteredSchools.length > 50 && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                                Showing 50 of {filteredSchools.length} schools. Use search above to find specific schools.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </motion.div>

                    {selectedSchools.length === 0 && (
                      <motion.p
                        className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        ⚠️ No schools selected. Circular will be sent to all schools in this district.
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recipient Type Selection — shown when schools are selected */}
              <AnimatePresence>
                {selectedSchools.length > 0 && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-500" />
                      Send To
                    </label>
                    <div className="flex items-center gap-2 relative p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                      {/* Sliding indicator */}
                      <motion.div
                        className="absolute inset-y-1 rounded-lg bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600"
                        animate={{
                          x: recipientType === 'ALL' ? '0%'
                            : recipientType === 'TEACHERS' ? '100%'
                              : '200%',
                        }}
                        style={{ width: 'calc(33.333% - 3px)', left: '4px' }}
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      />

                      {/* Everyone */}
                      <button
                        type="button"
                        onClick={() => { setRecipientType('ALL'); }}
                        className={`relative z-10 flex items-center justify-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${recipientType === 'ALL'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <Users className="h-4 w-4" />
                        Everyone
                      </button>

                      {/* Teachers */}
                      <button
                        type="button"
                        onClick={() => setRecipientType('TEACHERS')}
                        className={`relative z-10 flex items-center justify-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${recipientType === 'TEACHERS'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <GraduationCap className="h-4 w-4" />
                        Teachers
                      </button>

                      {/* Headmasters */}
                      <button
                        type="button"
                        onClick={() => { setRecipientType('HEADMASTERS'); }}
                        className={`relative z-10 flex items-center justify-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${recipientType === 'HEADMASTERS'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <User className="h-4 w-4" />
                        Headmasters
                      </button>
                    </div>

                    {/* Recipient info message */}
                    <motion.p
                      className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/30 rounded-lg p-2.5 flex items-center gap-2"
                      key={recipientType}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      {recipientType === 'ALL' && 'Circular will be sent to all faculty members at selected schools.'}
                      {recipientType === 'HEADMASTERS' && 'Circular will be sent only to headmasters of the selected schools.'}
                      {recipientType === 'TEACHERS' && 'Circular will be sent to all teachers at the selected schools.'}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info message for global circulars */}
              <AnimatePresence>
                {(!selectedDistrictId || selectedDistrictId === 'all') && (
                  <motion.p
                    className="text-blue-400 text-xs bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Sparkles className="h-4 w-4 fill-blue-400" />
                    No district selected. This circular will be visible to all faculty members across all schools.
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || createCircularMutation.isPending}
                  className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-6 text-lg font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {(form.formState.isSubmitting || createCircularMutation.isPending) ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Circular...
                    </motion.div>
                  ) : (
                    <motion.div
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Send className="h-5 w-5" />
                      Create & Send Circular
                    </motion.div>
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>
        </motion.div>
      </motion.div>

      {/* View Circulars Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-linear-to-br from-emerald-500 to-teal-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText className="h-6 w-6 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">All Circulars</h2>
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm">
              {total} total
            </span>
            <RefreshTableButton queryKey={['circulars', debouncedSearch]} isFetching={circularsFetching && !isFetchingNextPage} />
          </div>

          {/* Search Input */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Enter title or circular number..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setDebouncedSearch(e.target.value);
              }}
              className="pl-10 pr-10 bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4 hover:text-red-500" />
              </button>
            )}
          </div>
        </div>

        <motion.div
          className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl relative"
          variants={cardVariants}
        >
          {/* Show spinner only on first ever load */}
          {circularsLoading && !hasLoadedOnce.current ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-10 w-10 text-blue-500" />
              </motion.div>
              <span className="text-slate-400">Loading circulars...</span>
            </div>
          ) : circularsError ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <RetryButton queryKey={['circulars', debouncedSearch]} message="Failed to load circulars" />
            </motion.div>
          ) : allCirculars.length === 0 && !circularsFetching ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <FileText className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
              <div className="text-slate-500 dark:text-slate-400 text-lg">No circulars found</div>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">{debouncedSearch ? 'Try adjusting your search' : 'Create your first circular above'}</p>
            </motion.div>
          ) : (
            <div>
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 border-b border-blue-500/30">
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                      <Hash className="h-4 w-4 inline mr-1" />
                      Sl No.
                    </th>
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Circular No.</th>
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">Title</th>
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                      <User className="h-4 w-4 inline mr-1" />
                      Issued By
                    </th>
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date
                    </th>
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">File</th>
                    <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show skeleton rows during any refetch (search, refresh) but not load more */}
                  {((circularsLoading && hasLoadedOnce.current) || (circularsFetching && !isFetchingNextPage)) ? (
                    <TableRowsSkeleton rows={15} columns={7} />
                  ) : (
                    <AnimatePresence>
                      {allCirculars.map((circular, index) => (
                        <motion.tr
                          key={circular.id}
                          custom={index}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover="hover"
                          className="border-b border-slate-100 dark:border-slate-800/50 cursor-pointer"
                        >
                          <td className="py-4 px-5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-slate-700 dark:text-slate-300 font-mono text-sm bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">
                              {circular.circular_no}
                            </span>
                          </td>
                          <td className="py-4 px-5 max-w-xs">
                            <span className="text-blue-600 dark:text-blue-400 font-medium line-clamp-2">
                              {circular.title}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-slate-700 dark:text-slate-300">{circular.issued_by}</td>
                          <td className="py-4 px-5 text-slate-500 dark:text-slate-400 text-sm">
                            {formatDate(circular.issued_date)}
                          </td>
                          <td className="py-4 px-5">
                            {circular.file_url ? (
                              <motion.button
                                onClick={() => handleViewFile(circular.file_url!)}
                                className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Eye className="h-4 w-4" />
                                View File
                              </motion.button>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600 text-sm italic">No file attached</span>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <DeleteCircularButton circularId={circular.id} />
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More / Status */}
          {allCirculars.length > 0 && (!circularsFetching || isFetchingNextPage) && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-slate-400 text-sm">Loading more...</span>
                </div>
              ) : hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Load More ({total - allCirculars.length} remaining)
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500">
                  Showing all {allCirculars.length} circulars
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
      <GoToTopButton />
    </motion.div>
  );
}
