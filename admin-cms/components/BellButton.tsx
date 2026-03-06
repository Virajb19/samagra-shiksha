'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface BellButtonProps {
    onClick: () => void;
    disabled: boolean;
}

export function BellButton({ onClick, disabled }: BellButtonProps) {
    const [ringCount, setRingCount] = useState(0);
    const bellAudioRef = useRef<HTMLAudioElement | null>(null);

    // Preload bell sound once on mount
    useEffect(() => {
        bellAudioRef.current = new Audio('/bell.mp3');
        bellAudioRef.current.volume = 0.5;
    }, []);

    const handleClick = () => {
        // Play bell sound
        if (bellAudioRef.current) {
            bellAudioRef.current.currentTime = 0;
            bellAudioRef.current.play().catch(() => { });
        }
        onClick();
        setRingCount(prev => prev + 1);
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className="p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-90 hover:shadow-md hover:shadow-amber-500/10 cursor-pointer"
            title="Send Reminder"
            style={{ transformOrigin: 'top center' }}
        >
            <motion.div
                key={ringCount}
                animate={ringCount > 0 ? { rotate: [0, -25, 25, -20, 20, -15, 15, -8, 8, -3, 0] } : {}}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                style={{ transformOrigin: 'top center' }}
            >
                <Bell className="h-[18px] w-[18px]" />
            </motion.div>
        </button>
    );
}
