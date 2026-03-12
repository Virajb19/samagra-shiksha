/**
 * Shared Events List Screen — used by all roles.
 * Clean, simple UI with pagination and filter modal.
 * Headmaster can create events; other roles are view-only.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppText } from '@/components/AppText';
import {
    View, Text, TouchableOpacity, ActivityIndicator, RefreshControl,
    Image, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getEventsPaginated, type EventFilterParams } from '../services/firebase/content.firestore';
import { getDistricts } from '../services/firebase/master-data.firestore';
import { District } from '../types';
import CalendarPickerModal from './CalendarPickerModal';

const BLUE = '#1565C0';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toJsDate(d: any): Date {
    if (!d) return new Date();
    if (d.toDate) return d.toDate();
    return new Date(d);
}

function formatEventDate(start: any, end?: any): string {
    const s = toJsDate(start);
    const day = s.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    const startStr = `${day}${suffix} ${MONTHS[s.getMonth()]}, ${s.getFullYear()}`;
    if (!end) return startStr;
    const e = toJsDate(end);
    if (e.toDateString() === s.toDateString()) return startStr;
    const eDay = e.getDate();
    const es = eDay === 1 || eDay === 21 || eDay === 31 ? 'st' : eDay === 2 || eDay === 22 ? 'nd' : eDay === 3 || eDay === 23 ? 'rd' : 'th';
    return `${startStr}\nto ${eDay}${es} ${MONTHS[e.getMonth()]}, ${e.getFullYear()}`;
}

/* ── Search Filter Modal ── */
function SearchFilterModal({ visible, onClose, onApply, currentFilters, onReset, districts, loadingDistricts }: {
    visible: boolean; onClose: () => void;
    onApply: (f: { startDate: string; endDate: string; districtId: string }) => void;
    currentFilters: { startDate: string; endDate: string; districtId: string };
    onReset: (f: { startDate: string; endDate: string; districtId: string }) => void;
    districts: District[]; loadingDistricts: boolean;
}) {
    const [startDate, setStartDate] = useState(currentFilters.startDate);
    const [endDate, setEndDate] = useState(currentFilters.endDate);
    const [districtId, setDistrictId] = useState(currentFilters.districtId);
    const [showStartCal, setShowStartCal] = useState(false);
    const [showEndCal, setShowEndCal] = useState(false);
    const [showDP, setShowDP] = useState(false);
    const dn = districtId ? districts.find(d => d.id === districtId)?.name || '' : 'All';
    const fmt = (ds: string) => {
        if (!ds) return '';
        const d = new Date(ds);
        const day = d.getDate();
        const s = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
        return `${day}${s} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
    };

    useEffect(() => {
        if (!visible) return;
        setStartDate(currentFilters.startDate);
        setEndDate(currentFilters.endDate);
        setDistrictId(currentFilters.districtId);
    }, [visible, currentFilters]);

    return (
        <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity className="flex-1 bg-black/40 justify-center items-center px-6" activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} className="bg-white rounded-2xl p-6 w-full max-w-[380px]" style={{ elevation: 10 }}>
                    <AppText className="text-[22px] font-bold text-[#1a1a1a] mb-5">Search Filters</AppText>
                    <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-3">Starting Date</AppText>
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 mb-1" onPress={() => setShowStartCal(true)}><AppText className={startDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{startDate ? fmt(startDate) : 'Select date'}</AppText></TouchableOpacity>
                    <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-3">Ending Date</AppText>
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 mb-1" onPress={() => setShowEndCal(true)}><AppText className={endDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{endDate ? fmt(endDate) : 'Select date'}</AppText></TouchableOpacity>
                    <AppText className="text-sm font-bold text-[#1a1a1a] mb-2 mt-3">District</AppText>
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowDP(true)}><AppText className="text-[15px] text-[#1a1a1a]">{dn}</AppText><Ionicons name="chevron-down" size={18} color="#666" /></TouchableOpacity>
                    <View className="flex-row gap-3 mt-6">
                        <TouchableOpacity
                            className="flex-1 border-[1.5px] rounded-[10px] py-3.5 items-center"
                            style={{ borderColor: BLUE }}
                            onPress={() => {
                                const cleared = { startDate: '', endDate: '', districtId: '' };
                                setStartDate('');
                                setEndDate('');
                                setDistrictId('');
                                onReset(cleared);
                            }}
                        >
                            <AppText className="text-[15px] font-semibold" style={{ color: BLUE }}>Reset</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1 rounded-[10px] py-3.5 items-center" style={{ backgroundColor: BLUE }} onPress={() => { onApply({ startDate, endDate, districtId }); onClose(); }}><AppText className="text-[15px] font-semibold text-white">Search</AppText></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
            <CalendarPickerModal visible={showStartCal} value={startDate} onSelect={setStartDate} onClose={() => setShowStartCal(false)} />
            <CalendarPickerModal visible={showEndCal} value={endDate} onSelect={setEndDate} onClose={() => setShowEndCal(false)} />
            <Modal visible={showDP} transparent animationType="slide" onRequestClose={() => setShowDP(false)}>
                <View className="flex-1 bg-black/50 justify-end"><View className="bg-white rounded-t-[20px] max-h-[70%]">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-200"><AppText className="text-lg font-semibold text-gray-800">Select District</AppText><TouchableOpacity onPress={() => setShowDP(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity></View>
                    {loadingDistricts ? <ActivityIndicator size="large" color={BLUE} className="p-10" /> : <FlatList data={[{ id: '', name: 'All' }, ...districts]} keyExtractor={item => item.id || '__all'} renderItem={({ item }) => (<TouchableOpacity className={`py-3.5 px-4 border-b border-gray-100 flex-row justify-between items-center ${districtId === item.id ? 'bg-blue-50' : 'bg-white'}`} onPress={() => { setDistrictId(item.id); setShowDP(false); }}><AppText className={`text-base ${districtId === item.id ? 'text-[#1565C0] font-semibold' : 'text-gray-700'}`}>{item.name}</AppText>{districtId === item.id && <Ionicons name="checkmark" size={20} color={BLUE} />}</TouchableOpacity>)} />}
                </View></View>
            </Modal>
        </Modal>
    );
}

/* ── Event Card ── */
function EventCard({ event, districts, onPress }: { event: any; districts: District[]; onPress: () => void }) {
    const districtName = event.district_id ? districts.find((d: District) => d.id === event.district_id)?.name : null;
    const loc = [event.location, districtName].filter(Boolean).join(', ');
    const dateLine = formatEventDate(event.event_date, event.event_end_date);
    const colors = ['#1565C0', '#0277BD', '#00838F', '#00695C', '#2E7D32'];
    const bg = colors[(event.id || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % colors.length];
    return (
        <TouchableOpacity className="rounded-2xl overflow-hidden mb-4 h-[200px] bg-gray-300" style={{ elevation: 3 }} activeOpacity={0.85} onPress={onPress}>
            {event.flyer_url ? <Image source={{ uri: event.flyer_url }} className="w-full h-full" resizeMode="cover" /> : <View className="w-full h-full justify-center items-center" style={{ backgroundColor: bg }}><Ionicons name="calendar" size={48} color="rgba(255,255,255,0.4)" /></View>}
            <View className="absolute bottom-0 left-0 right-0 p-4 rounded-b-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                <AppText className="text-lg font-extrabold text-white mb-1" numberOfLines={2}>{event.title}</AppText>
                <AppText className="text-[13px] text-white/90 leading-[18px]" numberOfLines={2}>{loc}{loc ? ' | ' : ''}{dateLine}</AppText>
            </View>
        </TouchableOpacity>
    );
}

/* ── Props ── */
export interface EventsListScreenProps {
    onEventPress: (eventId: string) => void;
    onCreatePress?: () => void;
    onBackPress?: () => void;
    headerBgColor?: string;
    queryKey?: string;
    showHeader?: boolean;
}

/* ── Main Screen ── */
export default function EventsListScreen({
    onEventPress,
    onCreatePress,
    onBackPress,
    headerBgColor = '#374151',
    queryKey = 'shared-events',
    showHeader = false,
}: EventsListScreenProps) {
    const [filterVisible, setFilterVisible] = useState(false);
    const [filters, setFilters] = useState<{ startDate: string; endDate: string; districtId: string }>({ startDate: '', endDate: '', districtId: '' });

    const serverFilters: EventFilterParams = useMemo(() => ({
        ...(filters.districtId ? { districtId: filters.districtId } : {}),
        ...(filters.startDate ? { startDate: filters.startDate } : {}),
        ...(filters.endDate ? { endDate: filters.endDate } : {}),
    }), [filters]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching, refetch } = useInfiniteQuery({
        queryKey: [queryKey, serverFilters],
        queryFn: async ({ pageParam }) => getEventsPaginated(10, pageParam ?? null, serverFilters),
        initialPageParam: null as string | null,
        getNextPageParam: (lp) => lp.hasMore ? lp.nextCursor : undefined,
    });
    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({ queryKey: ['districts'], queryFn: getDistricts });
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
    const allEvents = useMemo(() => data?.pages?.flatMap(p => p.events) || [], [data]);
    const hasActiveFilters = useMemo(() => !!(filters.startDate || filters.endDate || filters.districtId), [filters]);

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f9fafb]">
                <ActivityIndicator size="large" color={BLUE} style={{ transform: [{ scale: 1.6 }] }} />
                <AppText className="mt-4 text-lg font-semibold text-gray-600">Loading events...</AppText>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">

            {/* Tab-style header (no back button) */}
            <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <AppText className="text-[26px] font-bold text-[#1a1a1a]">Events</AppText>
                <View className="flex-row items-center gap-3">
                    {onCreatePress && (
                        <TouchableOpacity className="rounded-3xl px-5 py-2.5" style={{ backgroundColor: BLUE }} onPress={onCreatePress}>
                            <AppText className="text-white text-base font-bold">Create Event</AppText>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity className="w-10 h-10 rounded-full border-[1.5px] justify-center items-center" style={{ borderColor: BLUE }} onPress={() => setFilterVisible(true)}>
                        <Ionicons name="search" size={22} color={BLUE} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Events List */}
            <FlatList
                className="flex-1 px-1"
                data={allEvents}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }) => (
                    <EventCard event={item} districts={districts} onPress={() => onEventPress(item.id)} />
                )}
                contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} />}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.35}
                ListFooterComponent={isFetchingNextPage ? (
                    <View className="items-center py-4">
                        <ActivityIndicator size="large" color={BLUE} style={{ transform: [{ scale: 1.2 }] }} />
                        <AppText className="text-base font-semibold text-gray-600 mt-3">Loading more events...</AppText>
                    </View>
                ) : null}
                ListEmptyComponent={
                    <View className="items-center pt-1">
                        {hasActiveFilters ? (
                            <>
                                <Image source={require('../../assets/Empty.gif')} className='w-full' resizeMode="contain" />
                                <AppText className="text-lg font-semibold text-gray-700">No Events</AppText>
                                <AppText className="text-sm text-gray-500 text-center px-8">
                                    No events found for the selected filters.
                                </AppText>
                            </>
                        ) : (
                            <>
                                <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                                <AppText className="text-lg font-semibold text-gray-700 mt-4">No Events</AppText>
                                <AppText className="text-sm text-gray-500 text-center mt-2 px-8">
                                    {onCreatePress ? 'No events scheduled yet. Tap "Create Event" to add one.' : 'No events scheduled yet.'}
                                </AppText>
                            </>
                        )}
                    </View>
                }
            />

            <SearchFilterModal
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                onApply={setFilters}
                onReset={setFilters}
                currentFilters={filters}
                districts={districts}
                loadingDistricts={loadingDistricts}
            />
        </View>
    );
}
