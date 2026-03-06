'use client';

import { useState, useMemo, useCallback } from 'react';
import { Download, Search, FilterX, GraduationCap, Eye, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// ─── Animation Variants ────────────────────────────────────────────────
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

// ─── Dummy Data ────────────────────────────────────────────────────────
const SCHOOL_VISITS_DATA = [
    {
        id: 1,
        school: 'GPS Tokishe',
        district: 'Dimapur',
        ebrc: 'Dhansaripar',
        photos: 3,
        submittedBy: 'IE',
        rciNumber: 'Sjh273',
        nameOfCwSN: 'Ehd',
        disabilityType: 'Locomotor',
        gender: 'Male',
        activitiesTopics: 'Hebjw',
        therapyType: 'Jenebd',
        therapyBrief: 'Expressed, discussed',
        expectedOutcome: 'Improve personality',
        wasGoalAchieved: 'Yes',
    },
    {
        id: 2,
        school: 'GPS Tokishe',
        district: 'Dimapur',
        ebrc: 'Dhansaripar',
        photos: 2,
        submittedBy: 'Ramesh',
        rciNumber: 'rgdsdsg',
        nameOfCwSN: 'Bonoto',
        disabilityType: 'Type C',
        gender: 'Male',
        activitiesTopics: 'Basic Intro to Sign Language',
        therapyType: 'Verbal',
        therapyBrief: 'Explaining use of sign language',
        expectedOutcome: 'Using Sign Language to talk',
        wasGoalAchieved: 'Yes',
    },
    {
        id: 3,
        school: 'Riverine Public Higher Secondary School',
        district: 'Dimapur',
        ebrc: 'Dhansaripar',
        photos: 4,
        submittedBy: 'Inclusive Demo',
        rciNumber: 'Hsh7272737',
        nameOfCwSN: 'Rishav Sethi',
        disabilityType: 'Dyslexia',
        gender: 'Male',
        activitiesTopics: 'Taught',
        therapyType: 'Sjsb',
        therapyBrief: 'Hshaha',
        expectedOutcome: 'Benefittee',
        wasGoalAchieved: 'Yes',
    },
    {
        id: 4,
        school: 'GMS Chumukedima',
        district: 'Dimapur',
        ebrc: 'Chumukedima',
        photos: 1,
        submittedBy: 'Anita',
        rciNumber: 'Rci4421',
        nameOfCwSN: 'Limaso',
        disabilityType: 'Hearing Impairment',
        gender: 'Female',
        activitiesTopics: 'Sign Language Basics',
        therapyType: 'Speech',
        therapyBrief: 'Practiced lip reading exercises',
        expectedOutcome: 'Better communication',
        wasGoalAchieved: 'No',
    },
    {
        id: 5,
        school: 'GPS Sovima',
        district: 'Dimapur',
        ebrc: 'Dhansaripar',
        photos: 5,
        submittedBy: 'IE',
        rciNumber: 'Sjh980',
        nameOfCwSN: 'Temsunaro',
        disabilityType: 'Visual Impairment',
        gender: 'Female',
        activitiesTopics: 'Braille Reading',
        therapyType: 'Occupational',
        therapyBrief: 'Introduced Braille characters',
        expectedOutcome: 'Read basic Braille',
        wasGoalAchieved: 'Yes',
    },
    {
        id: 6,
        school: 'GHS Kohima Village',
        district: 'Kohima',
        ebrc: 'Kohima Town',
        photos: 2,
        submittedBy: 'Meren',
        rciNumber: 'Koh3392',
        nameOfCwSN: 'Visato',
        disabilityType: 'Cerebral Palsy',
        gender: 'Male',
        activitiesTopics: 'Motor Skills Training',
        therapyType: 'Physical',
        therapyBrief: 'Fine motor coordination drills',
        expectedOutcome: 'Improved hand control',
        wasGoalAchieved: 'Yes',
    },
    {
        id: 7,
        school: 'GMS Tseminyu',
        district: 'Kohima',
        ebrc: 'Tseminyu',
        photos: 3,
        submittedBy: 'Kevi',
        rciNumber: 'Koh5501',
        nameOfCwSN: 'Zhaleo',
        disabilityType: 'Autism',
        gender: 'Male',
        activitiesTopics: 'Social Skills',
        therapyType: 'Behavioral',
        therapyBrief: 'Group interaction games',
        expectedOutcome: 'Better peer interaction',
        wasGoalAchieved: 'Partially',
    },
    {
        id: 8,
        school: 'GPS Mon Town',
        district: 'Mon',
        ebrc: 'Mon Town',
        photos: 1,
        submittedBy: 'Longwa',
        rciNumber: 'Mon2211',
        nameOfCwSN: 'Wangpan',
        disabilityType: 'Intellectual Disability',
        gender: 'Male',
        activitiesTopics: 'Daily Living Skills',
        therapyType: 'Occupational',
        therapyBrief: 'Self-care routines practice',
        expectedOutcome: 'Independence in daily tasks',
        wasGoalAchieved: 'No',
    },
];

// ─── Export to XLSX (CSV fallback) ─────────────────────────────────────
function exportToXLSX(data: typeof SCHOOL_VISITS_DATA) {
    const headers = [
        'Sl.', 'School', 'District', 'EBRC', 'Submitted By', 'RCI Number',
        'Name of CwSN', 'Disability Type', 'Gender', 'Activities / Topics',
        'Therapy Type', 'Therapy (in brief)', 'Expected Outcome', 'Was Goal Achieved?',
    ];
    const rows = data.map((row, i) => [
        i + 1, `"${row.school}"`, row.district, row.ebrc, row.submittedBy,
        row.rciNumber, row.nameOfCwSN, row.disabilityType, row.gender,
        `"${row.activitiesTopics}"`, row.therapyType, `"${row.therapyBrief}"`,
        `"${row.expectedOutcome}"`, row.wasGoalAchieved,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ie_school_visits.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════
export default function SchoolVisitsPage() {
    const [districtFilter, setDistrictFilter] = useState<string>('all');
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
    }, []);

    const districts = useMemo(() => {
        const set = new Set<string>();
        SCHOOL_VISITS_DATA.forEach((r) => set.add(r.district));
        return Array.from(set).sort();
    }, []);

    const schools = useMemo(() => {
        const set = new Set<string>();
        const source = districtFilter !== 'all'
            ? SCHOOL_VISITS_DATA.filter((r) => r.district === districtFilter)
            : SCHOOL_VISITS_DATA;
        source.forEach((r) => set.add(r.school));
        return Array.from(set).sort();
    }, [districtFilter]);

    const filteredData = useMemo(() => {
        let data = SCHOOL_VISITS_DATA;
        if (districtFilter !== 'all') data = data.filter((r) => r.district === districtFilter);
        if (schoolFilter !== 'all') data = data.filter((r) => r.school === schoolFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(
                (r) =>
                    r.school.toLowerCase().includes(q) ||
                    r.nameOfCwSN.toLowerCase().includes(q) ||
                    r.submittedBy.toLowerCase().includes(q) ||
                    r.activitiesTopics.toLowerCase().includes(q),
            );
        }
        return data;
    }, [districtFilter, schoolFilter, searchQuery]);

    const hasFilters = districtFilter !== 'all' || schoolFilter !== 'all' || searchQuery.trim() !== '';

    return (
        <motion.div className="space-y-6 p-2" variants={containerVariants} initial={false} animate="visible">
            {/* Header */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2 bg-linear-to-br from-teal-500 to-cyan-600 rounded-lg"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <GraduationCap className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IE School Visits</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Inclusive Education school visit records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
                            {filteredData.length} Records
                        </Badge>
                        <motion.button
                            onClick={() => exportToXLSX(filteredData)}
                            disabled={filteredData.length === 0}
                            className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="shimmer-effect" />
                            <Download className="h-4 w-4" />
                            Download XLSX
                        </motion.button>
                        <motion.button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2.5 text-blue-600 dark:text-blue-400 border-2 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl font-semibold text-sm transition-all disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div
                className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-xl"
                variants={cardVariants}
            >
                <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
                    <div className="w-56">
                        <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); setSchoolFilter('all'); }}>
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
                    <div className="w-56">
                        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                            <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                                <SelectValue placeholder="All Schools" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Schools</SelectItem>
                                {schools.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, school..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <AnimatePresence>
                        {hasFilters && (
                            <motion.button
                                key="clear-btn"
                                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                onClick={() => { setDistrictFilter('all'); setSchoolFilter('all'); setSearchQuery(''); }}
                                className="flex items-center gap-2 px-5 py-3 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors text-sm"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FilterX className="h-4 w-4" />
                                Clear
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
                variants={cardVariants}
            >
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1400px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white">
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap w-14">Sl.</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[180px]">School</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">District</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">EBRC</th>
                                <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Photos</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Submitted By</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">RCI Number</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Name of CwSN</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Disability Type</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Gender</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[180px]">Activities / Topics</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Therapy Type</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[200px]">Therapy (in brief)</th>
                                <th className="text-left py-3.5 px-4 font-semibold text-xs whitespace-nowrap min-w-[200px]">Expected Outcome</th>
                                <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Was Goal Achieved?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                filteredData.map((row, index) => (
                                    <motion.tr
                                        key={row.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                        <td className="py-3.5 px-4">
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-mono">
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{row.school}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.district}</td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.ebrc}</td>
                                        <td className="py-3.5 px-4 text-center">
                                            <motion.button
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </motion.button>
                                        </td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.submittedBy}</td>
                                        <td className="py-3.5 px-4 text-sm font-mono text-slate-600 dark:text-slate-400">{row.rciNumber}</td>
                                        <td className="py-3.5 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">{row.nameOfCwSN}</td>
                                        <td className="py-3.5 px-4">
                                            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">
                                                {row.disabilityType}
                                            </Badge>
                                        </td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.gender}</td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.activitiesTopics}</td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.therapyType}</td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.therapyBrief}</td>
                                        <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300">{row.expectedOutcome}</td>
                                        <td className="py-3.5 px-4 text-center">
                                            <Badge className={`border-0 text-xs ${row.wasGoalAchieved === 'Yes'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : row.wasGoalAchieved === 'No'
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {row.wasGoalAchieved}
                                            </Badge>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={15} className="py-16 text-center bg-white dark:bg-transparent">
                                        <GraduationCap className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                                        <div className="text-slate-600 dark:text-slate-400 text-lg">No school visit records found</div>
                                        <p className="text-slate-500 text-sm mt-2">Adjust your filters or search query</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
