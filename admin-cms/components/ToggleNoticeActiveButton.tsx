'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Power, PowerOff } from 'lucide-react';
import noticesService from '@/services/notices.service';

interface ToggleNoticeActiveButtonProps {
  noticeId: string;
  isActive: boolean;
}

export function ToggleNoticeActiveButton({ noticeId, isActive }: ToggleNoticeActiveButtonProps) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => noticesService.toggleActive(noticeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (error) => {
      console.error('Failed to toggle notice status:', error);
    },
  });

  return (
    <motion.button
      onClick={() => toggleMutation.mutate()}
      disabled={toggleMutation.isPending}
      className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
        isActive
          ? 'text-emerald-600 dark:text-emerald-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-400/10'
          : 'text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-400/10'
      }`}
      title={isActive ? 'Deactivate Notice' : 'Activate Notice'}
      whileHover={{ scale: toggleMutation.isPending ? 1 : 1.1 }}
      whileTap={{ scale: toggleMutation.isPending ? 1 : 0.9 }}
    >
      {toggleMutation.isPending ? (
        <div className="size-5 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-emerald-600 rounded-full animate-spin" />
      ) : isActive ? (
        <Power className="h-5 w-5" />
      ) : (
        <PowerOff className="h-5 w-5" />
      )}
    </motion.button>
  );
}
