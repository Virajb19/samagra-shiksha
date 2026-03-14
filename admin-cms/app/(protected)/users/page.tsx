'use client';

import { useState, useMemo, useEffect, useRef, use } from 'react';
import { useAuthStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedCheckbox } from '@/components/AnimatedCheckbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Mail,
  Loader2,
  Users,
  Filter,
  Hash,
  Building2,
  GraduationCap,
  Briefcase,
  BookOpen,
  Bell,
  Eye,
  Phone,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounceValue, useLocalStorage } from 'usehooks-ts';
import { useGetUsers, usersApi } from '@/services/user.service';
import { masterDataFirestore } from '@/services/firebase/master-data.firestore';
import { clearUsersCursorCache } from '@/services/firebase/users.firestore';
import { userStarsFireStore } from '@/services/firebase/user-star.firestore';
import { UserRole, User } from '@/types';
import { UserStatusToggle } from '@/components/UserStatusToggle';
import { DownloadXlsxButton } from '@/components/DownLoadXlxsButton';
import { StarButton } from '@/components/StarButton';
import { SendNotificationDialog } from '@/components/SendNotificationDialog';
import { RetryButton } from '@/components/RetryButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import { RefreshTableButton } from '@/components/RefreshTableButton';

import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import CopyEmailButton from '@/components/CopyEmailButton';

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
      delay: i * 0.02,
      duration: 0.15,
      ease: "easeOut" as const
    }
  }),
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 }
  }
};

// Role display labels
const roleLabels: Record<string, string> = {
  [UserRole.HEADMASTER]: 'Headmasters',
  [UserRole.TEACHER]: 'Teachers',
  [UserRole.IE_RESOURCE_PERSON]: 'IE Resource Persons',
  [UserRole.KGBV_WARDEN]: 'KGBV Wardens',
  [UserRole.NSCBAV_WARDEN]: 'NSCBAV Wardens',
  [UserRole.JUNIOR_ENGINEER]: 'Junior Engineers',
};

// Roles available in the filter dropdown
const displayRoles = [
  UserRole.HEADMASTER,
  UserRole.TEACHER,
  UserRole.IE_RESOURCE_PERSON,
  UserRole.KGBV_WARDEN,
  UserRole.NSCBAV_WARDEN,
  UserRole.JUNIOR_ENGINEER,
];

