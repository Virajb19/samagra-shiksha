'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
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
import { noticeFirestore } from '@/services/firebase/notice.firestore';
import { showErrorToast, showSuccessToast } from './ui/custom-toast';

interface DeleteNoticeButtonProps {
  noticeId: string;
  noticeTitle: string;
}

export function DeleteNoticeButton({ noticeId, noticeTitle }: DeleteNoticeButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => noticeFirestore.delete(noticeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccessToast(`Notice "${noticeTitle}" deleted`);
    },
    onError: (error) => {
      console.error('Failed to delete notice:', error);
      showErrorToast('Failed to delete notice');
      setShowDialog(false);
    },
  });

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={deleteMutation.isPending}
        className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
        title="Delete Notice"
      >
        {deleteMutation.isPending ? (
          <div className="size-5 border-2 border-t-[3px] border-slate-200 dark:border-white/20 border-t-red-600 rounded-full animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </button>

      <AlertDialog open={showDialog} onOpenChange={(open) => !deleteMutation.isPending && setShowDialog(open)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              Delete Notice?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete &quot;{noticeTitle}&quot;?
              <br />
              <span className="text-red-500 dark:text-red-400 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
                setShowDialog(false);
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-200 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

