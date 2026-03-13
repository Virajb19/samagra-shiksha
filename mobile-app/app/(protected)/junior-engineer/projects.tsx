/**
 * Projects List Screen
 *
 * Server-side cursor-based pagination with Firestore.
 * Filter dialog: Category, Activity, District, PAB Year (server-side where clauses).
 * Full-page loading state during initial / filter loads.
 * FlatList infinite scroll via onEndReached.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { AppText } from '@/components/AppText';
import {
    View,
    FlatList,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { getAllPaginatedProjects } from '../../../src/services/project.service';
import { getDistricts } from '../../../src/services/firebase/master-data.firestore';
import type { Project, District } from '../../../src/types';
import ProjectCard from '@/components/ProjectCard';

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

// ── Main Screen ──

export default function ProjectsListScreen() {
    const router = useRouter();
    const [filterVisible, setFilterVisible] = useState(false);

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

    // ── Infinite Query ──
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isFetching,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['projects-paginated', categoryFilter, activityFilter, districtFilter, yearFilter],
        queryFn: ({ pageParam }) =>
            getAllPaginatedProjects(PAGE_SIZE, pageParam as string | null, {
                category: categoryFilter || undefined,
                activity: activityFilter || undefined,
                pabYear: yearFilter || undefined,
                district: districtFilter || undefined,
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
    const onEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const renderFooter = () => {
        if (isFetchingNextPage) {
            return (
                <View className="items-center py-4">
                    <ActivityIndicator size="large" color={BLUE} style={{ transform: [{ scale: 1.2 }] }} />
                    <AppText className="text-base font-semibold text-gray-600 mt-3">Loading more projects...</AppText>
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
            className="rounded-2xl overflow-hidden mb-3 mx-4"
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
        />
    ), []);

    // Show full-page loading screen during initial load or while refetching with empty data.
    const showLoading = isLoading || (isFetching && allProjects.length === 0);

    if (showLoading) {
        return (
            <View className="flex-1 bg-[#f5f5f5]">
                <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                    <AppText className="text-[26px] font-bold text-[#1a1a1a]">Projects</AppText>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-full border-[1.5px] justify-center items-center"
                        style={{ borderColor: BLUE }}
                        onPress={openFilterDialog}
                    >
                        <Ionicons name="search" size={22} color={BLUE} />
                    </TouchableOpacity>
                </View>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={BLUE} />
                    <AppText className="text-gray-500 text-[15px] mt-2">Loading projects...</AppText>
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
            </View>
        );
    }

    return (
        <>
            <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <AppText className="text-[26px] font-bold text-[#1a1a1a]">Projects</AppText>
                <TouchableOpacity
                    className="w-10 h-10 rounded-full border-[1.5px] justify-center items-center"
                    style={{ borderColor: BLUE }}
                    onPress={openFilterDialog}
                >
                    <Ionicons name="search" size={22} color={BLUE} />
                </TouchableOpacity>
            </View>

            <View className="flex-1 bg-[#f0f4f8]">
                <View className="px-4 pt-4 pb-2">
                    <AppText style={{ fontSize: 14, color: '#6b7280', marginTop: 6, marginLeft: 4 }}>
                        <AppText style={{ fontWeight: '700', color: '#374151' }}>{allProjects.length}</AppText>
                        {' of '}
                        <AppText style={{ fontWeight: '700', color: '#374151' }}>{totalCount}</AppText>
                        {' projects'}
                    </AppText>
                </View>

                {allProjects.length === 0 ? (
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
