/**
 * RecentActivityFeed — Client Component
 *
 * Displays the 10 most recent audit log entries from Firestore,
 * auto-refreshing every 30 seconds via React Query.
 *
 * Uses the `useGetRecentAuditLogs` hook from `audit-logs.service.ts`
 * which queries the `audit_logs` Firestore collection.
 *
 * Each audit log entry shows:
 *   • Contextual icon & color based on the action type
 *   • Human-readable action name
 *   • Entity type and truncated entity ID
 *   • Relative timestamp (e.g. "5m ago", "2h ago")
 */

'use client';

import { motion } from 'framer-motion';
import {
    Activity,
    LogIn,
    LogOut,
    UserPlus,
    UserCheck,
    UserX,
    FileText,
    Send,
    CheckCircle,
    XCircle,
    Bell,

    Clock,
    Camera,
    UserCog,
    ClipboardList,
    ClipboardCheck,
    AlertTriangle,
    Upload,
    Ban,
    Lock,
} from 'lucide-react';
import { useGetRecentAuditLogs } from '@/services/audit-logs.service';

// ────────────────────── Action → Icon Mapping ──────────────────────

const actionIcons: Record<string, React.ElementType> = {
    'USER_LOGIN': LogIn,
    'USER_LOGOUT': LogOut,
    'USER_LOGIN_FAILED': XCircle,
    'USER_CREATED': UserPlus,
    'USER_REGISTERED': UserPlus,
    'USER_ACTIVATED': UserCheck,
    'USER_DEACTIVATED': UserX,
    'USER_UPDATED': UserCog,
    'USER_APPROVED': CheckCircle,
    'USER_REJECTED': Ban,
    'PROFILE_PHOTO_UPDATED': Camera,
    'PROFILE_UPDATED': UserCog,

    'FORM_SUBMITTED': FileText,
    'FORM_APPROVED': CheckCircle,
    'FORM_REJECTED': XCircle,
    'NOTICE_CREATED': Send,
    'NOTICE_PUBLISHED': Send,
    'NOTIFICATION_SENT': Bell,
    'TICKET_CREATED': FileText,
    'TICKET_RESOLVED': CheckCircle,
    'TASK_CREATED': ClipboardList,
    'TASK_ASSIGNED': ClipboardCheck,
    'TASK_UPDATED': ClipboardList,
    'TASK_STATUS_CHANGED': ClipboardList,
    'TASK_MARKED_SUSPICIOUS': AlertTriangle,
    'TASK_COMPLETED': ClipboardCheck,
    'EVENT_CREATED': Upload,
    'EVENT_UPLOADED': Upload,
    'EVENT_REJECTED_DUPLICATE': Ban,
    'EVENT_REJECTED_TASK_LOCKED': Lock,
    'FACULTY_APPROVED': CheckCircle,
};

// ────────────────────── Action → Color Mapping ──────────────────────

