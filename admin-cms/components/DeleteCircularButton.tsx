'use client';

import { useState } from 'react';
import { Loader, Loader2, Trash, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { circularFirestore } from '@/services/firebase/circular.firestore';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { showErrorToast, showSuccessToast } from './ui/custom-toast';

interface DeleteCircularButtonProps {
  circularId: string;
  disabled?: boolean;
}

export function DeleteCircularButton({
  circularId,
  disabled = false,
}: DeleteCircularButtonProps) {

  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await circularFirestore.delete(userId || 'unknown', circularId)
    },
    onSuccess: () => {
      showSuccessToast('Circular deleted successfully', 4000);
      setOpen(false);
    },
    onError: (error) => {
      console.error('Failed to delete circular', error);
      showErrorToast('Failed to delete circular. Please try again.', 10 * 1000);
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['circulars'] });
    }
  })

  return (
    <>
      <button
        disabled={disabled || deleteMutation.isPending}
        onClick={() => setOpen(true)}
        title="Delete Circular"
        className='p-2 rounded-lg text-red-500 hover:bg-red-500/30 transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
      >
        {deleteMutation.isPending ? (
          <div className='size-4 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-red-600 rounded-full animate-spin' />
        ) : (
          <Trash className="h-5 w-5" />
        )}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 shadow-2xl rounded-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white text-lg font-semibold">Delete Circular?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              This action will remove the circular from all users.
              <br />
              <span className="text-red-500 dark:text-red-400 font-medium">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className='bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all duration-200'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutateAsync()}
              className="bg-red-600 hover:bg-red-700 cursor-pointer transition-all duration-200"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
