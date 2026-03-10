'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { showErrorToast, showSuccessToast } from './ui/custom-toast';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsFirestore } from '@/services/firebase/events.firestore';

interface DeleteEventButtonProps {
  eventId: string;
  eventTitle: string;
  onDeletingChange?: (isDeleting: boolean) => void;
}

export function DeleteEventButton({ eventId, eventTitle, onDeletingChange }: DeleteEventButtonProps) {
  const [open, setOpen] = useState(false);

  // Check if any delete-event mutation is in progress
  const isDeletingAny = useIsMutating({ mutationKey: ['delete-event'] }) > 0;

  const queryClient = useQueryClient();

  const deleteEventMutation = useMutation({
    mutationKey: ['delete-event'],
    mutationFn: async (eventId: string) => {
      return eventsFirestore.delete(eventId);
    },
    onSuccess: () => {
      showSuccessToast('Event deleted successfully');
      setOpen(false);
    },
    onError: (error: any) => {
      console.log(error?.response?.data?.message || 'Failed to delete event');
      showErrorToast(error?.response?.data?.message || 'Failed to delete event');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['events-infinite'], exact: false });
    }
  })

  const handleDelete = async () => {
    try {
      onDeletingChange?.(true);
      await deleteEventMutation.mutateAsync(eventId);
    } catch (error: any) {
      console.log('Error deleting event:', error);
    } finally {
      onDeletingChange?.(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <motion.button
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete"
          whileHover={{ scale: isDeletingAny ? 1 : 1.1 }}
          whileTap={{ scale: isDeletingAny ? 1 : 0.9 }}
          disabled={deleteEventMutation.isPending}
        >
          {deleteEventMutation.isPending ? (
            <div className='size-4 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-red-600 rounded-full animate-spin' />
          ) : (
            <Trash2 size={18} />
          )}
        </motion.button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900 dark:text-white text-lg font-semibold">Delete Event</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete "{eventTitle}"?
            <br />
            <span className="text-red-500 dark:text-red-400 font-medium">This action cannot be undone.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 mt-4">
          <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteEventMutation.isPending}
            className="bg-red-600 text-white hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
