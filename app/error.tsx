'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { logServerError } from '@/lib/errorUtils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log complete error details server/console side only
    logServerError('NextRootErrorBoundary', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAF8] dark:bg-[#111110] text-[#111111] dark:text-[#FFFFFF] p-6">
      <div className="max-w-md w-full p-8 bg-white dark:bg-[#181817] border border-[#E5E5E3] dark:border-[#2C2C2C] shadow-sm text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-5 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold tracking-tight mb-2">
          Something went wrong
        </h1>

        <p className="text-sm text-[#666666] dark:text-[#999999] mb-6 leading-relaxed">
          An unexpected error occurred while loading this page. Our team has been notified.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 h-11 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="flex-1 h-11 border border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
