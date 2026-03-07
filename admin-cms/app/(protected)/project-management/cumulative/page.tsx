'use client';

import { useState, useMemo } from 'react';
import { Loader2, BarChart3, TrendingUp, Download, Search, FilterX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { RefreshTableButton } from '@/components/RefreshTableButton';
import { TableRowsSkeleton } from '@/components/TableSkeleton';
import {
  useGetCumulativeData,
  useGetAllProjectSchools,
} from '@/services/project-management.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PROJECT_SCHOOL_CATEGORIES,
  PAB_YEARS,
} from '@/lib/zod';

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

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CumulativeTablePage() {
  const [pabYearFilter, setPabYearFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const pabParam = pabYearFilter !== 'all' ? pabYearFilter : undefined;
  const distParam = districtFilter !== 'all' ? districtFilter : undefined;
  const catParam = categoryFilter !== 'all' ? categoryFilter : undefined;

  const { data: cumulativeData = [], isLoading, isFetching, isRefetching } = useGetCumulativeData(
    pabParam, distParam, catParam,
  );

  const { data: projectSchools = [] } = useGetAllProjectSchools();

  const districts = useMemo(() => {
    const set = new Set<string>();
    projectSchools.forEach((s) => set.add(s.district_name));
    return Array.from(set).sort();
  }, [projectSchools]);

  // Client-side search filter on activity name
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return cumulativeData;
    const q = searchQuery.toLowerCase();
    return cumulativeData.filter((item) => item.activity.toLowerCase().includes(q));
  }, [cumulativeData, searchQuery]);

  // Grand totals (based on filtered data)
  const grandTotals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => ({
        count: acc.count + item.count,
        totalSchools: acc.totalSchools + item.totalSchools,
        totalPhysical: acc.totalPhysical + item.totalPhysical,
        totalApproved: acc.totalApproved + item.totalApproved,
        totalExpenditure: acc.totalExpenditure + item.totalExpenditure,
        balance: acc.balance + item.balance,
        notStartedCount: acc.notStartedCount + item.notStartedCount,
        inProgressCount: acc.inProgressCount + item.inProgressCount,
        completedCount: acc.completedCount + item.completedCount,
      }),
      {
        count: 0, totalSchools: 0, totalPhysical: 0, totalApproved: 0,
        totalExpenditure: 0, balance: 0, notStartedCount: 0, inProgressCount: 0, completedCount: 0,
      },
    );
  }, [filteredData]);

  // Export to CSV
  const handleExport = () => {
    if (filteredData.length === 0) return;
    const headers = ['Sl No.', 'Activity', 'Total Schools', 'Total Physical', 'Total Budget (Lakhs)', 'Expenditure (Lakhs)', 'Balance', 'Not Started', 'In-Progress', 'Completed'];
    const rows = filteredData.map((item, i) => [
      i + 1, `"${item.activity}"`, item.totalSchools, item.totalPhysical,
      item.totalApproved, item.totalExpenditure, item.balance,
      item.notStartedCount, item.inProgressCount, item.completedCount,
    ].join(','));
    rows.push(['', 'GRAND TOTAL', grandTotals.totalSchools, grandTotals.totalPhysical,
      grandTotals.totalApproved, grandTotals.totalExpenditure, grandTotals.balance,
      grandTotals.notStartedCount, grandTotals.inProgressCount, grandTotals.completedCount,
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cumulative_table_${pabYearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div className="space-y-6 p-2" variants={containerVariants} initial={false} animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-linear-to-br from-emerald-500 to-teal-600 rounded-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cumulative Table</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Summary of projects by activity type</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 px-3 py-1">
              {filteredData.length} Activities · {grandTotals.count} Projects
            </Badge>
            <motion.button
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </motion.button>
            <RefreshTableButton queryKey={['cumulative-data', pabParam, distParam, catParam]} isFetching={isFetching} />
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-xl"
        variants={cardVariants}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="w-52">
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
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
          <div className="w-52">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
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
          <div className="w-48">
            <Select value={pabYearFilter} onValueChange={setPabYearFilter}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {PAB_YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <motion.button
            onClick={() => {
              setDistrictFilter('all');
              setCategoryFilter('all');
              setPabYearFilter('all');
              setSearchQuery('');
            }}
            className="flex items-center gap-2 px-5 py-3 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FilterX className="h-4 w-4" />
            Clear
          </motion.button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {!isLoading && filteredData.length > 0 && (() => {
        const utilizationPct = grandTotals.totalApproved > 0
          ? Math.min(100, Math.round((grandTotals.totalExpenditure / grandTotals.totalApproved) * 100))
          : 0;
        const cards = [
          {
            label: 'Total Projects',
            value: grandTotals.count.toLocaleString('en-IN'),
            subtitle: `${filteredData.length} activities`,
            accent: 'from-blue-500 to-indigo-600',
            glow: 'shadow-blue-500/20',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-500',
            icon: <BarChart3 className="h-5 w-5" />,
          },
          {
            label: 'Total Budget',
            value: `₹${fmt(grandTotals.totalApproved)}L`,
            subtitle: 'Approved amount',
            accent: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-500/20',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-500',
            icon: <TrendingUp className="h-5 w-5" />,
          },
          {
            label: 'Expenditure',
            value: `₹${fmt(grandTotals.totalExpenditure)}L`,
            subtitle: `${utilizationPct}% utilized`,
            accent: 'from-amber-500 to-orange-600',
            glow: 'shadow-amber-500/20',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-500',
            icon: <Download className="h-5 w-5" />,
            bar: utilizationPct,
          },
          {
            label: 'Balance',
            value: `₹${fmt(grandTotals.balance)}L`,
            subtitle: grandTotals.balance < 0 ? 'Over budget' : 'Remaining funds',
            accent: grandTotals.balance < 0 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600',
            glow: grandTotals.balance < 0 ? 'shadow-red-500/20' : 'shadow-violet-500/20',
            iconBg: grandTotals.balance < 0 ? 'bg-red-500/15' : 'bg-violet-500/15',
            iconColor: grandTotals.balance < 0 ? 'text-red-500' : 'text-violet-500',
            icon: <BarChart3 className="h-5 w-5" />,
          },
        ];
        return (
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-4" variants={itemVariants}>
            {cards.map((card) => (
              <motion.div
                key={card.label}
                className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shadow-lg ${card.glow}`}
                whileHover={{ scale: 1.03, y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Top accent strip */}
                <div className={`h-1 bg-gradient-to-r ${card.accent}`} />
                <div className="p-4 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.label}</span>
                    <div className={`p-2 rounded-lg ${card.iconBg} ${card.iconColor}`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white truncate mb-1">{card.value}</div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{card.subtitle}</p>
                  {/* Optional utilization bar */}
                  {card.bar !== undefined && (
                    <div className="mt-2.5 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${card.accent}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${card.bar}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        );
      })()}

      {/* Table */}
      <motion.div
        className="bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-xl"
        variants={cardVariants}
      >
        <div className="relative">
          {/* Refreshing overlay */}
          {isRefetching && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 px-6 py-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Refreshing...</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-50">
                <tr className="bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-800 dark:to-blue-700 text-white">
                  <th className="text-left py-3.5 px-5 font-semibold text-xs whitespace-nowrap">Sl No.</th>
                  <th className="text-left py-3.5 px-5 font-semibold text-xs whitespace-nowrap min-w-[200px]">Activity</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Total Schools</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Total Physical</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Total Budget (₹L)</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Expenditure (₹L)</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap">Balance (₹L)</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap bg-red-600 text-white">Not Started</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap bg-amber-500 text-white">In-Progress</th>
                  <th className="text-center py-3.5 px-4 font-semibold text-xs whitespace-nowrap bg-emerald-600 text-white">Completed</th>
                </tr>
              </thead>
              <tbody className={isRefetching ? 'blur-sm opacity-50 pointer-events-none transition-all duration-300' : 'transition-all duration-300'}>
                {isLoading ? (
                  <TableRowsSkeleton rows={17} columns={10} />
                ) : filteredData.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {filteredData.map((item, index) => {
                      const utilPct = item.totalApproved > 0
                        ? Math.min(100, Math.round((item.totalExpenditure / item.totalApproved) * 100))
                        : 0;
                      return (
                        <motion.tr
                          key={item.activity}
                          custom={index}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-mono">
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{item.activity}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 font-mono text-xs">
                              {item.totalSchools}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center text-sm text-slate-700 dark:text-slate-300 font-mono">
                            {item.totalPhysical.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center text-sm font-mono text-slate-700 dark:text-slate-300">
                            {fmt(item.totalApproved)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{fmt(item.totalExpenditure)}</span>
                              <div className="w-full max-w-[80px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${utilPct >= 75 ? 'bg-emerald-500' : utilPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${utilPct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className={`py-3.5 px-4 text-center text-sm font-mono font-semibold ${item.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                            {fmt(item.balance)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.notStartedCount > 0 ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 font-mono text-xs">
                                {item.notStartedCount}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.inProgressCount > 0 ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 font-mono text-xs">
                                {item.inProgressCount}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.completedCount > 0 ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-mono text-xs">
                                {item.completedCount}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">0</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                    {/* Grand Total Row */}
                    <motion.tr
                      key="grand-total"
                      className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/50 border-t-2 border-blue-500/30 dark:border-blue-400/30"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td className="py-4 px-5" />
                      <td className="py-4 px-5">
                        <span className="text-slate-900 dark:text-white text-sm font-bold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          GRAND TOTAL
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className="bg-blue-600/20 text-blue-700 dark:text-blue-400 border-0 font-mono text-sm font-bold">
                          {grandTotals.totalSchools}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center text-sm font-mono font-bold text-slate-800 dark:text-white">
                        {grandTotals.totalPhysical.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-center text-sm font-mono font-bold text-slate-800 dark:text-white">
                        {fmt(grandTotals.totalApproved)}
                      </td>
                      <td className="py-4 px-4 text-center text-sm font-mono font-bold text-slate-800 dark:text-white">
                        {fmt(grandTotals.totalExpenditure)}
                      </td>
                      <td className={`py-4 px-4 text-center text-sm font-mono font-bold ${grandTotals.balance < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                        {fmt(grandTotals.balance)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className="bg-red-600/20 text-red-700 dark:text-red-400 border-0 font-mono text-sm font-bold">
                          {grandTotals.notStartedCount}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-0 font-mono text-sm font-bold">
                          {grandTotals.inProgressCount}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-0 font-mono text-sm font-bold">
                          {grandTotals.completedCount}
                        </Badge>
                      </td>
                    </motion.tr>
                  </AnimatePresence>
                ) : (
                  <tr>
                    <td colSpan={10} className="py-16 text-center bg-white dark:bg-transparent">
                      <BarChart3 className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                      <div className="text-slate-600 dark:text-slate-400 text-lg">No cumulative data found</div>
                      <p className="text-slate-500 text-sm mt-2">Create some projects first to see the summary</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
