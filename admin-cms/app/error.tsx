'use client';
import React from 'react';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

const Error: React.FC<ErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
          Oops! Something went wrong
        </h1>
        <p className="mb-6 text-center text-lg text-slate-600 dark:text-white/80">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
};

export default Error;