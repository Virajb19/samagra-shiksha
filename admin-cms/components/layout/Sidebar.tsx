'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationStore, useSidebarStore, useAuthStore } from '@/lib/store';
import { canAccessTab } from '@/lib/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { Home, Users, PenLine, Calendar, Bell, HelpCircle, ScrollText, ChevronLeft, ChevronDown, Menu, ClipboardList, Info, Wrench, GraduationCap, MailOpen } from "lucide-react";

type NavItem = {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: { name: string; href: string }[];
};

// All navigation items for admin sidebar (before role filtering)
const allNavItems: NavItem[] = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Users", href: "/users", icon: Users },
    { name: "Active Forms", href: "/active-forms", icon: ClipboardList },
    {
        name: "View Form Data", href: "/form-data", icon: Info,
        children: [
            { name: "ICT", href: "/form-data/ict" },
            { name: "Library", href: "/form-data/library" },
            { name: "Science Lab", href: "/form-data/science-lab" },
            { name: "Self Defence", href: "/form-data/self-defence" },
            { name: "Vocational Education", href: "/form-data/vocational-education" },
            { name: "KGBV", href: "/form-data/kgbv" },
            { name: "NSCBAV", href: "/form-data/nscbav" },
        ],
    },
    {
        name: "Project Management", href: "/project-management", icon: Wrench,
        children: [
            { name: "Add / View Schools", href: "/project-management/schools" },
            { name: "Add / View Projects", href: "/project-management/projects" },
            { name: "Projects Details", href: "/project-management/details" },
            { name: "Cumulative Table", href: "/project-management/cumulative" },
        ],
    },
    {
        name: "Inclusive Education", href: "/inclusive-education", icon: GraduationCap,
        children: [
            { name: "School Visits", href: "/inclusive-education/school-visits" },
            { name: "Home Visits", href: "/inclusive-education/home-visits" },
        ],
    },
    { name: "Circulars", href: "/circulars", icon: PenLine },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Invitations", href: "/invitations", icon: MailOpen },
    { name: "Audit Logs", href: "/audit-logs", icon: ScrollText },
    { name: "Helpdesk", href: "/helpdesk", icon: HelpCircle },
];


// Icon component 
type IconAnimation = "seesaw" | "bounce" | "rotate";

function Icon({ icon, isActive, animation = "seesaw" }: { icon: React.ReactNode; isActive: boolean, animation?: IconAnimation }) {
    return (
        <span className={twMerge("border rounded-full p-2",
            isActive && "border-transparent bg-blue-500",
            animation === "seesaw" && "group-hover:motion-preset-seesaw-lg",
            animation === "bounce" && "group-hover:motion-preset-bounce",
            animation === "rotate" && "group-hover:motion-rotate-in-[1turn]"
        )}>
            {icon}
        </span>
    );
}



export default function Sidebar() {
    const pathname = usePathname();
    const startNavigation = useNavigationStore((state) => state.startNavigation);
    const { isCollapsed, toggleSidebar } = useSidebarStore();
    const role = useAuthStore((state) => state.role);
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
        // Auto-expand if currently on a child route
        const expanded = new Set<string>();
        for (const item of allNavItems) {
            if (item.children && pathname.startsWith(item.href)) {
                expanded.add(item.name);
            }
        }
        return expanded;
    });

    // Filter navigation items based on user role
    const navItems = useMemo(() => {
        return allNavItems.filter(item => canAccessTab(role, item.href));
    }, [role]);

    const handleNavClick = (href: string) => {
        if (pathname !== href && !pathname.startsWith(href + '/')) {
            startNavigation();
        }
    };

    const toggleSubmenu = (name: string) => {
        setExpandedMenus(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    // Sidebar animation variants
    const sidebarVariants = {
        expanded: { width: 300 }, // w-72 = 18rem = 288px
        collapsed: { width: 80 }, // w-20 = 5rem = 80px
    };

    return (
        <motion.aside
            initial={false}
            animate={isCollapsed ? 'collapsed' : 'expanded'}
            variants={sidebarVariants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed left-0 top-0 z-40 h-screen bg-linear-to-b from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800/50"
        >
            {/* Logo / Brand */}
            <div className={`flex h-20 items-center border-b-[3px] border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}>
                {isCollapsed ? (
                    /* When collapsed - only show menu icon */
                    <motion.button
                        onClick={toggleSidebar}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-blue-800 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Menu className="w-6 h-6 text-white" />
                    </motion.button>
                ) : (
                    /* When expanded - show logo, title, and chevron */
                    <>
                        <motion.div
                            className="flex items-center gap-3 flex-1"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="overflow-hidden whitespace-nowrap flex-1">
                                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Secure Track</h1>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Admin CMS</p>
                            </div>
                        </motion.div>

                        {/* Collapse Toggle Button */}
                        <motion.button
                            onClick={toggleSidebar}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex flex-col h-[calc(100vh-5rem)] justify-between ${isCollapsed ? 'p-2' : 'p-4'} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent`}>
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const hasChildren = !!item.children?.length;
                        const isExpanded = expandedMenus.has(item.name);

                        if (hasChildren) {
                            return (
                                <li key={item.name}>
                                    {/* Parent button (not a link) */}
                                    <button
                                        onClick={() => {
                                            if (isCollapsed) {
                                                toggleSidebar();
                                                // Expand after sidebar opens
                                                setTimeout(() => setExpandedMenus(prev => new Set(prev).add(item.name)), 300);
                                            } else {
                                                toggleSubmenu(item.name);
                                            }
                                        }}
                                        title={isCollapsed ? item.name : undefined}
                                        className={`w-full flex group items-center ${isCollapsed ? 'justify-center px-2' : 'px-4 justify-between'} gap-3 py-3 border rounded-xl transition-all duration-200 ${isActive
                                            ? 'bg-linear-to-r from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon icon={<item.icon className="w-5 h-5" />} isActive={isActive} />
                                            <AnimatePresence>
                                                {!isCollapsed && (
                                                    <motion.span
                                                        initial={{ opacity: 0, width: 0 }}
                                                        animate={{ opacity: 1, width: 'auto' }}
                                                        exit={{ opacity: 0, width: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="font-medium whitespace-nowrap overflow-hidden"
                                                    >
                                                        {item.name}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </span>
                                        {!isCollapsed && (
                                            <motion.span
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </motion.span>
                                        )}
                                    </button>

                                    {/* Submenu */}
                                    <AnimatePresence>
                                        {isExpanded && !isCollapsed && (
                                            <motion.ul
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                className="overflow-hidden ml-6 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3"
                                            >
                                                {item.children!.map((child) => {
                                                    const isChildActive = pathname === child.href;
                                                    return (
                                                        <motion.li
                                                            key={child.href}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                        >
                                                            <Link
                                                                href={child.href}
                                                                onClick={() => handleNavClick(child.href)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isChildActive
                                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                                                    }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${isChildActive ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'}`} />
                                                                {child.name}
                                                            </Link>
                                                        </motion.li>
                                                    );
                                                })}
                                            </motion.ul>
                                        )}
                                    </AnimatePresence>
                                </li>
                            );
                        }

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={() => handleNavClick(item.href)}
                                    title={isCollapsed ? item.name : undefined}
                                    className={`flex group items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} gap-3 py-3 border rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-linear-to-r from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <Icon icon={<item.icon className="w-5 h-5" />} isActive={isActive} />
                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="font-medium whitespace-nowrap overflow-hidden"
                                            >
                                                {item.name}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </motion.aside>
    );
}