export default function UsersPage() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 500);
  const [roleFilter, setRoleFilter] = useLocalStorage<UserRole>('roleFilter', UserRole.HEADMASTER);
  const [districtFilter, setDistrictFilter] = useLocalStorage('districtFilter', 'all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [showOnlyInactive, setShowOnlyInactive] = useLocalStorage('showOnlyInactive', false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Dialogs state
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);

  // Debounce search input using useDebounceValue — page reset handled in onChange

  // Build API filters
  const role = useAuthStore((s) => s.role);

  // API filters for fetching users (server side filtering)
  const apiFilters = useMemo(() => {
    const filters: any = {
      page: currentPage,
      limit: itemsPerPage,
    };

    filters.role = roleFilter;
    if (districtFilter !== 'all') filters.district_id = districtFilter;
    if (schoolFilter !== 'all') filters.school_id = schoolFilter;
    if (debouncedSearch) filters.search = debouncedSearch;
    if (showOnlyInactive) filters.is_active = false;
    return filters;
  }, [currentPage, roleFilter, districtFilter, schoolFilter, debouncedSearch, showOnlyInactive]);


  // Don't use isRefetching -> shows loader after stale time (every 5 minutes)
  const { data: usersResponse, isLoading, isFetching, isRefetching, isPlaceholderData, isError, error } = useGetUsers(apiFilters);
  const users = usersResponse?.data || [];
  const totalPages = usersResponse?.totalPages || 1;
  const totalUsers = usersResponse?.total || 0;

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: masterDataFirestore.getDistricts,
  });
  const { data: schools = [], isFetching: isFetchingSchools } = useQuery({
    queryKey: ['schools', districtFilter !== 'all' ? districtFilter : undefined],
    queryFn: () => masterDataFirestore.getSchools(districtFilter !== 'all' ? districtFilter : undefined),
    enabled: districtFilter !== 'all',
  });

  // Fetch starred user IDs
  const { data: starredUserIds = [] } = useQuery({
    queryKey: ['starred-users'],
    queryFn: userStarsFireStore.getStarredIds,
  });

  const queryClient = useQueryClient();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [currentUserForNotification, setCurrentUserForNotification] = useState<string | null>(null);

  // Track if this is the initial mount to prevent resetting school filter on page load
  const isInitialMount = useRef(true);
  const prevDistrictFilter = useRef(districtFilter);

  // Track if data has ever been loaded — skeletons only show before this becomes true
  const hasLoadedOnce = useRef(false);

  // Show overlay for any refetch after initial load (filter changes, page changes, AND refresh)
  const showTableOverlay = isFetching && hasLoadedOnce.current;

  useEffect(() => {
    if (!isLoading && users.length > 0) {
      hasLoadedOnce.current = true;
    }
  }, [isLoading, users.length]);

  // Reset school filter when district changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevDistrictFilter.current = districtFilter;
      return;
    }
    // Only reset if district actually changed
    if (prevDistrictFilter.current !== districtFilter) {
      setSchoolFilter('all');
      prevDistrictFilter.current = districtFilter;
    }
  }, [districtFilter, setSchoolFilter]);


  // Prefetch next page
  useEffect(() => {
    if (currentPage < totalPages) {
      const nextFilters = { ...apiFilters, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: ['users', nextFilters],
        queryFn: () => usersApi.getAll(nextFilters),
      });
    }
  }, [currentPage, totalPages, apiFilters, queryClient]);

  // Reset page when filters change
  const resetPage = () => {
    clearUsersCursorCache();
    setCurrentPage(1);
  };

  // Helper to get school and district info
  const getSchoolAndDistrict = (user: User) => {
    if (user.faculty?.school) {
      const school = user.faculty.school;
      const districtName = school.district?.name
        || districts.find(d => d.id === school.district_id)?.name
        || '';
      const regCode = school.registration_code ? ` #${school.registration_code}` : '';
      return `${school.name}, ${districtName}${regCode}`;
    }
    return '-';
  };

  // Helper to resolve district name from district_id (for warden/JE roles)
  const getDistrictName = (districtId?: string) => {
    if (!districtId) return '-';
    return districts.find(d => d.id === districtId)?.name || districtId;
  };

  // Helper to get district & EBRC display string
  const getDistrictAndEbrc = (user: User) => {
    const district = getDistrictName(user.district_id);
    const ebrc = user.ebrc || '';
    if (district !== '-' && ebrc) return `${district} - ${ebrc}`;
    return district !== '-' ? district : (ebrc || '-');
  };

  // Dynamic table columns based on role filter
  type TableColumn = {
    key: string;
    label: string;
    icon?: React.ReactNode;
    render: (user: User) => React.ReactNode;
  };

  const tableColumns: TableColumn[] = useMemo(() => {
    const nameCol = (showHmBadge: boolean): TableColumn => ({
      key: 'name',
      label: 'Full Name',
      render: (user) => {
        const isHm = user.role === 'HEADMASTER';
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isHm ? 'text-blue-700 dark:text-blue-400' : 'text-blue-600 dark:text-blue-400'}`}>{user.name}</span>
            {showHmBadge && isHm && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 uppercase tracking-wide">HM</span>
            )}
          </div>
        );
      },
    });

    switch (roleFilter) {
      case UserRole.HEADMASTER:
      case UserRole.TEACHER:
        return [
          nameCol(roleFilter === UserRole.HEADMASTER),
          { key: 'school_id', label: 'School ID', icon: <Hash className="h-4 w-4 inline mr-1" />, render: (u: User) => u.faculty?.school?.registration_code || '-' },
          { key: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4 inline mr-1" />, render: (u: User) => u.faculty?.years_of_experience != null ? `${u.faculty.years_of_experience} Years` : '-' },
          { key: 'school_district', label: 'School & District', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => <span className="line-clamp-2">{getSchoolAndDistrict(u)}</span> },
          { key: 'responsibilities', label: 'Responsibilities', icon: <BookOpen className="h-4 w-4 inline mr-1" />, render: (u: User) => u.responsibilities?.length ? u.responsibilities.join(', ') : '-' },
        ];

      case UserRole.KGBV_WARDEN:
        return [
          nameCol(false),
          { key: 'kgbv_type', label: 'KGBV Type', icon: <GraduationCap className="h-4 w-4 inline mr-1" />, render: (u: User) => u.kgbv_type || '-' },
          { key: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4 inline mr-1" />, render: (u: User) => u.years_of_experience != null ? `${u.years_of_experience} Years` : '-' },
          { key: 'residential_location', label: 'Residential Location', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => u.residential_location || '-' },
          { key: 'district_ebrc', label: 'District & EBRC', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => <span className="line-clamp-2">{getDistrictAndEbrc(u)}</span> },
        ];

      case UserRole.NSCBAV_WARDEN:
        return [
          nameCol(false),
          { key: 'qualification', label: 'Qualification', icon: <GraduationCap className="h-4 w-4 inline mr-1" />, render: (u: User) => u.qualification || '-' },
          { key: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4 inline mr-1" />, render: (u: User) => u.years_of_experience != null ? `${u.years_of_experience} Years` : '-' },
          { key: 'residential_location', label: 'Residential Location', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => u.residential_location || '-' },
          { key: 'district_ebrc', label: 'District & EBRC', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => <span className="line-clamp-2">{getDistrictAndEbrc(u)}</span> },
        ];

      case UserRole.JUNIOR_ENGINEER:
        return [
          nameCol(false),
          { key: 'phone', label: 'Phone', icon: <Phone className="h-4 w-4 inline mr-1" />, render: (u: User) => u.phone || '-' },
          { key: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4 inline mr-1" />, render: (u: User) => u.years_of_experience != null ? `${u.years_of_experience} Years` : '-' },
          { key: 'district', label: 'District', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => getDistrictName(u.district_id) },
          { key: 'responsibilities', label: 'Responsibilities', icon: <BookOpen className="h-4 w-4 inline mr-1" />, render: (u: User) => u.responsibilities?.length ? u.responsibilities.join(', ') : '-' },
        ];

      case UserRole.IE_RESOURCE_PERSON:
        return [
          nameCol(false),
          { key: 'qualification', label: 'Qualification', icon: <GraduationCap className="h-4 w-4 inline mr-1" />, render: (u: User) => u.qualification || '-' },
          { key: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4 inline mr-1" />, render: (u: User) => u.years_of_experience != null ? `${u.years_of_experience} Years` : '-' },
          { key: 'rci_number', label: 'RCI Number', icon: <Hash className="h-4 w-4 inline mr-1" />, render: (u: User) => u.rci_number || '-' },
          { key: 'district_ebrc', label: 'District & EBRC', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => <span className="line-clamp-2">{getDistrictAndEbrc(u)}</span> },
        ];

      default:
        return [
          nameCol(false),
          { key: 'experience', label: 'Experience', icon: <Briefcase className="h-4 w-4 inline mr-1" />, render: (u: User) => u.faculty?.years_of_experience != null ? `${u.faculty.years_of_experience} Years` : '-' },
          { key: 'school_district', label: 'School & District', icon: <Building2 className="h-4 w-4 inline mr-1" />, render: (u: User) => <span className="line-clamp-2">{getSchoolAndDistrict(u)}</span> },
          { key: 'responsibilities', label: 'Responsibilities', icon: <BookOpen className="h-4 w-4 inline mr-1" />, render: (u: User) => u.responsibilities?.length ? u.responsibilities.join(', ') : '-' },
        ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, districts]);

  // Total number of table columns (Sl No + dynamic cols + Actions)
  const totalColSpan = tableColumns.length + 2;

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const openNotificationDialog = (userId?: string) => {
    setCurrentUserForNotification(userId || null);
    setNotificationDialogOpen(true);
  };

  // Export users as CSV and trigger download
  const exportUsersAsCSV = (usersToExport: User[]) => {
    if (!usersToExport || usersToExport.length === 0) return;

    const headers = [
      'Name',
      'Phone',
      'Email',
      'Role',
      'School',
      'District',
      'Active',
    ];

    const rows = usersToExport.map((u) => {
      const schoolAndDistrict = getSchoolAndDistrict(u).replace(/,/g, '');
      return [
        u.name,
        u.phone,
        u.email || '',
        u.role,
        schoolAndDistrict,
        u.faculty?.school?.district?.name || '',
        u.is_active ? 'Yes' : 'No',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Define table loading/error content
  const tableContent = () => {
    // Only show skeletons on the very first load ever (before any data has been fetched)
    // After that, the pulse overlay handles all subsequent loading states
    if (isLoading && !hasLoadedOnce.current) {
      return (
        <tbody>
          <TableRowsSkeleton rows={15} columns={totalColSpan} />
        </tbody>
      );
    }

    if (isError) {
      return (
        <tbody>
          <tr>
            <td colSpan={totalColSpan} className="py-16">
              <RetryButton
                queryKey={['users', apiFilters]}
                message="Failed to load users"
                subMessage={typeof error?.message === 'string' ? error.message : undefined}
              />
            </td>
          </tr>
        </tbody>
      );
    }

    if (users.length === 0 && !isFetching) {
      return (
        <tbody>
          <tr>
            <td colSpan={totalColSpan} className="py-16 bg-white dark:bg-transparent">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Users className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                <div className="text-slate-600 dark:text-slate-400 text-lg">No users found</div>
                <p className="text-slate-500 text-sm mt-2">Try adjusting your filters</p>
              </motion.div>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <AnimatePresence mode="popLayout">
        {users.map((user, index) => {
          return (
            <motion.tr
              key={user.id}
              custom={index}
              variants={tableRowVariants}
              initial="hidden"
              animate="visible"
              className={`border-b cursor-pointer transition-colors duration-150 ${selectedUsers.includes(user.id)
                ? 'bg-blue-50/80 dark:bg-blue-500/10 border-slate-100 dark:border-slate-800/50 hover:bg-blue-100/80 dark:hover:bg-blue-500/15'
                : 'border-slate-100 dark:border-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'
                }`}
            >
              <td className="py-4 px-5">
                <div className="flex items-center gap-3">
                  <AnimatedCheckbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                  />
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-sm font-mono">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </span>
                </div>
              </td>
              {tableColumns.map((col) => (
                <td key={col.key} className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-xs">
                  {col.render(user)}
                </td>
              ))}
              <td className="py-4 px-5">
                <div className="flex items-center gap-2">
                  {/* View Details Button */}
                  <motion.button
                    onClick={() => {
                      setSelectedUserForDetail(user);
                      setUserDetailDialogOpen(true);
                    }}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all"
                    title="View User Details"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Eye className="h-5 w-5" />
                  </motion.button>

                  <UserStatusToggle userId={user.id} isActive={user.is_active} />
                  <motion.button
                    onClick={() => openNotificationDialog(user.id)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all"
                    title="Send Notification"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Mail className="h-5 w-5" />
                  </motion.button>

                  <StarButton
                    userId={user.id}
                    isStarred={starredUserIds.includes(user.id)}
                  />
                </div>
              </td>
            </motion.tr>
          );
        })}
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      className="space-y-8 p-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage all users and their permissions</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 text-sm font-medium">
              {totalUsers} users
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <RefreshTableButton queryKey={['users', apiFilters]} isFetching={isFetching} />
            <DownloadXlsxButton
              onDownload={() => exportUsersAsCSV(users)}
              disabled={users.length === 0}
            />
          </div>
        </div>
      </motion.div>

      {/* Filters Card */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h3>
        </div>

        {/* Search */}
        <motion.div className="mb-4" variants={itemVariants}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Exact match: Name / Email / Phone"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDebouncedSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-10 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </motion.div>

        {/* Filter Dropdowns */}
        <motion.div className={`grid grid-cols-2 md:grid-cols-3 ${roleFilter === UserRole.TEACHER || roleFilter === UserRole.HEADMASTER ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`} variants={itemVariants}>
          <Select value={roleFilter} onValueChange={(v) => { const newRole = v as UserRole; setRoleFilter(newRole); if (newRole !== UserRole.TEACHER && newRole !== UserRole.HEADMASTER) { setSchoolFilter('all'); } resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="User Type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              {displayRoles.map((role) => (
                <SelectItem key={role} value={role} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                  {roleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); resetPage(); }}>
            <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Districts</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district.id} value={district.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* School filter — only relevant for roles that have faculty/school records */}
          {(roleFilter === UserRole.TEACHER || roleFilter === UserRole.HEADMASTER) && (
            <Select value={schoolFilter} onValueChange={(v) => { setSchoolFilter(v); setSchoolSearchQuery(''); resetPage(); }}>
              <SelectTrigger className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 transition-all">
                {isFetchingSchools ? (
                  <span className="flex items-center gap-2 text-black dark:text-white">
                    All Schools
                  </span>
                ) : (
                  <SelectValue placeholder="School" />
                )}
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-0" position="popper" sideOffset={4}>
                {isFetchingSchools ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading schools...</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-white dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        placeholder="Search schools..."
                        value={schoolSearchQuery}
                        onChange={(e) => setSchoolSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">All Schools</SelectItem>
                      {(() => {
                        const filtered = schoolSearchQuery
                          ? schools.filter(s => s.name?.toLowerCase().includes(schoolSearchQuery.toLowerCase()))
                          : schools;
                        const capped = filtered.slice(0, 50);
                        return (
                          <>
                            {capped.map((school) => (
                              <SelectItem key={school.id} value={school.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                                {school.name?.trim()}
                              </SelectItem>
                            ))}
                            {filtered.length > 50 && (
                              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                                Showing 50 of {filtered.length} — type to search
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </SelectContent>
            </Select>
          )}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              className={`w-full p-2 text-white rounded-lg duration-300 ${showOnlyInactive
                ? "bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-transparent"
                : "bg-blue-500 border-slate-300 dark:border-transparent hover:border-slate-400 dark:hover:border-slate-600 hover:bg-blue-600 dark:hover:text-white"
                }`}
              onClick={() => {
                setShowOnlyInactive(!showOnlyInactive);
                resetPage();
              }}
            >
              {showOnlyInactive ? 'Show All' : 'Show Inactive Only'}
            </button>
          </motion.div>

          <ClearFiltersButton
            hasActiveFilters={!!(searchQuery || debouncedSearch || roleFilter !== UserRole.HEADMASTER || districtFilter !== 'all' || schoolFilter !== 'all' || showOnlyInactive)}
            onClear={() => {
              setSearchQuery('');
              setDebouncedSearch('');
              setRoleFilter(UserRole.HEADMASTER);
              setDistrictFilter('all');
              setSchoolFilter('all');
              setShowOnlyInactive(false);
              resetPage();
            }}
          />
        </motion.div>

        {/* Bulk Actions */}
        <AnimatePresence mode="wait">
          {selectedUsers.length > 0 && (
            <motion.div
              className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm font-medium">
                  {selectedUsers.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUsers([])}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Deselect All
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => openNotificationDialog()}
                    className="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Users Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Centered loader — shown during page changes / filtering only (not mutation refetches) */}
          {showTableOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10">
              <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
            </div>
          )}

          <table className={`w-full transition-opacity duration-200 ${showTableOverlay ? 'opacity-60 pointer-events-none select-none' : ''}`}>
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                  <div className="flex items-center gap-3">
                    <AnimatedCheckbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Hash className="h-4 w-4" />
                    Sl No.
                  </div>
                </th>
                {tableColumns.map((col) => (
                  <th key={col.key} className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide border-r border-blue-500/30">
                    {col.icon}{col.label}
                  </th>
                ))}
                <th className="text-left py-3.5 px-5 text-white font-semibold text-sm tracking-wide">Actions</th>
              </tr>
            </thead>
            {tableContent()}
          </table>
        </div>

        {/* Pagination Controls — Cursor-based: Previous / Next only */}
        <motion.div
          className="flex flex-col items-center gap-3 p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || showTableOverlay}
              className="gap-1 shrink-0 bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">Page</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{currentPage}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">of</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{totalPages || 1}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === (totalPages || 1) || showTableOverlay}
              className="gap-1 shrink-0 bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing {totalUsers > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
          </div>
        </motion.div>
      </motion.div>

      {/* Send Notification Dialog */}
      <SendNotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
        recipientUserIds={currentUserForNotification ? [currentUserForNotification] : selectedUsers}
        selectedUsers={
          currentUserForNotification
            ? users.filter(u => u.id === currentUserForNotification)
            : users.filter(u => selectedUsers.includes(u.id))
        }
        singleUser={!!currentUserForNotification}
      />

      {/* User Detail Dialog */}
      <Dialog open={userDetailDialogOpen} onOpenChange={setUserDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Review complete user profile information before approving or rejecting
            </DialogDescription>
          </DialogHeader>

          {selectedUserForDetail && (
            <div className="space-y-6">
              {/* Profile Photo */}
              {selectedUserForDetail.profile_image_url && (
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 shadow-lg">
                      <img
                        src={selectedUserForDetail.profile_image_url}
                        alt={selectedUserForDetail.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-blue-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Full Name</label>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Role</label>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.role}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Phone</label>
                    <p className="text-slate-900 dark:text-white font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {selectedUserForDetail.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Email</label>
                    <div className='flex items-center gap-2'>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.email || '-'}</p>
                      {selectedUserForDetail.email && (
                        <CopyEmailButton email={selectedUserForDetail.email} />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Gender</label>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.gender || '-'}</p>
                  </div>
                </div>
              </div>

              {/* School Info */}
              {selectedUserForDetail.faculty?.school && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-500" />
                    School Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">School Name</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty.school.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">District</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty.school.district?.name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Registration Code</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedUserForDetail.faculty.school.registration_code || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-500" />
                  Professional Information
                </h3>
                {(() => {
                  const yearsOfExperience =
                    selectedUserForDetail.years_of_experience ??
                    selectedUserForDetail.faculty?.years_of_experience;

                  return (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Years of Experience</label>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {yearsOfExperience != null ? `${yearsOfExperience} Years` : '-'}
                    </p>
                  </div>
                </div>
                  );
                })()}
              </div>

            </div>
          )}

          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setUserDetailDialogOpen(false)}
              className="border-slate-300 dark:border-slate-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