const actionColors: Record<string, { bg: string; icon: string }> = {
    'USER_LOGIN': { bg: 'bg-green-500/20', icon: 'text-green-400' },
    'USER_LOGOUT': { bg: 'bg-slate-500/20', icon: 'text-slate-400' },
    'USER_LOGIN_FAILED': { bg: 'bg-rose-600/20', icon: 'text-rose-400' },
    'USER_CREATED': { bg: 'bg-blue-500/20', icon: 'text-blue-400' },
    'USER_REGISTERED': { bg: 'bg-blue-400/20', icon: 'text-blue-300' },
    'USER_ACTIVATED': { bg: 'bg-emerald-500/20', icon: 'text-emerald-400' },
    'USER_DEACTIVATED': { bg: 'bg-gray-500/20', icon: 'text-gray-400' },
    'USER_UPDATED': { bg: 'bg-sky-500/20', icon: 'text-sky-400' },
    'USER_APPROVED': { bg: 'bg-emerald-600/20', icon: 'text-emerald-300' },
    'USER_REJECTED': { bg: 'bg-red-600/20', icon: 'text-red-400' },
    'PROFILE_PHOTO_UPDATED': { bg: 'bg-violet-500/20', icon: 'text-violet-400' },
    'PROFILE_UPDATED': { bg: 'bg-violet-400/20', icon: 'text-violet-300' },

    'FORM_SUBMITTED': { bg: 'bg-indigo-500/20', icon: 'text-indigo-400' },
    'FORM_APPROVED': { bg: 'bg-green-400/20', icon: 'text-green-300' },
    'FORM_REJECTED': { bg: 'bg-red-400/20', icon: 'text-red-300' },
    'NOTICE_CREATED': { bg: 'bg-teal-500/20', icon: 'text-teal-400' },
    'NOTICE_PUBLISHED': { bg: 'bg-teal-400/20', icon: 'text-teal-300' },
    'NOTIFICATION_SENT': { bg: 'bg-blue-500/20', icon: 'text-blue-300' },
    'TICKET_CREATED': { bg: 'bg-orange-500/20', icon: 'text-orange-400' },
    'TICKET_RESOLVED': { bg: 'bg-green-500/20', icon: 'text-green-300' },
    'TASK_CREATED': { bg: 'bg-purple-500/20', icon: 'text-purple-400' },
    'TASK_ASSIGNED': { bg: 'bg-blue-600/20', icon: 'text-blue-400' },
    'TASK_UPDATED': { bg: 'bg-purple-400/20', icon: 'text-purple-300' },
    'TASK_STATUS_CHANGED': { bg: 'bg-yellow-500/20', icon: 'text-yellow-400' },
    'TASK_MARKED_SUSPICIOUS': { bg: 'bg-red-500/20', icon: 'text-red-400' },
    'TASK_COMPLETED': { bg: 'bg-emerald-500/20', icon: 'text-emerald-300' },
    'EVENT_CREATED': { bg: 'bg-pink-500/20', icon: 'text-pink-400' },
    'EVENT_UPLOADED': { bg: 'bg-pink-400/20', icon: 'text-pink-300' },
    'EVENT_REJECTED_DUPLICATE': { bg: 'bg-amber-500/20', icon: 'text-amber-400' },
    'EVENT_REJECTED_TASK_LOCKED': { bg: 'bg-red-700/20', icon: 'text-red-300' },
    'FACULTY_APPROVED': { bg: 'bg-emerald-500/20', icon: 'text-emerald-400' },
};

// ────────────────────── Utility Functions ──────────────────────

/** Convert ACTION_NAME to "Action Name" for display */
function formatAction(action: string): string {
    return action
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Get human-friendly relative time string */
function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ────────────────────── Animation Variants ──────────────────────

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
    },
};

// ────────────────────── Component ──────────────────────

export default function RecentActivityFeed() {
    // Fetch 10 most recent audit logs with 30s auto-refresh (configured in the hook)
    const { data: activities, isLoading, isError } = useGetRecentAuditLogs(10);

    // ── Loading State ──
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Recent Activity
                </h3>
                <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <div className="flex-1">
                                <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                                <div className="h-2 w-1/4 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Empty / Error State ──
    if (isError || !activities?.length) {
        return (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Recent Activity
                </h3>
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                    <Clock className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                </div>
            </div>
        );
    }

    // ── Activity List ──
    return (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Recent Activity
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    Auto-refreshes
                </span>
            </div>

            <div className="space-y-1 max-h-100 overflow-y-auto pr-1">
                {activities.map((log, index) => {
                    const IconComponent = actionIcons[log.action] || Activity;
                    const colors = actionColors[log.action] || {
                        bg: 'bg-slate-500/20',
                        icon: 'text-slate-400',
                    };

                    return (
                        <motion.div
                            key={log.id}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                        >
                            {/* Action Icon */}
                            <div className={`p-2 rounded-full ${colors.bg} shrink-0`}>
                                <IconComponent className={`w-4 h-4 ${colors.icon}`} />
                            </div>

                            {/* Action Details */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">
                                    {formatAction(log.action)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {log.entity_type}
                                    {log.entity_id ? ` • ${log.entity_id.slice(0, 8)}...` : ''}
                                </p>
                            </div>

                            {/* Timestamp */}
                            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                {getRelativeTime(log.created_at)}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
