'use client';

import { motion } from 'framer-motion';
import {
    AlertTriangle,
    UserX,
    HelpCircle,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface PendingActionsSummary {
    inactive_users: number;
    pending_helpdesk: number;
    total: number;
}

interface PendingActionsWidgetProps {
    pendingActions: PendingActionsSummary;
}

// Pending action items configuration
const pendingItems = [
    {
        key: 'inactive_users',
        label: 'Inactive Users',
        icon: UserX,
        gradient: 'from-orange-500 to-amber-500',
        bgGradient: 'from-orange-500/10 to-amber-500/10',
        href: '/users?filter=inactive',
    },
    {
        key: 'pending_helpdesk',
        label: 'Helpdesk Tickets',
        icon: HelpCircle,
        gradient: 'from-red-500 to-rose-500',
        bgGradient: 'from-red-500/10 to-rose-500/10',
        href: '/helpdesk',
    },
];

export default function PendingActionsWidget({ pendingActions }: PendingActionsWidgetProps) {
    // if (isLoading) {
    //     return (
    //         <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl p-6 shadow-xl h-full">
    //             <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    //                 <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
    //                     <AlertTriangle className="w-4 h-4 text-white" />
    //                 </div>
    //                 Pending Actions
    //             </h3>
    //             <div className="grid grid-cols-2 gap-3">
    //                 {[...Array(4)].map((_, i) => (
    //                     <div key={i} className="p-4 rounded-xl bg-slate-800/50 animate-pulse">
    //                         <div className="h-8 w-8 rounded-lg bg-slate-700 mb-2" />
    //                         <div className="h-6 w-12 bg-slate-700 rounded mb-1" />
    //                         <div className="h-3 w-20 bg-slate-700 rounded" />
    //                     </div>
    //                 ))}
    //             </div>
    //         </div>
    //     );
    // }

    const totalPending = pendingActions?.total || 0;

    return (
        <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-xl h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    Pending Actions
                </h3>
                {totalPending > 0 ? (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                        {totalPending} pending
                    </span>
                ) : (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        All clear
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {pendingItems.map((item, index) => {
                    const count = pendingActions?.[item.key as keyof PendingActionsSummary] || 0;
                    const IconComponent = item.icon;

                    return (
                        <motion.div
                            key={item.key}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link
                                href={item.href}
                                className={`block p-4 rounded-xl bg-gradient-to-br ${item.bgGradient} border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600/50 transition-all duration-300 group hover:scale-[1.02] hover:shadow-lg`}
                            >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2 shadow-lg`}>
                                    <IconComponent className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className={`text-2xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                                            {count}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {item.label}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
