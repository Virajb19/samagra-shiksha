'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { helpdeskFirestore } from '@/services/firebase/helpdesk.firestore';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';

interface DeleteTicketButtonProps {
  ticketId: string;
}

export function DeleteTicketButton({ ticketId }: DeleteTicketButtonProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationKey: ['delete-ticket'],
    mutationFn: helpdeskFirestore.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets'] });
      showSuccessToast('Ticket deleted successfully!', 3000);
    },
    onError: () => {
      showErrorToast('Failed to delete ticket. Please try again.');
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <motion.button
          disabled={deleteMutation.isPending}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
          title="Delete"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {deleteMutation.isPending ? (
            <div className='size-4 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-red-600 rounded-full animate-spin' />
          ) : (
            <Trash2 className="h-5 w-5 text-red-600" />
          )}
        </motion.button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-white">Delete Ticket</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this ticket? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate(ticketId)}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
