import { UserRole } from '@/types';

/**
 * Role-Based Access Control Configuration for Admin CMS
 * 
 * This file defines which roles can access which parts of the CMS.
 */

// ========================================
// CMS ALLOWED ROLES
// ========================================
// All roles that are allowed to access the Admin CMS
export const CMS_ALLOWED_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

// ========================================
// TAB PATH PERMISSIONS
// ========================================
// Define which tab paths each role can access
// '*' means all paths (full access)
export const ROLE_TAB_ACCESS: Record<UserRole, string[]> = {
  // Full admin access
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: ['*'],

  // Mobile app roles - no CMS access
  [UserRole.HEADMASTER]: [],
  [UserRole.TEACHER]: [],
  [UserRole.IE_RESOURCE_PERSON]: [],
  [UserRole.KGBV_WARDEN]: [],
  [UserRole.NSCBAV_WARDEN]: [],
  [UserRole.JUNIOR_ENGINEER]: [],
};

// ========================================
// NAVIGATION ITEMS CONFIG
// ========================================
// Maps sidebar navigation items to their permission paths
export const NAV_ITEM_PATHS: Record<string, string> = {
  'Home': '/dashboard',
  'Users': '/users',
  'Active Forms': '/active-forms',
  'View Form Data': '/form-data',
  'Project Management': '/project-management',
  'Inclusive Education': '/inclusive-education',
  'Circulars': '/circulars',
  'Events': '/events',
  'Notifications': '/notifications',
  'Invitations': '/invitations',
  'Audit Logs': '/audit-logs',
  'Helpdesk': '/helpdesk',
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if a role is allowed to access the CMS
 */
export function isCmsRole(role: UserRole | null): boolean {
  return role !== null && CMS_ALLOWED_ROLES.includes(role);
}

/**
 * Check if a role can access a specific path
 */
export function canAccessTab(role: UserRole | null, path: string): boolean {
  if (!role) return false;

  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed) return false;

  // Wildcard means all paths allowed
  if (allowed.includes('*')) return true;

  // Check if path matches any allowed path (including sub-routes)
  return allowed.some(tab => path === tab || path.startsWith(`${tab}/`));
}

/**
 * Get all allowed paths for a role
 */
export function getAllowedPaths(role: UserRole | null): string[] {
  if (!role) return [];
  return ROLE_TAB_ACCESS[role] || [];
}

/**
 * Get the default/home path for a role
 */
export function getDefaultPath(role: UserRole | null): string {
  if (!role) return '/login';

  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed || allowed.length === 0) return '/login';

  // Wildcard means dashboard
  if (allowed.includes('*')) return '/dashboard';

  // Return first allowed path
  return allowed[0];
}

/**
 * Filter navigation items based on role
 */
export function filterNavItemsByRole<T extends { href: string }>(
  items: T[],
  role: UserRole | null
): T[] {
  if (!role) return [];

  const allowed = ROLE_TAB_ACCESS[role];
  if (!allowed) return [];

  // Wildcard means all items
  if (allowed.includes('*')) return items;

  return items.filter(item =>
    allowed.some(tab => item.href === tab || item.href.startsWith(`${tab}/`))
  );
}
