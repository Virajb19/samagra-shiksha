'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityFormsFirestore } from './firebase/activity-forms.firestore';
import type { ActivityForm } from '@/types';
import { showErrorToast, showSuccessToast } from '@/components/ui/custom-toast';

/* =========================
   Activity Forms Queries
========================= */

export const useActivityForms = () => {
    return useQuery<ActivityForm[]>({
        queryKey: ['activity-forms'],
        queryFn: () => activityFormsFirestore.getAll(),
    });
};

export const useOpenActivityForm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ formId, startingDate, endingDate }: {
            formId: string;
            startingDate: string;
            endingDate: string;
        }) => activityFormsFirestore.openForm(formId, startingDate, endingDate),
        onSuccess: () => {
            showSuccessToast('Form opened successfully');
            queryClient.invalidateQueries({ queryKey: ['activity-forms'] });
        },
        onError: (error: unknown) => {
            console.error('Error opening form:', error);
            showErrorToast('Failed to open form. Please try again.');
        },
    });
};

export const useCloseActivityForm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formId: string) => activityFormsFirestore.closeForm(formId),
        onSuccess: () => {
            showSuccessToast('Form closed successfully');
            queryClient.invalidateQueries({ queryKey: ['activity-forms'] });
        },
        onError: (error: unknown) => {
            console.error('Error closing form:', error);
            showErrorToast('Failed to close form. Please try again.');
        },
    });
};
