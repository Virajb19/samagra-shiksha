'use client';

import { Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userStarsFireStore } from '@/services/firebase/user-star.firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccessToast, showErrorToast } from '@/components/ui/custom-toast';
import { useState } from 'react';

interface StarButtonProps {
  userId: string;
  isStarred: boolean;
}

// Generate particle positions evenly around a circle
const PARTICLES = Array.from({ length: 6 }, (_, i) => {
  const angle = (i * 360) / 6;
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * 18,
    y: Math.sin(rad) * 18,
  };
});

export function StarButton({ userId, isStarred }: StarButtonProps) {
  const queryClient = useQueryClient();
  const [showBurst, setShowBurst] = useState(false);

  // Optimistic update mutation
  const toggleStarMutation = useMutation({
    mutationKey: ['toggle-star'],
    mutationFn: async () => {
      const response = await userStarsFireStore.toggleStar(userId);
      return response;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['starred-users'] });

      const previousStarredIds = queryClient.getQueryData<string[]>(['starred-users']) || [];

      const newIsStarred = !isStarred;

      // Trigger burst only when starring
      if (newIsStarred) {
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 600);
      }

      queryClient.setQueryData<string[]>(['starred-users'], (old = []) => {
        if (!Array.isArray(old)) return old;

        return isStarred ? old.filter(id => id !== userId) : [...old, userId]
      });

      return { previousStarredIds, newIsStarred };
    },
    onError: (error, _, context) => {
      if (context?.previousStarredIds) {
        queryClient.setQueryData(['starred-users'], context.previousStarredIds);
      }
      showErrorToast('Failed to update favorite status. Please try again.');
      console.error('Failed to toggle star:', error);
    },
    onSuccess: (_, __, context) => {
      if (context?.newIsStarred) {
        showSuccessToast('User added to favorites!', 3000);
      } else {
        showSuccessToast('User removed from favorites.', 3000);
      }
    },
    onSettled: () => {
      // Only refetch when no other star mutations are still in flight.
      // This prevents a race condition where starring two users simultaneously
      // causes the first refetch to return stale data and overwrite the
      // second mutation's optimistic update (making the star flicker).
      if (queryClient.isMutating({ mutationKey: ['toggle-star'] }) === 0) {
        queryClient.invalidateQueries({ queryKey: ['starred-users'] });
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStarMutation.mutate();
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={toggleStarMutation.isPending}
      className={`relative p-2 rounded-lg cursor-pointer transition-colors duration-200 ${isStarred
        ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
        : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
        }`}
      title={isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
      whileHover={{ scale: 1.1, rotate: 15 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      {/* Particle burst */}
      <AnimatePresence>
        {showBurst && PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-yellow-400"
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              delay: i * 0.03,
              ease: 'easeOut',
            }}
            style={{ marginLeft: -3, marginTop: -3 }}
          />
        ))}
      </AnimatePresence>

      {/* Glow ring on star */}
      <AnimatePresence>
        {isStarred && (
          <motion.span
            className="absolute inset-0 rounded-lg border-2 border-yellow-400/40"
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Star icon with animated fill */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isStarred ? 'starred' : 'unstarred'}
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
        >
          <Star
            className={`h-5 w-5 transition-none ${isStarred ? 'fill-current' : ''
              }`}
          />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
