import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts'
import { toast } from 'sonner';

export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const [copiedText, copyToClipboard] = useCopyToClipboard();

  const handleCopy = async () => {
    // await navigator.clipboard.writeText(email);

    const isCopied = await copyToClipboard(email);
    
    if (!isCopied) {
      toast.error('Failed to copy email');
      return;
    }

    toast.success('Email copied to clipboard', {
      closeButton: false,
      duration: 1200,
    });

    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      disabled={copied}
      className="
        p-1.5 rounded-md
        bg-slate-100 dark:bg-slate-800
        hover:bg-slate-200 dark:hover:bg-slate-700
        text-slate-600 dark:text-slate-300
      "
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1 , rotate: 0}}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Check className="h-4 w-4 text-green-500" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <Copy className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}