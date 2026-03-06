'use client';

import { useAuthStore } from '@/lib/store';
import Image from 'next/image';
import { LogoutButton } from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfilePhotoDialog } from '@/components/ProfilePhotoDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get greeting based on time of day
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export default function Header() {
    const role = useAuthStore((state) => state.role);
    const userName = useAuthStore((state) => state.userName);
    const rawProfilePic = useAuthStore((state) => state.userProfilePic);
    // Guard against non-URL values (e.g. stale "[object Object]" in localStorage)
    const userProfilePic = (typeof rawProfilePic === 'string' && rawProfilePic.startsWith('http')) ? rawProfilePic : null;
    const [greeting, setGreeting] = useState('Welcome');
    const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

    useEffect(() => {
        setGreeting(getGreeting());
    }, []);

    // Animation variants for container
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    // Animation variants for text elements
    const textVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 100,
                damping: 12,
            },
        },
    };

    // Wave animation for the hand emoji
    const waveVariants = {
        wave: {
            rotate: [0, 14, -8, 14, -4, 10, 0],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 3,
            },
        },
    };

    // toast.success(userProfilePic)

    return (
        <header className="sticky top-0 z-50 bg-white/10 dark:bg-slate-900/60 backdrop-blur-lg border-l-[3px] border-b-[3px] border-slate-200 dark:border-slate-800">
            <div className="flex h-19 items-center justify-between px-6">

                {/* Left side - Animated Welcome Message */}
                <motion.div
                    className="flex items-center gap-2"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >

                    <motion.span
                        className="text-2xl md:text-4xl"
                        variants={waveVariants}
                        animate="wave"
                        style={{ display: 'inline-block', originX: 0.7, originY: 0.7 }}
                    >
                        👋
                    </motion.span>

                    <motion.h1
                        className="text-xl md:text-3xl font-bold text-slate-800 dark:text-white"
                        variants={textVariants}
                    >
                        {greeting}, <span className="uppercase bg-linear-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">{userName || 'Administrator'}</span>
                    </motion.h1>
                </motion.div>

                {/* User Info & Logout */}
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                    <div className="flex items-center gap-3">
                        {/* Profile Picture or Default Icon with Tooltip */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setIsPhotoDialogOpen(true)}
                                    className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-transform hover:scale-105"
                                >
                                    {userProfilePic ? (
                                        <div className="relative">
                                            <Image
                                                src={userProfilePic}
                                                alt={userName || 'User'}
                                                width={45}
                                                height={45}
                                                unoptimized={process.env.NODE_ENV === 'development'}
                                                // if you write "size-14" class it will make image round but will not cover the complete image and without this image will be fully covered but will not be round 
                                                className="rounded-full size-14 object-cover border-2 border-slate-200 dark:border-slate-700 group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-colors"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-slate-200 dark:border-slate-700 group-hover:border-blue-400 transition-colors">
                                            <svg className="w-6 h-6 text-white group-hover:hidden transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <Upload className="w-5 h-5 text-white hidden group-hover:block transition-opacity" />
                                        </div>
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="bottom"
                                sideOffset={8}
                                hideArrow
                                className="bg-[#F3F4F6] dark:bg-slate-800 text-gray-400 dark:text-white px-3 py-2 rounded-lg shadow-lg border border-transparent dark:border-slate-700"
                            >
                                <div className="flex items-center gap-2">
                                    {userProfilePic ? (
                                        <>
                                            <Camera className="w-4 h-4 text-blue-400" />
                                            <span className="font-medium">Update Photo</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 text-blue-400" />
                                            <span className="font-medium">Upload Photo</span>
                                        </>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>

                        {/* User Name & Role */}
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{userName || 'Administrator'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {role?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                    {/* Logout Button */}
                    <LogoutButton />
                </div>
            </div>

            {/* Profile Photo Dialog */}
            <ProfilePhotoDialog
                open={isPhotoDialogOpen}
                onOpenChange={setIsPhotoDialogOpen}
            />
        </header>
    );
}
