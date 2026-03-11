/**
 * Projects List Screen
 *
 * Server-side cursor-based pagination with Firestore.
 * Filter dialog: Category, Activity, District, PAB Year (server-side where clauses).
 * Shimmer skeleton loading cards during initial / filter loads.
 * FlatList infinite scroll via onEndReached.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Animated,
    ScrollView,
    type DimensionValue,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../../src/lib/store';
import { getAllPaginatedProjects } from '../../../src/services/project.service';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import type { Project, District } from '../../../src/types';

const BLUE = '#1565C0';
const PAGE_SIZE = 10;

const CATEGORIES = ['Elementary', 'Secondary', 'Higher Secondary', 'PM Shri', 'NSCBAV', 'DA JGUA', 'KGBV-IV'];
const ACTIVITIES = [
    'New Government Primary School', 'Construction of New Building', 'Boys Toilet', 'Girls Toilet',
    'Additional Classroom', 'Boundary Wall', 'Drinking Water Facility', 'Electrification',
    'Major Repair', 'Major Repair (Rejuvenation)', 'Rain Water Harvesting', 'Science Lab',
    'Library Room', 'ICT Lab', 'Hostel', 'Vocational Lab',
];
const PAB_YEARS = ['2022 - 2023', '2023 - 2024', '2024 - 2025', '2025 - 2026', '2026 - 2027'];

// ── Shimmer Skeleton ──

function ShimmerBlock({ width, height, style }: { width: DimensionValue; height: number; style?: object }) {
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [shimmerAnim]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#d1d5db',
                    borderRadius: 6,
                    opacity: shimmerAnim,
                },
                style,
            ]}
        />
    );
}

function SkeletonCard() {
    return (
        <View
            className="rounded-2xl overflow-hidden mb-3 mx-4"
            style={{
                backgroundColor: '#e5e7eb',
                padding: 16,
                elevation: 2,
            }}
        >
            <ShimmerBlock width="40%" height={10} />
            <ShimmerBlock width="75%" height={18} style={{ marginTop: 8 }} />
            <ShimmerBlock width="100%" height={6} style={{ marginTop: 14, borderRadius: 999 }} />
            <ShimmerBlock width="35%" height={10} style={{ marginTop: 10 }} />
        </View>
    );
}

function SkeletonList() {
    return (
        <View style={{ paddingTop: 8 }}>
            {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    );
}

// ── Filter Dropdown Picker ──

function FilterPicker({
    label,
    value,
    options,
    onSelect,
    allLabel = 'All',
}: {
    label: string;
    value: string;
    options: string[];
    onSelect: (v: string) => void;
    allLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const displayValue = value || allLabel;

    return (
        <View style={{ marginBottom: 16 }}>
            <AppText style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>{label}</AppText>
            <TouchableOpacity
                onPress={() => setOpen(!open)}
                activeOpacity={0.7}
                style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                }}
            >
                <AppText style={{ fontSize: 14, color: value ? '#111827' : '#6b7280' }}>{displayValue}</AppText>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
            </TouchableOpacity>

            {open && (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        borderRadius: 12,
                        marginTop: 4,
                        backgroundColor: '#fff',
                        maxHeight: 180,
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                    }}
                >
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                        <TouchableOpacity
                            onPress={() => { onSelect(''); setOpen(false); }}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 11,
                                backgroundColor: !value ? '#eff6ff' : 'transparent',
                                borderBottomWidth: 0.5,
                                borderBottomColor: '#f3f4f6',
                            }}
                        >
                            <AppText style={{ fontSize: 14, color: !value ? BLUE : '#374151', fontWeight: !value ? '600' : '400' }}>
                                {allLabel}
                            </AppText>
                        </TouchableOpacity>
                        {options.map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                onPress={() => { onSelect(opt); setOpen(false); }}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 11,
                                    backgroundColor: value === opt ? '#eff6ff' : 'transparent',
                                    borderBottomWidth: 0.5,
                                    borderBottomColor: '#f3f4f6',
                                }}
                            >
                                <AppText style={{ fontSize: 14, color: value === opt ? BLUE : '#374151', fontWeight: value === opt ? '600' : '400' }}>
                                    {opt}
                                </AppText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

// ── Project Card ──

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
    const progressWidth = `${Math.min(project.progress, 100)}%` as DimensionValue;
    const isCompleted = project.status === 'Completed';
    const progressLabel =
        project.progress === 0
            ? 'N/A'
            : isCompleted
                ? 'Completed'
                : project.progress >= 100
                    ? '100% (Pending close)'
                    : `${project.progress}%`;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            className="rounded-2xl overflow-hidden mb-3 mx-4"
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
        >
            <View style={{ backgroundColor: BLUE, padding: 16 }}>
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-3">
                        <AppText className="text-white/80 text-xs font-semibold mb-1">{project.activity}</AppText>
                        <AppText className="text-white text-lg font-bold" numberOfLines={1}>{project.school_name}</AppText>
                    </View>
                    <View className="rounded-lg px-3 py-1" style={{ backgroundColor: isCompleted ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>
                        <AppText className="text-white text-xs font-bold">{progressLabel}</AppText>
                    </View>
                </View>
                <View className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <View style={{ width: progressWidth, backgroundColor: '#fff', height: '100%', borderRadius: 999 }} />
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <AppText className="text-white/70 text-xs ml-1">{project.district_name}</AppText>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ── Main Screen ──

export default function ProjectsListScreen() {
    const { user } = useAuthStore();
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterVisible, setFilterVisible] = useState(false);

    // Debounce search input (500ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchText.trim());
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText]);

    // Filter state (applied on "Search" tap)
    const [categoryFilter, setCategoryFilter] = useState('');
    const [activityFilter, setActivityFilter] = useState('');
    const [districtFilter, setDistrictFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');

    // Temp filter state for the dialog (committed on "Search")
    const [tmpCategory, setTmpCategory] = useState('');
    const [tmpActivity, setTmpActivity] = useState('');
    const [tmpDistrict, setTmpDistrict] = useState('');
    const [tmpYear, setTmpYear] = useState('');

    // Fetch districts (for filter dropdown)
    const { data: districts = [] } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    const districtNames = useMemo(() => districts.map(d => d.name).sort(), [districts]);

    // Open filter dialog → sync temp state from active filters
    const openFilterDialog = () => {
        setTmpCategory(categoryFilter);
        setTmpActivity(activityFilter);
        setTmpDistrict(districtFilter);
        setTmpYear(yearFilter);
        setFilterVisible(true);
    };

    // Apply filters
    const handleApplyFilters = () => {
        setCategoryFilter(tmpCategory);
        setActivityFilter(tmpActivity);
        setDistrictFilter(tmpDistrict);
        setYearFilter(tmpYear);
        setFilterVisible(false);
    };

    // Reset filters
    const handleReset = () => {
        setTmpCategory('');
        setTmpActivity('');
        setTmpDistrict('');
        setTmpYear('');
    };

    // ── Infinite Query (searchText is now server-side) ──
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isFetching,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['projects-paginated', categoryFilter, activityFilter, districtFilter, yearFilter, debouncedSearch],
        queryFn: ({ pageParam }) =>
            getAllPaginatedProjects(PAGE_SIZE, pageParam as string | null, {
                category: categoryFilter || undefined,
                activity: activityFilter || undefined,
                pabYear: yearFilter || undefined,
                district: districtFilter || undefined,
                searchText: debouncedSearch || undefined,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    });

    // Refetch when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    // Flatten all pages into a single list
    const allProjects = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page.data);
    }, [data]);

    const totalCount = data?.pages?.[0]?.total ?? 0;
    const activeFilterCount = [categoryFilter, activityFilter, districtFilter, yearFilter].filter(Boolean).length;

    const onEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const renderFooter = () => {
        if (isFetchingNextPage) {
            return (
                <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={BLUE} />
                </View>
            );
        }
        if (!hasNextPage && allProjects.length > 0) {
            return (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <AppText style={{ color: '#9ca3af', fontSize: 12 }}>All projects loaded</AppText>
                </View>
            );
        }
        return null;
    };

    const renderItem = useCallback(({ item }: { item: Project }) => (
        <ProjectCard
            project={item}
            onPress={() => router.push(`/(protected)/junior-engineer/project-detail?id=${item.id}`)}
        />
    ), []);

    // Show skeletons during initial load or when filters change (isFetching and no data yet)
    const showSkeleton = isLoading || (isFetching && allProjects.length === 0);

    return (
        <>
            {/* Page Title Bar */}
            <View className="flex-row items-center justify-between px-4 py-3" style={{ backgroundColor: BLUE }}>
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <AppText className="text-white text-lg font-semibold">Projects</AppText>
                </View>
                <TouchableOpacity onPress={openFilterDialog}>
                    <View>
                        <Ionicons name="search" size={24} color="#fff" />
                        {activeFilterCount > 0 && (
                            <View className="absolute -top-1 -right-1.5 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                                <AppText className="text-white text-[10px] font-bold">{activeFilterCount}</AppText>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <View className="flex-1 bg-[#f0f4f8]">
                {/* Search Bar */}
                <View className="px-4 pt-4 pb-2">
                    <View className="flex-row items-center bg-white rounded-xl px-4 py-3" style={{ elevation: 2 }}>
                        <Ionicons name="search" size={20} color="#9ca3af" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-gray-800"
                            placeholder="Search School / Hostel"
                            placeholderTextColor="#9ca3af"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {/* Result count */}
                    <AppText style={{ fontSize: 12, color: '#6b7280', marginTop: 6, marginLeft: 4 }}>
                        {showSkeleton ? 'Loading...' : `${allProjects.length} of ${totalCount} projects`}
                    </AppText>
                </View>

                {showSkeleton ? (
                    <SkeletonList />
                ) : allProjects.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <Ionicons name="folder-open-outline" size={60} color="#d1d5db" />
                        <AppText className="text-gray-400 text-base mt-3">No projects found</AppText>
                    </View>
                ) : (
                    <FlatList
                        data={allProjects}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Filter Dialog */}
            <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
                <TouchableOpacity
                    className="flex-1 justify-center items-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    activeOpacity={1}
                    onPress={() => setFilterVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderRadius: 20, width: '85%', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, elevation: 10 }}>
                        <AppText style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Search Filters</AppText>

                        <FilterPicker
                            label="Category"
                            value={tmpCategory}
                            options={CATEGORIES}
                            onSelect={setTmpCategory}
                            allLabel="All Categories"
                        />
                        <FilterPicker
                            label="Activities"
                            value={tmpActivity}
                            options={ACTIVITIES}
                            onSelect={setTmpActivity}
                            allLabel="All Activities"
                        />
                        <FilterPicker
                            label="District"
                            value={tmpDistrict}
                            options={districtNames}
                            onSelect={setTmpDistrict}
                            allLabel="All Districts"
                        />
                        <FilterPicker
                            label="Year"
                            value={tmpYear}
                            options={PAB_YEARS}
                            onSelect={setTmpYear}
                            allLabel="All Years"
                        />

                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                            <TouchableOpacity
                                onPress={handleReset}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    borderWidth: 2,
                                    borderColor: '#ef4444',
                                }}
                            >
                                <AppText style={{ color: '#ef4444', fontWeight: '700', fontSize: 15 }}>Reset</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleApplyFilters}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    backgroundColor: BLUE,
                                }}
                            >
                                <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Search</AppText>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
}
