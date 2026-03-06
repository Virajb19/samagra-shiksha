'use client';

import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    ip_address: string | null;
    created_at: string;
}

interface AuditLogsHistogramProps {
    auditLogs: AuditLog[];
}

// Action colors for the histogram - vibrant gradient-friendly colors
const ACTION_COLORS: Record<string, string> = {
    // Auth actions
    'USER_LOGIN': '#10b981',
    'USER_LOGOUT': '#f43f5e',
    'USER_LOGIN_FAILED': '#dc2626',
    'USER_REGISTERED': '#8b5cf6',
    'USER_CREATED': '#3b82f6',
    'USER_ACTIVATED': '#22c55e',
    'USER_DEACTIVATED': '#78716c',
    // Profile actions
    'PROFILE_UPDATED': '#06b6d4',
    'PASSWORD_RESET': '#eab308',
    // Form actions
    'FORM_SUBMITTED': '#8b5cf6',
    'FORM_APPROVED': '#10b981',
    'FORM_REJECTED': '#f43f5e',
    // Notice actions
    'NOTICE_CREATED': '#0ea5e9',
    'NOTICE_PUBLISHED': '#0284c7',
    'NOTICE_UPDATED': '#38bdf8',
    // Task actions
    'TASK_CREATED': '#a855f7',
    'TASK_UPDATED': '#c084fc',
    'TASK_COMPLETED': '#6366f1',
    'TASK_DELETED': '#dc2626',
    // Event actions
    'EVENT_CREATED': '#f97316',
    'EVENT_UPLOADED': '#84cc16',
    'EVENT_UPDATED': '#fb923c',
    // Faculty actions
    'FACULTY_APPROVED': '#22d3ee',
    'FACULTY_REJECTED': '#f87171',
    'FACULTY_UPDATED': '#2dd4bf',
    // Ticket actions
    'TICKET_CREATED': '#f97316',
    'TICKET_RESOLVED': '#22c55e',
    'TICKET_UPDATED': '#fdba74',
    // Other actions
    'CIRCULAR_CREATED': '#ec4899',
    'CIRCULAR_UPDATED': '#f472b6',
    'SCHOOL_CREATED': '#7c3aed',
    'SCHOOL_UPDATED': '#a78bfa',
    'DISTRICT_CREATED': '#db2777',
    'DISTRICT_UPDATED': '#f472b6',
};

interface ActionCount {
    action: string;
    displayName: string;
    count: number;
    color: string;
}

export default function AuditLogsHistogram({ auditLogs }: AuditLogsHistogramProps) {
    // Aggregate logs by action type
    const actionCounts: ActionCount[] = (() => {
        if (!auditLogs || auditLogs.length === 0) return [];

        const counts: Record<string, number> = {};
        auditLogs.forEach((log) => {
            counts[log.action] = (counts[log.action] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([action, count]) => ({
                action,
                displayName: action
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, c => c.toUpperCase()),
                count,
                color: ACTION_COLORS[action] || '#64748b',
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 actions
    })();

    if (actionCounts.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Activity by Type
                </h3>
                <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                    No activity data
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm h-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                        <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    Activity by Type
                </h3>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {auditLogs.length} events
                </span>
            </div>

            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={actionCounts}
                        layout="vertical"
                        margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                    >
                        <XAxis
                            type="number"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                            domain={[0, 'dataMax']}
                        />
                        <YAxis
                            type="category"
                            dataKey="displayName"
                            stroke="#64748b"
                            fontSize={12}
                            width={115}
                            tickLine={false}
                            axisLine={false}
                            tick={({ x, y, payload }) => {
                                const item = actionCounts.find(a => a.displayName === payload.value);
                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        textAnchor="end"
                                        fill={item?.color || '#64748b'}
                                        fontSize={12}
                                        fontWeight={600}
                                        dy={4}
                                    >
                                        {payload.value}
                                    </text>
                                );
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--tooltip-bg, #1e293b)',
                                border: '1px solid var(--tooltip-border, #334155)',
                                borderRadius: '12px',
                                color: 'var(--tooltip-text, #f8fafc)',
                                fontSize: '13px',
                                padding: '10px 14px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                            }}
                            cursor={{ fill: 'rgba(100, 116, 139, 0.08)' }}
                            formatter={(value) => [`${value ?? 0} events`, 'Count']}
                        />
                        <Bar
                            dataKey="count"
                            radius={[0, 6, 6, 0]}
                            barSize={24}
                        >
                            {actionCounts.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    style={{ filter: 'brightness(1.1)' }}
                                />
                            ))}
                            <LabelList
                                dataKey="count"
                                position="right"
                                fill="#64748b"
                                fontSize={12}
                                fontWeight={600}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
