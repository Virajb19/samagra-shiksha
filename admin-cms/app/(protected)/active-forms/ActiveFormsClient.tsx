'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { ClipboardList, CheckCircle2, XCircle, CalendarDays, Loader2 } from 'lucide-react';
import { activityFormsFirestore } from '@/services/firebase/activity-forms.firestore';
import { activityFormDateSchema, type ActivityFormDateSchema } from '@/lib/zod';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import type { ActivityForm } from '@/types';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const tableRowVariants = {
    hidden: { opacity: 0, x: -40 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.05, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
    }),
};

// ── Helpers ──

function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function StatusBadge({ status }: { status: 'Active' | 'Inactive' | 'Closed' }) {
    const styles = {
        Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        Inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        Closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    };
    return (
        <Badge
            variant={status === 'Active' ? 'success' : status === 'Inactive' ? 'outline' : 'destructive'}
            className={styles[status]}
        >
            {status}
        </Badge>
    );
}

// ── Open Form Dialog ──

function OpenFormDialog({
    form,
    open,
    onOpenChange,
    onSuccess,
}: {
    form: ActivityForm;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const openMutation = useMutation({
        mutationFn: ({ formId, startingDate, endingDate }: {
            formId: string;
            startingDate: string;
            endingDate: string;
        }) => activityFormsFirestore.openForm(formId, startingDate, endingDate),
        onSuccess: () => {
            showSuccessToast('Form opened successfully');
            onSuccess();
        },
        onError: (error: unknown) => {
            console.error('Error opening form:', error);
            showErrorToast('Failed to open form. Please try again.');
        },
    });

    const formHook = useForm<ActivityFormDateSchema>({
        resolver: zodResolver(activityFormDateSchema),
        defaultValues: {
            starting_date: '',
            ending_date: '',
        },
    });

    const onSubmit = (values: ActivityFormDateSchema) => {
        openMutation.mutate(
            {
                formId: form.id,
                startingDate: values.starting_date,
                endingDate: values.ending_date,
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    formHook.reset();
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) formHook.reset();
            onOpenChange(isOpen);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{form.name}</DialogTitle>
                    <DialogDescription>
                        Set the starting and ending dates to open this form.
                    </DialogDescription>
                </DialogHeader>

                <Form {...formHook}>
                    <form onSubmit={formHook.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={formHook.control}
                                name="starting_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Starting Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={formHook.control}
                                name="ending_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ending Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={openMutation.isPending}
                            className="w-full bg-blue-500 hover:bg-blue-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600"
                            size="lg"
                        >
                            {openMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Opening...
                                </>
                            ) : (
                                'Submit'
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ── Close Form AlertDialog ──

function CloseFormAlertDialog({
    form,
    open,
    onOpenChange,
    onSuccess,
}: {
    form: ActivityForm;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const closeMutation = useMutation({
        mutationFn: (formId: string) => activityFormsFirestore.closeForm(formId),
        onSuccess: () => {
            showSuccessToast('Form closed successfully');
            onSuccess();
        },
        onError: (error: unknown) => {
            console.error('Error closing form:', error);
            showErrorToast('Failed to close form. Please try again.');
        },
    });

    const handleClose = () => {
        closeMutation.mutate(form.id, {
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Close {form.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to close the <strong>{form.name}</strong> form? Users will no longer be able to submit responses.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={closeMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleClose()
                        }}
                        disabled={closeMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {closeMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Closing...
                            </>
                        ) : (
                            'Close Form'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ── Props ──

interface ActiveFormsClientProps {
    initialForms: ActivityForm[];
}

// ── Main Client Component ──

export default function ActiveFormsClient({ initialForms }: ActiveFormsClientProps) {
    const router = useRouter();
    const [openDialogForm, setOpenDialogForm] = useState<ActivityForm | null>(null);
    const [closeDialogForm, setCloseDialogForm] = useState<ActivityForm | null>(null);

    const handleSuccess = () => router.refresh();

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Page Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                variants={itemVariants}
            >
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <ClipboardList className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        Active Forms
                    </h1>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Manage and monitor all active forms
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Total Forms: </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{initialForms.length}</span>
                    </div>
                </div>
            </motion.div>

            {/* Forms Table */}
            <motion.div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl overflow-hidden"
                variants={cardVariants}
            >
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                            <th className="w-[70px] text-left py-4 px-5 text-white font-semibold text-sm">Sl No.</th>
                            <th className="text-left py-4 px-5 text-white font-semibold text-sm">Form</th>
                            <th className="text-left py-4 px-5 text-white font-semibold text-sm">
                                <CalendarDays className="h-4 w-4 inline mr-1.5 opacity-80" />
                                Starting Date
                            </th>
                            <th className="text-left py-4 px-5 text-white font-semibold text-sm">
                                <CalendarDays className="h-4 w-4 inline mr-1.5 opacity-80" />
                                Ending Date
                            </th>
                            <th className="w-[110px] text-left py-4 px-5 text-white font-semibold text-sm">Status</th>
                            <th className="w-[200px] text-left py-4 px-5 text-white font-semibold text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {initialForms.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-20">
                                    <motion.div
                                        className="text-center"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                        <div className="text-slate-500 dark:text-slate-400 font-medium">No forms found</div>
                                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                            Seed the database to create activity forms.
                                        </p>
                                    </motion.div>
                                </td>
                            </tr>
                        ) : (
                            initialForms.map((form, index) => (
                                <motion.tr
                                    key={form.id}
                                    custom={index}
                                    variants={tableRowVariants}
                                    className="group hover:bg-blue-50/60 dark:hover:bg-slate-800/40 transition-colors duration-150"
                                >
                                    <td className="py-4 px-5">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="py-4 px-5">
                                        <span className="font-semibold text-slate-900 dark:text-white text-[15px]">
                                            {form.name}
                                        </span>
                                    </td>
                                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400 text-sm">
                                        {formatDate(form.starting_date)}
                                    </td>
                                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400 text-sm">
                                        {formatDate(form.ending_date)}
                                    </td>
                                    <td className="py-4 px-5">
                                        <StatusBadge status={form.status} />
                                    </td>
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setOpenDialogForm(form)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40"
                                                title="Open / Update dates"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Open
                                            </button>
                                            <button
                                                onClick={() => setCloseDialogForm(form)}
                                                disabled={form.status === 'Closed'}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.status === 'Closed' ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-100 dark:text-slate-500 dark:bg-slate-800' : 'text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40'}`}
                                                title={form.status === 'Closed' ? 'Form is already closed' : 'Close Form'}
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Close
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </motion.div>

            {/* Open Form Dialog */}
            {openDialogForm && (
                <OpenFormDialog
                    form={openDialogForm}
                    open={!!openDialogForm}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) setOpenDialogForm(null);
                    }}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Close Form AlertDialog */}
            {closeDialogForm && (
                <CloseFormAlertDialog
                    form={closeDialogForm}
                    open={!!closeDialogForm}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) setCloseDialogForm(null);
                    }}
                    onSuccess={handleSuccess}
                />
            )}
        </motion.div>
    );
}
