/**
 * Headmaster Events Tab Screen — NativeWind
 *
 * - "Events" title + "Create Event" blue button + search icon
 * - Event cards with full-width images and gradient overlay text
 * - Search filter modal with date pickers & district dropdown
 * - 3-state access model
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Modal,
    FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/lib/store';
import { getProfileStatus } from '../../../../src/services/firebase/users.firestore';
import { getEvents } from '../../../../src/services/firebase/content.firestore';
import { getDistricts } from '../../../../src/services/firebase/master-data.firestore';
import { District } from '../../../../src/types';

const BLUE = '#1E88E5';

interface Event {
    id: string;
    title: string;
    description: string;
    event_date: any;
    end_date?: any;
    event_time?: string;
    location?: string;
    district_id?: string;
    event_type?: string;
    activity_type?: string;
    flyer_url?: string;
    male_participants?: number;
    female_participants?: number;
    creator?: { id: string; name: string };
    created_at: any;
}

/* ── Helpers ── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
    const eSuffix = eDay === 1 || eDay === 21 || eDay === 31 ? 'st' : eDay === 2 || eDay === 22 ? 'nd' : eDay === 3 || eDay === 23 ? 'rd' : 'th';
    const endStr = `${eDay}${eSuffix} ${MONTHS[e.getMonth()]}, ${e.getFullYear()}`;
    return `${startStr}\nto ${endStr}`;
}

/* ── Calendar Picker Modal ── */
function CalendarPickerModal({ visible, value, onSelect, onClose }: {
    visible: boolean; value: string; onSelect: (dateStr: string) => void; onClose: () => void;
}) {
    const today = new Date();
    const initialDate = value ? new Date(value) : today;
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const selectedDay = value ? new Date(value).getDate() : -1;
    const selectedMonth = value ? new Date(value).getMonth() : -1;
    const selectedYear = value ? new Date(value).getFullYear() : -1;

    const days = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }, [viewYear, viewMonth]);

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
    const handleSelect = (day: number) => {
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onSelect(`${viewYear}-${m}-${d}`);
        onClose();
    };
    const isToday = (day: number) => day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isSelected = (day: number) => day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;

    if (!visible) return null;
    return (
        <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity className="flex-1 bg-black/45 justify-center items-center px-7" activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} className="bg-white rounded-[20px] py-5 px-4 w-full max-w-[360px]" style={{ elevation: 10 }}>
                    <View className="flex-row justify-between items-center mb-4 px-1">
                        <TouchableOpacity onPress={prevMonth} className="p-1.5 rounded-lg bg-[#f0f4f8]"><Ionicons name="chevron-back" size={22} color={BLUE} /></TouchableOpacity>
                        <Text className="text-[17px] font-bold" style={{ color: BLUE }}>{MONTHS[viewMonth]} {viewYear}</Text>
                        <TouchableOpacity onPress={nextMonth} className="p-1.5 rounded-lg bg-[#f0f4f8]"><Ionicons name="chevron-forward" size={22} color={BLUE} /></TouchableOpacity>
                    </View>
                    <View className="flex-row mb-2">
                        {WEEKDAYS.map(w => <Text key={w} className="flex-1 text-center text-xs font-semibold text-gray-400">{w}</Text>)}
                    </View>
                    <View className="flex-row flex-wrap">
                        {days.map((day, i) => (
                            <TouchableOpacity
                                key={i}
                                className={`justify-center items-center rounded-xl ${day !== null && isSelected(day) ? 'bg-[#1E88E5]' : ''} ${day !== null && isToday(day) && !isSelected(day) ? 'bg-blue-100' : ''}`}
                                style={{ width: '14.28%', aspectRatio: 1 }}
                                onPress={() => day && handleSelect(day)}
                                disabled={!day}
                            >
                                {day ? (
                                    <Text className={`text-sm font-medium ${isSelected(day) ? 'text-white font-bold' : isToday(day) ? 'text-[#1E88E5] font-bold' : 'text-gray-700'}`}>{day}</Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

/* ── Search Filter Modal ── */
function SearchFilterModal({ visible, onClose, onApply, districts, loadingDistricts }: {
    visible: boolean; onClose: () => void;
    onApply: (filters: { startDate: string; endDate: string; districtId: string }) => void;
    districts: District[]; loadingDistricts: boolean;
}) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [districtId, setDistrictId] = useState('');
    const [showStartCal, setShowStartCal] = useState(false);
    const [showEndCal, setShowEndCal] = useState(false);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);

    const districtName = districtId ? districts.find(d => d.id === districtId)?.name || '' : 'All';

    const formatDisplay = (ds: string) => {
        if (!ds) return '';
        const d = new Date(ds);
        const day = d.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
        return `${day}${suffix} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
    };

    const handleReset = () => { setStartDate(''); setEndDate(''); setDistrictId(''); };
    const handleSearch = () => { onApply({ startDate, endDate, districtId }); onClose(); };

    return (
        <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity className="flex-1 bg-black/40 justify-center items-center px-6" activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} className="bg-white rounded-2xl p-6 w-full max-w-[380px]" style={{ elevation: 10 }}>
                    <Text className="text-[22px] font-bold text-[#1a1a1a] mb-5">Search Filters</Text>

                    {/* Start Date */}
                    <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-3">Starting Date of Program</Text>
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 mb-1" onPress={() => setShowStartCal(true)}>
                        <Text className={startDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{startDate ? formatDisplay(startDate) : 'Select date'}</Text>
                    </TouchableOpacity>

                    {/* End Date */}
                    <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-3">Ending Date of Program</Text>
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 mb-1" onPress={() => setShowEndCal(true)}>
                        <Text className={endDate ? 'text-[15px] text-[#1a1a1a]' : 'text-[15px] text-gray-400'}>{endDate ? formatDisplay(endDate) : 'Select date'}</Text>
                    </TouchableOpacity>

                    {/* District */}
                    <Text className="text-sm font-bold text-[#1a1a1a] mb-2 mt-3">District</Text>
                    <TouchableOpacity className="border border-gray-200 rounded-[10px] px-4 py-3.5 flex-row justify-between items-center" onPress={() => setShowDistrictPicker(true)}>
                        <Text className="text-[15px] text-[#1a1a1a]">{districtName}</Text>
                        <Ionicons name="chevron-down" size={18} color="#666" />
                    </TouchableOpacity>

                    {/* Buttons */}
                    <View className="flex-row gap-3 mt-6">
                        <TouchableOpacity className="flex-1 border-[1.5px] rounded-[10px] py-3.5 items-center" style={{ borderColor: BLUE }} onPress={handleReset}>
                            <Text className="text-[15px] font-semibold" style={{ color: BLUE }}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1 rounded-[10px] py-3.5 items-center" style={{ backgroundColor: BLUE }} onPress={handleSearch}>
                            <Text className="text-[15px] font-semibold text-white">Search</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>

            <CalendarPickerModal visible={showStartCal} value={startDate} onSelect={setStartDate} onClose={() => setShowStartCal(false)} />
            <CalendarPickerModal visible={showEndCal} value={endDate} onSelect={setEndDate} onClose={() => setShowEndCal(false)} />

            {/* District Picker */}
            <Modal visible={showDistrictPicker} transparent animationType="slide" onRequestClose={() => setShowDistrictPicker(false)}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-[20px] max-h-[70%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                            <Text className="text-lg font-semibold text-gray-800">Select District</Text>
                            <TouchableOpacity onPress={() => setShowDistrictPicker(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
                        </View>
                        {loadingDistricts ? (
                            <ActivityIndicator size="large" color={BLUE} className="p-10" />
                        ) : (
                            <FlatList
                                data={[{ id: '', name: 'All' }, ...districts]}
                                keyExtractor={item => item.id || '__all'}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        className={`py-3.5 px-4 border-b border-gray-100 flex-row justify-between items-center ${districtId === item.id ? 'bg-blue-50' : 'bg-white'}`}
                                        onPress={() => { setDistrictId(item.id); setShowDistrictPicker(false); }}
                                    >
                                        <Text className={`text-base ${districtId === item.id ? 'text-[#1E88E5] font-semibold' : 'text-gray-700'}`}>{item.name}</Text>
                                        {districtId === item.id && <Ionicons name="checkmark" size={20} color={BLUE} />}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

/* ── StatusBanner ── */
function StatusBanner({ message }: { message: string }) {
    return (
        <View className="flex-1 p-4">
            <View className="border-[1.5px] border-dashed rounded-xl py-[18px] items-center bg-blue-50" style={{ borderColor: BLUE }}>
                <Text className="text-[15px] font-semibold" style={{ color: BLUE }}>{message}</Text>
            </View>
        </View>
    );
}

/* ── Event Card ── */
function EventCard({ event, districts, onPress }: { event: Event; districts: District[]; onPress: () => void }) {
    const districtName = event.district_id ? districts.find(d => d.id === event.district_id)?.name : null;
    const location = event.location || '';
    const locationLine = [location, districtName].filter(Boolean).join(', ');
    const dateLine = formatEventDate(event.event_date, event.end_date);

    const placeholderColor = ['#1565C0', '#0277BD', '#00838F', '#00695C', '#2E7D32'];
    const hash = event.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const bgColor = placeholderColor[hash % placeholderColor.length];

    return (
        <TouchableOpacity className="rounded-2xl overflow-hidden mb-4 h-[220px] bg-gray-300" style={{ elevation: 3 }} activeOpacity={0.85} onPress={onPress}>
            {event.flyer_url ? (
                <Image source={{ uri: event.flyer_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
                <View className="w-full h-full justify-center items-center" style={{ backgroundColor: bgColor }}>
                    <Ionicons name="calendar" size={48} color="rgba(255,255,255,0.4)" />
                </View>
            )}
            {/* Text overlay */}
            <View className="absolute bottom-0 left-0 right-0 p-4 rounded-b-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                <Text className="text-lg font-extrabold text-white mb-1" numberOfLines={2}>{event.title}</Text>
                <Text className="text-[13px] text-white/90 leading-[18px]" numberOfLines={2}>{locationLine}{locationLine ? ' | ' : ''}{dateLine}</Text>
            </View>
        </TouchableOpacity>
    );
}

/* ── Main Screen ── */
export default function HeadmasterEventsTabScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [filterVisible, setFilterVisible] = useState(false);
    const [filters, setFilters] = useState<{ startDate: string; endDate: string; districtId: string }>({ startDate: '', endDate: '', districtId: '' });

    const { data: profileStatus, isLoading: profileLoading } = useQuery({
        queryKey: ['profile-status', user?.id],
        queryFn: async () => getProfileStatus(user!.id),
        enabled: !!user?.id,
    });

    const hasCompletedProfile = profileStatus?.has_completed_profile ?? false;
    const isActive = user?.is_active ?? false;

    const { data: events, isLoading, error, refetch, isRefetching } = useQuery<Event[]>({
        queryKey: ['school-events'],
        queryFn: async () => { try { return await getEvents(); } catch { return []; } },
        enabled: hasCompletedProfile && isActive,
    });

    const { data: districts = [], isLoading: loadingDistricts } = useQuery<District[]>({
        queryKey: ['districts'],
        queryFn: getDistricts,
    });

    // Refetch events when screen gains focus
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const filteredEvents = useMemo(() => {
        if (!events) return [];
        let list = [...events];
        if (filters.districtId) list = list.filter(e => e.district_id === filters.districtId);
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            list = list.filter(e => toJsDate(e.event_date) >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            list = list.filter(e => toJsDate(e.event_date) <= end);
        }
        return list;
    }, [events, filters]);

    if (profileLoading) {
        return <View className="flex-1 justify-center items-center bg-[#f5f5f5]"><ActivityIndicator size="large" color={BLUE} /></View>;
    }
    if (!hasCompletedProfile) {
        return (
            <View className="flex-1 bg-[#f5f5f5]">
                <View className="flex-row justify-between items-center px-4 pt-3 pb-2"><Text className="text-[26px] font-bold text-[#1a1a1a]">Events</Text></View>
                <StatusBanner message="Kindly complete your profile" />
            </View>
        );
    }
    if (!isActive) {
        return (
            <View className="flex-1 bg-[#f5f5f5]">
                <View className="flex-row justify-between items-center px-4 pt-3 pb-2"><Text className="text-[26px] font-bold text-[#1a1a1a]">Events</Text></View>
                <StatusBanner message="Your account is under verification" />
            </View>
        );
    }
    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#f5f5f5]">
                <ActivityIndicator size="large" color={BLUE} />
                <Text className="mt-3 text-gray-500">Loading events...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#f5f5f5]">
            {/* Top Row */}
            <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                <Text className="text-[26px] font-bold text-[#1a1a1a]">Events</Text>
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        className="rounded-3xl px-5 py-2.5"
                        style={{ backgroundColor: BLUE }}
                        onPress={() => router.push('/(protected)/headmaster/events/create')}
                    >
                        <Text className="text-white text-sm font-bold">Create Event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="w-10 h-10 rounded-full border-[1.5px] justify-center items-center" style={{ borderColor: BLUE }} onPress={() => setFilterVisible(true)}>
                        <Ionicons name="search" size={22} color={BLUE} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Events List */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => <EventCard key={event.id} event={event} districts={districts} onPress={() => router.push(`/(protected)/headmaster/events/${event.id}` as any)} />)
                ) : (
                    <View className="items-center pt-20">
                        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                        <Text className="text-lg font-semibold text-gray-500 mt-4">No Events</Text>
                        <Text className="text-sm text-gray-400 text-center mt-2">No events found. Tap "Create Event" to add one.</Text>
                    </View>
                )}
            </ScrollView>

            <SearchFilterModal
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                onApply={setFilters}
                districts={districts}
                loadingDistricts={loadingDistricts}
            />
        </View>
    );
}
