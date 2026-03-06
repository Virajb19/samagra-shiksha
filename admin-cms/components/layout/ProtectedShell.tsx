'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useNavigationStore, useAuthStore, useSidebarStore } from '@/lib/store';
import { twMerge } from 'tailwind-merge';

function NavigationLoader() {
  const isNavigating = useNavigationStore((state) => state.isNavigating);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 ml-72 z-50 flex items-center justify-center">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />

      {/* Infinity Spinner */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <img
          src="/Infinity@1x-1.0s-200px-200px.svg"
          alt="Loading..."
          width={120}
          height={120}
          className="drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />
        <p className="text-blue-500 dark:text-blue-400 text-lg font-medium animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

interface ProtectedShellProps {
  children: ReactNode;
}

export default function ProtectedShell({ children }: ProtectedShellProps) {
  const pathname = usePathname();
  const stopNavigation = useNavigationStore((state) => state.stopNavigation);
  const hydrate = useAuthStore((state) => state.hydrate);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  // Hydrate auth store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Stop navigation when pathname changes
  useEffect(() => {
    stopNavigation();
  }, [pathname, stopNavigation]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={twMerge("flex flex-col transition-all duration-300 ease-in-out", isCollapsed ? "ml-20" : "ml-72")}>
        <Header />
        <main className="p-6 w-full pb-8">
          {children}
        </main>
      </div>
      <NavigationLoader />
    </div>
  );
}
