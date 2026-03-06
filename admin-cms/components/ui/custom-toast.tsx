'use client';

import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X, Bell, Loader2, Loader, Info } from 'lucide-react';

type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

interface CustomToastProps {
  message: string;
  type: 'success' | 'error';
  duration?: number;
  onClose: () => void;
  position?: ToastPosition;
}

const CustomToast = ({ message, type, duration = 3000, onClose }: CustomToastProps) => {
  const isSuccess = type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`relative overflow-hidden rounded-lg shadow-2xl ${isSuccess
        ? 'bg-linear-to-r from-emerald-600 to-green-600'
        : 'bg-linear-to-r from-red-600 to-rose-600'
        } min-w-[320px] max-w-105`}
    >
      <div className="flex items-center gap-3 p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : (
            <XCircle className="h-6 w-6 text-white" />
          )}
        </motion.div>

        <div className="flex-1">
          <p className="text-white font-medium text-sm">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Animated progress bar */}
      <div className="h-1 bg-white/20 w-full">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`h-full ${isSuccess ? 'bg-white' : 'bg-white/80'}`}
        />
      </div>
    </motion.div>
  );
};

/* ── Loading toast (shown while the promise is pending) ────────────── */
const LoadingToast = ({ message }: { message: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    className="relative overflow-hidden rounded-lg shadow-2xl bg-gradient-to-r from-amber-500 to-orange-500 min-w-[320px] max-w-[420px]"
  >
    {/* Shimmer overlay */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
      animate={{ x: ['-100%', '100%'] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
    />

    <div className="relative flex items-center gap-3 p-4">
      {/* Pulsing bell icon */}
      <motion.div
        animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        className="flex-shrink-0"
      >
        <Bell className="h-5 w-5 text-white" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{message}</p>
        <p className="text-white/70 text-xs mt-0.5">Please wait...</p>
      </div>

      <Loader className="h-7 w-7 text-white/90 animate-spin flex-shrink-0" />
    </div>

    {/* Indeterminate progress */}
    <div className="h-1 bg-white/20 w-full overflow-hidden">
      <motion.div
        className="h-full w-1/3 bg-white/80 rounded-full"
        animate={{ x: ['-100%', '300%'] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
      />
    </div>
  </motion.div>
);

/* ── Result toast (success / error after promise resolves) ─────────── */
const ResultToast = ({
  message,
  type,
  duration,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  duration: number;
  onClose: () => void;
}) => {
  const isSuccess = type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden rounded-lg shadow-2xl min-w-[320px] max-w-[420px] ${isSuccess
        ? 'bg-gradient-to-r from-emerald-600 to-green-600'
        : 'bg-gradient-to-r from-red-600 to-rose-600'
        }`}
    >
      <div className="flex items-center gap-3 p-4">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 15 }}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : (
            <XCircle className="h-6 w-6 text-white" />
          )}
        </motion.div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Countdown progress bar */}
      <div className="h-1 bg-white/20 w-full">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className="h-full bg-white"
        />
      </div>
    </motion.div>
  );
};

/* ── Promise toast – replaces toast.promise with custom visuals ──── */
export interface PromiseToastOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: any) => string);
  successDuration?: number;
  errorDuration?: number;
  position?: ToastPosition;
}

export function showPromiseToast<T>(
  promise: Promise<T>,
  opts: PromiseToastOptions<T>,
) {
  const {
    loading,
    success,
    error,
    successDuration = 5000,
    errorDuration = 7000,
    position = 'top-center',
  } = opts;

  // Show loading toast
  const toastId = toast.custom(
    () => <LoadingToast message={loading} />,
    { duration: Infinity, position },
  );

  promise
    .then((data) => {
      const msg = typeof success === 'function' ? success(data) : success;
      toast.custom(
        (t) => (
          <ResultToast
            message={msg}
            type="success"
            duration={successDuration}
            onClose={() => toast.dismiss(t)}
          />
        ),
        { id: toastId, duration: successDuration, position },
      );
    })
    .catch((err) => {
      const msg = typeof error === 'function' ? error(err) : error;
      toast.custom(
        (t) => (
          <ResultToast
            message={msg}
            type="error"
            duration={errorDuration}
            onClose={() => toast.dismiss(t)}
          />
        ),
        { id: toastId, duration: errorDuration, position },
      );
    });

  return toastId;
}

// Custom toast functions
export const showSuccessToast = (message: string, duration: number = 7000, position: ToastPosition = 'bottom-right') => {
  toast.custom(
    (t) => (
      <CustomToast
        message={message}
        type="success"
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration, position }
  );
};

export const showErrorToast = (message: string, duration: number = 10000, position: ToastPosition = 'bottom-right') => {
  toast.custom(
    (t) => (
      <CustomToast
        message={message}
        type="error"
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration, position }
  );
};

/* ── Info Toast ─────────────────────────────────────────────────────── */
const InfoToast = ({
  message,
  duration = 5000,
  onClose,
}: {
  message: string;
  duration?: number;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    className="relative overflow-hidden rounded-lg shadow-2xl bg-blue-500 min-w-[320px] max-w-[420px]"
  >
    <div className="flex items-center gap-3 p-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
      >
        <Info className="h-6 w-6 text-white" />
      </motion.div>

      <div className="flex-1">
        <p className="text-white font-medium text-sm">{message}</p>
      </div>

      <button
        onClick={onClose}
        className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>

    {/* Animated progress bar */}
    <div className="h-1 bg-white/20 w-full">
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className="h-full bg-white"
      />
    </div>
  </motion.div>
);

export const showInfoToast = (message: string, duration: number = 5000, position: ToastPosition = 'bottom-right') => {
  toast.custom(
    (t) => (
      <InfoToast
        message={message}
        duration={duration}
        onClose={() => toast.dismiss(t)}
      />
    ),
    { duration, position }
  );
};

export default CustomToast;
