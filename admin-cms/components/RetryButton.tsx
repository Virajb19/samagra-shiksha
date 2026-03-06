'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { QueryKey } from '@tanstack/react-query';

interface RetryButtonProps {
  queryKey: QueryKey;
  message?: string;
  subMessage?: string;
}

export function RetryButton({ 
  queryKey, 
  message = 'Failed to load data', 
  subMessage = 'Please check your connection and try again' 
}: RetryButtonProps) {
  const queryClient = useQueryClient();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-red-400">
      <AlertTriangle className="h-12 w-12 mb-4" />
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm text-slate-500 mt-1">{subMessage}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 text-blue-400 border-blue-400 hover:bg-blue-400/10"
        onClick={() => queryClient.invalidateQueries({ queryKey })}
      >
        <RefreshCw className="h-4 w-4 mr-2" /> Retry
      </Button>
    </div>
  );
}
