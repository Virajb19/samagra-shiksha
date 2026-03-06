'use client';

import { ClipboardList, FileSpreadsheet } from 'lucide-react';

export default function VocationalFormDataPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <FileSpreadsheet className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    Vocational Education
                </h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">View submitted form data for Vocational Education</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl py-16">
                <div className="text-center">
                    <ClipboardList className="h-16 w-16 text-slate-400 dark:text-slate-700 mx-auto mb-4" />
                    <div className="text-slate-500 dark:text-slate-400 text-lg">No data found</div>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">No form submissions yet.</p>
                </div>
            </div>
        </div>
    );
}
