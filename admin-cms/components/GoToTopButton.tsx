'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState, useCallback, type RefObject } from 'react';

interface GoToTopButtonProps {
  /** If provided, scroll this container instead of window */
  containerRef?: RefObject<HTMLElement | null>;
  /** Scroll threshold (px) before the button appears. Default 400 */
  threshold?: number;
}

export function GoToTopButton({ containerRef, threshold = 400 }: GoToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    if (containerRef?.current) {
      setVisible(containerRef.current.scrollTop > threshold);
    } else {
      setVisible(window.scrollY > threshold);
    }
  }, [containerRef, threshold]);

  useEffect(() => {
    const target = containerRef?.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [containerRef, handleScroll]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="mx-auto mt-4 mb-2 flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer
            bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium
            shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
            dark:from-blue-500 dark:to-blue-500 dark:shadow-blue-500/20
            transition-shadow duration-300"
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowUp className="h-4 w-4" />
          </motion.div>
          Go to Top
        </motion.button>
      )}
    </AnimatePresence>
  );
}
