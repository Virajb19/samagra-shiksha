'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore, useAuthStore, useSidebarStore } from '@/lib/store';
import Sidebar from './Sidebar';
import Header from './Header';
import Image from 'next/image';

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}

function NavigationLoader() {
    const isNavigating = useNavigationStore((state) => state.isNavigating);
    const isCollapsed = useSidebarStore((state) => state.isCollapsed);

    if (!isNavigating) return null;

    return (
        <div className={`fixed inset-0 ${isCollapsed ? 'ml-20' : 'ml-72'} z-50 flex items-center justify-center transition-all duration-300`}>
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <div className="relative z-10">
                <Image
                    src="/Spinner@1x-1.0s-200px-200px.svg"
                    alt="Loading..."
                    width={100}
                    height={100}
                    className="animate-spin"
                    priority
                />
            </div>
        </div>
    );
}

export default function MainLayout({ children }: MainLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const loading = useAuthStore((state) => state.loading);
    const hydrate = useAuthStore((state) => state.hydrate);
    const stopNavigation = useNavigationStore((state) => state.stopNavigation);

    // Hydrate auth on mount
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Stop navigation when pathname changes
    useEffect(() => {
        stopNavigation();
    }, [pathname, stopNavigation]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, loading, router]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Image
                        src="/Spinner@1x-1.0s-200px-200px.svg"
                        alt="Loading..."
                        width={100}
                        height={100}
                        className="animate-spin"
                        priority
                    />
                </div>
            </div>
        );
    }

    // Don't render if not authenticated (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    return (
        <MainContent>
            {children}
        </MainContent>
    );
}

function MainContent({ children }: { children: React.ReactNode }) {
    const isCollapsed = useSidebarStore((state) => state.isCollapsed);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content - uses dynamic margin based on sidebar state */}
            <div
                className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-72'}`}
            >
                <Header />
                <main className="flex-1 p-6 w-full">
                    {children}
                </main>
            </div>
            <NavigationLoader />
        </div>
    );
}
