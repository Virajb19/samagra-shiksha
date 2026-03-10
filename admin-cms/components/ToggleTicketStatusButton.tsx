'use client';

import { CheckCircle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { helpdeskFirestore } from '@/services/firebase/helpdesk.firestore';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

interface ToggleTicketStatusButtonProps {
  ticketId: string;
  isResolved: boolean;
}

export function ToggleTicketStatusButton({ ticketId, isResolved }: ToggleTicketStatusButtonProps) {
  const queryClient = useQueryClient();
  const isDeletingAny = useIsMutating({ mutationKey: ['delete-ticket'] }) > 0;

  const toggleMutation = useMutation({
    mutationFn: helpdeskFirestore.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      showSuccessToast(
        isResolved ? 'Ticket set back to pending!' : 'Ticket marked as resolved!',
        3000
      );
    },
    onError: () => {
      showErrorToast('Failed to update ticket status. Please try again.');
    },
  });

  const isDisabled = toggleMutation.isPending || isDeletingAny;

  const Icon = isResolved ? RotateCcw : CheckCircle;
  const hoverColor = isResolved ? 'hover:text-yellow-400 hover:bg-yellow-400/10' : 'hover:text-emerald-400 hover:bg-emerald-400/10';
  const spinnerBorderColor = isResolved ? 'border-t-yellow-400' : 'border-t-emerald-400';
  const title = isResolved ? 'Set back to Pending' : 'Mark as Resolved';

  return (
    <motion.button
      onClick={() => toggleMutation.mutate(ticketId)}
      disabled={isDisabled}
      className={`p-2 text-slate-400 ${hoverColor} rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
      title={title}
      whileHover={{ scale: isDisabled ? 1 : 1.1 }}
      whileTap={{ scale: isDisabled ? 1 : 0.9 }}
    >
      {toggleMutation.isPending ? (
        <div className={`size-4 border-2 border-t-[3px] border-slate-200 dark:border-white/20 ${spinnerBorderColor} rounded-full animate-spin`} />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </motion.button>
  );
}
