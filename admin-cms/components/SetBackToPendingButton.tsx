'use client';

import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { helpdeskFirestore } from '@/services/firebase/helpdesk.firestore';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

interface SetBackToPendingButtonProps {
  ticketId: string;
}

export function SetBackToPendingButton({ ticketId }: SetBackToPendingButtonProps) {
  const queryClient = useQueryClient();
  const isDeletingAny = useIsMutating({ mutationKey: ['delete-ticket'] }) > 0;

  const toggleStatusMutation = useMutation({
    mutationFn: helpdeskFirestore.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      showSuccessToast('Ticket set back to pending!', 3000);
    },
    onError: () => {
      showErrorToast('Failed to update ticket status. Please try again.');
    },
  });

  const isDisabled = toggleStatusMutation.isPending || isDeletingAny;

  return (
    <motion.button
      onClick={() => toggleStatusMutation.mutate(ticketId)}
      disabled={isDisabled}
      className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="Set back to Pending"
      whileHover={{ scale: isDisabled ? 1 : 1.1 }}
      whileTap={{ scale: isDisabled ? 1 : 0.9 }}
    >
      {toggleStatusMutation.isPending ? (
        <div className='size-4 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-yellow-400 rounded-full animate-spin' />
      ) : (
        <RotateCcw className="h-5 w-5" />
      )}
    </motion.button>
  );
}

