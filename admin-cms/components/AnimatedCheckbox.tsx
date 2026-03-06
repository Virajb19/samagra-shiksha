'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCheckboxProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
}

export function AnimatedCheckbox({ checked, onCheckedChange, className }: AnimatedCheckboxProps) {
    return (
        <motion.button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                'group relative h-5 w-5 shrink-0 rounded-md border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 cursor-pointer',
                checked
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-transparent border-slate-400 dark:border-slate-500 hover:border-blue-400 dark:hover:border-blue-400',
                className
            )}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {/* Ripple ring effect */}
            <AnimatePresence>
                {checked && (
                    <motion.span
                        className="absolute inset-0 rounded-md border-2 border-blue-400"
                        initial={{ scale: 0.5, opacity: 0.6 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                )}
            </AnimatePresence>

            {/* Checkmark SVG */}
            <AnimatePresence mode="wait">
                {checked && (
                    <motion.svg
                        viewBox="0 0 14 14"
                        fill="none"
                        className="absolute inset-0 h-full w-full p-[2px]"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.5 }}
                    >
                        <motion.path
                            d="M3 7.5L5.5 10L11 4"
                            stroke="white"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            exit={{ pathLength: 0 }}
                            transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
                        />
                    </motion.svg>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
