import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 7 }: TableSkeletonProps) {
  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <Skeleton className="h-3 w-20 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-800">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="py-4 px-4">
                  <Skeleton className="h-4 w-full max-w-[150px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========================================
// SCHOOLS TABLE SKELETON
// ========================================

export function SchoolsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-6 rounded" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-24 rounded" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-20 rounded" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-16 rounded" /></th>
              <th className="text-right px-4 py-3"><Skeleton className="h-3 w-16 rounded ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* # */}
                <td className="px-4 py-3.5">
                  <Skeleton className="h-4 w-6 rounded" />
                </td>
                {/* School Name — vary widths for realism */}
                <td className="px-4 py-3.5">
                  <Skeleton className={`h-4 rounded ${i % 3 === 0 ? 'w-56' : i % 3 === 1 ? 'w-44' : 'w-36'}`} />
                </td>
                {/* NBSE Code — badge shape */}
                <td className="px-4 py-3.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                {/* District */}
                <td className="px-4 py-3.5">
                  <Skeleton className={`h-4 rounded ${i % 2 === 0 ? 'w-24' : 'w-20'}`} />
                </td>
                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========================================
// SUBJECTS TABLE SKELETON
// ========================================

export function SubjectsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-6 rounded" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-14 rounded" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-3 w-14 rounded" /></th>
              <th className="text-right px-4 py-3"><Skeleton className="h-3 w-16 rounded ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* # */}
                <td className="px-4 py-3.5">
                  <Skeleton className="h-4 w-6 rounded" />
                </td>
                {/* Subject Name */}
                <td className="px-4 py-3.5">
                  <Skeleton className={`h-4 rounded ${i % 3 === 0 ? 'w-32' : i % 3 === 1 ? 'w-40' : 'w-28'}`} />
                </td>
                {/* Class — badge shape */}
                <td className="px-4 py-3.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                {/* Status — badge shape */}
                <td className="px-4 py-3.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </td>
                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Skeleton for table rows only (keeps headers visible)
interface TableRowsSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableRowsSkeleton({ rows = 8, columns = 7 }: TableRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-200 dark:border-slate-800">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="py-4 px-5">
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
