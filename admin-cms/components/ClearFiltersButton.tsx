'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FilterX } from 'lucide-react';

interface ClearFiltersButtonProps {
    hasActiveFilters: boolean;
    onClear: () => void;
}

export function ClearFiltersButton({ hasActiveFilters, onClear }: ClearFiltersButtonProps) {
    return (
        <AnimatePresence>
            {hasActiveFilters && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: 'auto' }}
                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={onClear}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer
            bg-red-500/10 text-red-500 border border-red-500/20
            hover:bg-red-500/20 hover:border-red-500/40
            dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20
            dark:hover:bg-red-500/20 dark:hover:border-red-500/40
            transition-colors duration-200 whitespace-nowrap overflow-hidden"
                >
                    <motion.div
                        animate={{ rotate: [0, -15, 15, -10, 0] }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
                        <FilterX className="h-4 w-4 shrink-0" />
                    </motion.div>
                    Clear Filters
                </motion.button>
            )}
        </AnimatePresence>
    );
}
