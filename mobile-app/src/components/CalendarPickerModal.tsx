/**
 * Shared Calendar Picker Modal — used across all roles.
 * Custom month-grid calendar with month navigation and "Today" shortcut.
 */

import React, { useState, useMemo } from 'react';
import { AppText } from '@/components/AppText';
import { View, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#1565C0';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarPickerModalProps {
    visible: boolean;
    value: string;
    onSelect: (dateStr: string) => void;
    onClose: () => void;
}

export default function CalendarPickerModal({ visible, value, onSelect, onClose }: CalendarPickerModalProps) {
    const today = new Date();
    const init = value ? new Date(value) : today;
    const [vy, setVy] = useState(init.getFullYear());
    const [vm, setVm] = useState(init.getMonth());
    const sd = value ? new Date(value).getDate() : -1;
    const sm = value ? new Date(value).getMonth() : -1;
    const sy = value ? new Date(value).getFullYear() : -1;

    const days = useMemo(() => {
        const f = new Date(vy, vm, 1).getDay();
        const dim = new Date(vy, vm + 1, 0).getDate();
        const c: (number | null)[] = [];
        for (let i = 0; i < f; i++) c.push(null);
        for (let d = 1; d <= dim; d++) c.push(d);
        return c;
    }, [vy, vm]);

    const prev = () => { if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1); };
    const next = () => { if (vm === 11) { setVm(0); setVy(y => y + 1); } else setVm(m => m + 1); };
    const pick = (day: number) => {
        const m = String(vm + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onSelect(`${vy}-${m}-${d}`);
        onClose();
    };
    const isSel = (d: number) => d === sd && vm === sm && vy === sy;
    const isT = (d: number) => d === today.getDate() && vm === today.getMonth() && vy === today.getFullYear();

    if (!visible) return null;

    return (
        <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity className="flex-1 bg-black/45 justify-center items-center px-7" activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} className="bg-white rounded-[20px] py-5 px-4 w-full max-w-[360px]" style={{ elevation: 10 }}>
                    <View className="flex-row justify-between items-center mb-4 px-1">
                        <TouchableOpacity onPress={prev} className="p-1.5 rounded-lg bg-[#f0f4f8]"><Ionicons name="chevron-back" size={22} color={BLUE} /></TouchableOpacity>
                        <AppText className="text-[17px] font-bold" style={{ color: BLUE }}>{MONTHS[vm]} {vy}</AppText>
                        <TouchableOpacity onPress={next} className="p-1.5 rounded-lg bg-[#f0f4f8]"><Ionicons name="chevron-forward" size={22} color={BLUE} /></TouchableOpacity>
                    </View>
                    <View className="flex-row mb-2">{WEEKDAYS.map(w => <AppText key={w} className="flex-1 text-center text-xs font-semibold text-gray-400">{w}</AppText>)}</View>
                    <View className="flex-row flex-wrap">
                        {days.map((day, i) => {
                            const sel = day !== null && isSel(day);
                            const tod = day !== null && isT(day) && !sel;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    className={`justify-center items-center rounded-xl ${sel ? 'bg-[#1565C0]' : ''} ${tod ? 'bg-[#1565C0]' : ''}`}
                                    style={{ width: '14.28%', aspectRatio: 1 }}
                                    onPress={() => day && pick(day)}
                                    disabled={!day}
                                >
                                    {day ? (
                                        <AppText
                                            className={`text-sm font-medium ${sel ? 'text-white font-bold' : tod ? 'text-[#1565C0] font-bold' : 'text-gray-700'}`}
                                            style={{ textAlign: 'center', lineHeight: 18 }}
                                        >
                                            {day}
                                        </AppText>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {/* Today shortcut */}
                    <TouchableOpacity
                        className="self-center mt-3 px-5 py-2 rounded-[20px] bg-[#e8ecf4]"
                        onPress={() => {
                            setVy(today.getFullYear());
                            setVm(today.getMonth());
                            pick(today.getDate());
                        }}
                    >
                        <AppText className="text-[13px] font-semibold text-[#1565C0]">Today</AppText>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}
