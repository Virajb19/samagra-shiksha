'use client';

import { useState, useCallback } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AnimatedCircularProgressBar from '@/components/ui/AnimatedCircularProgressBar';
import { useAuthStore } from '@/lib/store';
import { uploadProfilePhoto } from '@/services/user.service';
import { showErrorToast, showSuccessToast } from './ui/custom-toast';
import { sleep } from '@/lib/utils';

// Register FilePond plugins
registerPlugin(
    FilePondPluginImagePreview,
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize
);

// Validation constants (must match backend)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_FILE_SIZE_MB = '5MB';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = 'JPEG, PNG';

interface ProfilePhotoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function ProfilePhotoDialog({ open, onOpenChange }: ProfilePhotoDialogProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [progress, setProgress] = useState(0);

    const updateProfilePhoto = useAuthStore((state) => state.updateProfilePhoto);

    /**
     * Client-side validation before upload
     */
    const validateFile = useCallback((file: File): string | null => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return `File size exceeds ${MAX_FILE_SIZE_MB}. Please choose a smaller image.`;
        }

        // Check file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return `Invalid file type. Allowed formats: ${ALLOWED_EXTENSIONS}`;
        }

        return null; // Valid
    }, []);

    const handleUpload = useCallback(async () => {
        if (files.length === 0) return;

        const file = files[0];

        // Client-side validation
        const validationError = validateFile(file);
        if (validationError) {
            showErrorToast(validationError, 4000)
            return;
        }

        setUploadState('uploading');
        setProgress(0);

        // Artificial progress: smoothly climb 0→70% while upload is in flight
        // Real axios onUploadProgress jumps to ~90% instantly for small files
        let artificialProgress = 0;
        const progressInterval = setInterval(() => {
            artificialProgress += Math.random() * 8 + 12; // increment 12-20% each tick
            if (artificialProgress > 90) artificialProgress = 90;
            setProgress(Math.round(artificialProgress));
        }, 1200);

        try {
            // Upload directly to Firebase Storage with real progress tracking
            const photoUrl = await uploadProfilePhoto(file);

            clearInterval(progressInterval);
            const currentProgress = Math.round(artificialProgress);
            for (let value = currentProgress; value <= 100; value += 1) {
                setProgress(value);
                await sleep(0.2);
            }

            setProgress(100);

            // Update local auth state
            updateProfilePhoto(photoUrl);

            setUploadState('success');
            showSuccessToast('Profile photo updated successfully!', 4000);

            // Close dialog after a short delay
            setTimeout(() => {
                onOpenChange(false);
                setUploadState('idle');
                setFiles([]);
                setProgress(0);
            }, 2500);

        } catch (error) {
            console.error('Upload failed:', error);
            setUploadState('error');

            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to upload profile photo';

            showErrorToast(errorMessage, 4000);

            setTimeout(() => {
                setUploadState('idle');
                setProgress(0);
            }, 2000);
        }
    }, [files, validateFile, updateProfilePhoto, onOpenChange]);

    const handleClose = () => {
        if (uploadState !== 'uploading') {
            onOpenChange(false);
            setFiles([]);
            setUploadState('idle');
            setProgress(0);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Camera className="w-5 h-5 text-blue-500" />
                        Update Profile Photo
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <AnimatePresence mode="wait">
                        {uploadState === 'idle' && (
                            <motion.div
                                key="filepond"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="filepond-wrapper">
                                    <FilePond
                                        files={files}
                                        onupdatefiles={(fileItems) => {
                                            setFiles(fileItems.map(item => item.file as File));
                                        }}
                                        onwarning={(error) => {
                                            // Handle file validation warnings from FilePond
                                            if (error.body === 'Max file size exceeded') {
                                                toast.error(`File size exceeds ${MAX_FILE_SIZE_MB}. Please choose a smaller image.`, {
                                                    duration: 4000,
                                                    icon: '⚠️',
                                                });
                                            }
                                        }}
                                        onerror={(error) => {
                                            // Handle file validation errors from FilePond
                                            const errorMessage = typeof error.body === 'string'
                                                ? error.body
                                                : 'Invalid file selected';
                                            toast.error(errorMessage, {
                                                duration: 4000,
                                                icon: '❌',
                                            });
                                        }}
                                        allowMultiple={false}
                                        maxFiles={1}
                                        acceptedFileTypes={ALLOWED_MIME_TYPES}
                                        maxFileSize={MAX_FILE_SIZE_MB}
                                        labelIdle='<span class="filepond--label-action">Browse</span> or drag & drop your photo'
                                        labelFileTypeNotAllowed="Invalid file type"
                                        fileValidateTypeLabelExpectedTypes={`Allowed: ${ALLOWED_EXTENSIONS}`}
                                        labelMaxFileSizeExceeded="File is too large"
                                        labelMaxFileSize={`Maximum size is ${MAX_FILE_SIZE_MB}`}
                                        labelFileProcessing="Uploading..."
                                        labelFileProcessingComplete="Upload complete"
                                        labelTapToCancel="Tap to cancel"
                                        labelTapToRetry="Tap to retry"
                                        stylePanelLayout="circle"
                                        styleLoadIndicatorPosition="center bottom"
                                        styleProgressIndicatorPosition="right bottom"
                                        styleButtonRemoveItemPosition="left bottom"
                                        styleButtonProcessItemPosition="right bottom"
                                        credits={false}
                                    />
                                </div>

                                {files.length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={handleUpload}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
                                    >
                                        <Upload className="w-5 h-5" />
                                        Upload Photo
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {uploadState === 'uploading' && (
                            <motion.div
                                key="progress"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-8"
                            >
                                <AnimatedCircularProgressBar
                                    value={progress}
                                    gaugePrimaryColor="#3b82f6"
                                    gaugeSecondaryColor="#e5e7eb"
                                    className="size-32"
                                />
                                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 animate-pulse">
                                    Uploading your photo...
                                </p>
                            </motion.div>
                        )}

                        {uploadState === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                                >
                                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                                </motion.div>
                                <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                                    Photo Updated!
                                </p>
                            </motion.div>
                        )}

                        {uploadState === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center justify-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                                >
                                    <X className="w-16 h-16 text-red-500" />
                                </motion.div>
                                <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                                    Upload Failed
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Please try again
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
