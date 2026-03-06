'use client';

import { Badge } from '@/components/ui/badge';
import { useToggleUserStatus } from '@/services/user.service';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '@/lib/store';

interface UserStatusToggleProps {
  userId: string;
  isActive: boolean;
}

export function UserStatusToggle({
  userId,
  isActive,
}: UserStatusToggleProps) {
  const toggleStatusMutation = useToggleUserStatus();
  const role = useAuthStore((s) => s.role);

  // Only ADMIN and SUPER_ADMIN can toggle user status
  // Firestore security rules also enforce this server-side
  const canToggle = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const handleToggleStatus = async () => {
    if (!canToggle) return;
    const newStatus = !isActive;
    try {
      await toggleStatusMutation.mutateAsync({
        userId,
        isActive: newStatus,
      });
      showSuccessToast(
        newStatus
          ? 'User activated successfully!'
          : 'User deactivated successfully!',
        3000
      );
    } catch (err) {
      console.error('Failed to toggle user status', err);
      showErrorToast('Failed to update user status. Please try again.');
    }
  };

  // Non-admin users see a read-only badge
  if (!canToggle) {
    return (
      <Badge
        variant={isActive ? 'success' : 'destructive'}
        className={twMerge("min-w-18 flex justify-center", !isActive && "bg-red-600 dark:bg-red-500/80 text-white")}
      >
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  }

  return (
    <button
      onClick={handleToggleStatus}
      disabled={toggleStatusMutation.isPending}
      className="focus:outline-none"
    >
      <Badge
        variant={isActive ? 'success' : 'destructive'}
        className={twMerge("cursor-pointer hover:opacity-80 transition-opacity min-w-18 flex justify-center", !isActive && "bg-red-600 dark:bg-red-500/80 text-white")}
      >
        {toggleStatusMutation.isPending ? (
          <div className={twMerge("size-4 border-2 border-t-[3px] border-white/20 rounded-full animate-spin mr-2", isActive ? "border-t-emerald-400" : "border-t-red-400")} />
        ) : isActive ? (
          'Active'
        ) : (
          'Inactive'
        )}
      </Badge>
    </button>
  );
}
